import asyncio
import json
import shutil
import httpx
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.config import NVD_API_KEY, NVD_BASE_URL
from backend.database import SessionLocal, Host, Port, Finding


async def run(session_id: str, target: str, dry_run: bool):
    await ws.emit("info", "vulns", f"Starting vulnerability scan on {target}")
    audit_log("PHASE_VULNS_START", target=target, dry_run=dry_run)

    if dry_run:
        await ws.emit("warn", "vulns", f"[DRY RUN] Would run: nuclei -target {target}")
        return []

    findings = await _run_nuclei(session_id, target)
    await ws.emit("ok", "vulns", f"Nuclei complete. {len(findings)} findings. Enriching with NVD...")

    for finding in findings:
        if finding.get("cve_id"):
            nvd_data = await _lookup_nvd(finding["cve_id"])
            finding.update(nvd_data)
        await _save_finding(session_id, target, finding)
        await ws.emit_finding(finding)

    audit_log("PHASE_VULNS_COMPLETE", target=target, detail=f"findings={len(findings)}")
    await ws.emit("ok", "vulns", f"Vulnerability scan complete. {len(findings)} findings saved.")
    return findings


async def _run_nuclei(session_id: str, target: str) -> list:
    findings = []

    # Find nuclei binary — check common locations
    nuclei_bin = shutil.which("nuclei") or \
                 shutil.which("nuclei", path="/root/go/bin:/home/finn/go/bin:/usr/local/bin:/usr/bin") or \
                 "/root/go/bin/nuclei"

    import os
    # Also check home directory go/bin
    home = os.path.expanduser("~")
    for candidate in [f"{home}/go/bin/nuclei", "/usr/local/bin/nuclei", "/usr/bin/nuclei"]:
        if os.path.isfile(candidate):
            nuclei_bin = candidate
            break

    if not nuclei_bin or not os.path.isfile(nuclei_bin):
        await ws.emit("error", "vulns", f"nuclei not found — install: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest")
        return []

    await ws.emit("info", "vulns", f"nuclei binary: {nuclei_bin}")

    targets = await _build_nuclei_targets(target)
    if not targets:
        await ws.emit("warn", "vulns", f"No HTTP services found for {target} — skipping")
        return []

    await ws.emit("info", "vulns", f"Scanning {len(targets)} target(s): {', '.join(targets[:3])}{'...' if len(targets) > 3 else ''}")

    cmd = [
        nuclei_bin,
        "-target", ",".join(targets),
        "-severity", "critical,high,medium,low,info",
        "-json-export", "/tmp/fenrir_nuclei_out.json",
        "-silent",
        "-retries", "1",
        "-timeout", "30",
        "-no-interactsh",  # disable interactsh to speed up
    ]

    await ws.emit("info", "vulns", f"Running: nuclei {' '.join(cmd[1:4])} ...")

    try:
        # Clean up any previous output
        import os
        if os.path.exists("/tmp/fenrir_nuclei_out.json"):
            os.remove("/tmp/fenrir_nuclei_out.json")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, "HOME": os.path.expanduser("~")},
        )

        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=1200)

        stderr_text = stderr.decode(errors="ignore")
        stdout_text = stdout.decode(errors="ignore")

        # Log any errors from stderr
        if stderr_text:
            for line in stderr_text.splitlines()[:5]:
                if line.strip():
                    await ws.emit("info", "vulns", f"nuclei: {line.strip()[:120]}")

        # Parse from JSON export file first (more reliable)
        seen = set()
        if os.path.exists("/tmp/fenrir_nuclei_out.json"):
            with open("/tmp/fenrir_nuclei_out.json") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        result = json.loads(line)
                        finding = _parse_nuclei_result(result, target)
                        key = f"{finding['title']}|{finding['host']}"
                        if key not in seen:
                            seen.add(key)
                            findings.append(finding)
                            await ws.emit("warn", "vulns", f"[{finding['severity'].upper()}] {finding['title']}")
                    except json.JSONDecodeError:
                        continue

        # Also parse stdout as fallback
        if not findings and stdout_text:
            for line in stdout_text.splitlines():
                if not line.strip():
                    continue
                try:
                    result = json.loads(line)
                    finding = _parse_nuclei_result(result, target)
                    key = f"{finding['title']}|{finding['host']}"
                    if key not in seen:
                        seen.add(key)
                        findings.append(finding)
                        await ws.emit("warn", "vulns", f"[{finding['severity'].upper()}] {finding['title']}")
                except json.JSONDecodeError:
                    continue

        await ws.emit("ok", "vulns", f"nuclei done — {len(findings)} findings (exit code {proc.returncode})")

    except asyncio.TimeoutError:
        await ws.emit("warn", "vulns", "nuclei timed out after 20 minutes")
    except FileNotFoundError as e:
        await ws.emit("error", "vulns", f"nuclei not found: {e}")
    except Exception as e:
        await ws.emit("error", "vulns", f"nuclei error: {type(e).__name__}: {e}")
        print(f"NUCLEI ERROR: {type(e).__name__}: {e}", flush=True)

    return findings


def _parse_nuclei_result(result: dict, target: str) -> dict:
    return {
        "title": result.get("info", {}).get("name", result.get("template-id", "Unknown")),
        "severity": result.get("info", {}).get("severity", "info"),
        "cve_id": _extract_cve(result),
        "description": result.get("info", {}).get("description", ""),
        "detected_by": "nuclei",
        "host": result.get("host", result.get("matched-at", target)),
        "template_id": result.get("template-id", ""),
        "matched_at": result.get("matched-at", ""),
    }


async def _build_nuclei_targets(target: str) -> list:
    """Build HTTP/HTTPS targets from ports — search by IP across all sessions."""
    ip = target.split("/")[0]
    targets = []

    db = SessionLocal()
    try:
        host = db.query(Host).filter(Host.ip == ip).order_by(Host.id.desc()).first()

        if host and host.ports:
            for port in host.ports:
                if port.state != "open":
                    continue
                service = (port.service or "").lower()
                p = port.port

                is_http = (
                    "http" in service or
                    p in (80, 443, 8008, 8009, 8080, 8081, 8088, 8443, 8444,
                          8800, 8888, 9000, 9090, 9443, 10001, 3000, 3001,
                          4000, 4443, 5000, 5001, 7080, 7443)
                )

                if is_http:
                    is_https = ("ssl" in service or "https" in service or
                                "tls" in service or p in (443, 8443, 4443, 8800, 9443))
                    scheme = "https" if is_https else "http"
                    targets.append(f"{scheme}://{ip}:{p}")

    finally:
        db.close()

    if not targets:
        # Fallback to common ports
        for p, scheme in [(80,'http'),(443,'https'),(8080,'http'),(8443,'https'),
                          (8008,'http'),(3000,'http'),(3001,'http'),(8888,'http')]:
            targets.append(f"{scheme}://{ip}:{p}")

    return targets


def _extract_cve(result: dict) -> str | None:
    for ref in result.get("info", {}).get("reference", []):
        if "CVE-" in str(ref).upper():
            parts = str(ref).upper().split("CVE-")
            if len(parts) > 1:
                return "CVE-" + parts[1].split()[0].strip("/#")
    for tag in result.get("info", {}).get("tags", []):
        if str(tag).upper().startswith("CVE-"):
            return str(tag).upper()
    return None


async def _lookup_nvd(cve_id: str) -> dict:
    headers = {"apiKey": NVD_API_KEY} if NVD_API_KEY else {}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(NVD_BASE_URL, params={"cveId": cve_id}, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                vulns = data.get("vulnerabilities", [])
                if vulns:
                    cve = vulns[0].get("cve", {})
                    metrics = cve.get("metrics", {})
                    cvss_score = None
                    if "cvssMetricV31" in metrics:
                        cvss_score = metrics["cvssMetricV31"][0]["cvssData"]["baseScore"]
                    elif "cvssMetricV2" in metrics:
                        cvss_score = metrics["cvssMetricV2"][0]["cvssData"]["baseScore"]
                    desc = next((d["value"] for d in cve.get("descriptions", []) if d["lang"] == "en"), "")
                    return {"cvss_score": cvss_score, "nvd_description": desc}
    except Exception:
        pass
    return {}


async def _save_finding(session_id: str, target: str, finding: dict) -> int | None:
    db = SessionLocal()
    try:
        raw_host = finding.get("host", target)
        ip = raw_host.replace("http://","").replace("https://","").split(":")[0].split("/")[0]
        host = db.query(Host).filter(Host.ip == ip).order_by(Host.id.desc()).first()

        existing = db.query(Finding).filter(
            Finding.session_id == session_id,
            Finding.title == finding.get("title"),
            Finding.host_id == (host.id if host else None),
        ).first()
        if existing:
            return existing.id

        f = Finding(
            session_id=session_id,
            host_id=host.id if host else None,
            cve_id=finding.get("cve_id"),
            title=finding.get("title", "Unknown"),
            severity=finding.get("severity", "info"),
            cvss_score=finding.get("cvss_score"),
            description=finding.get("nvd_description") or finding.get("description"),
            detected_by="nuclei",
        )
        db.add(f)
        db.commit()
        return f.id
    finally:
        db.close()

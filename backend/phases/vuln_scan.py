import asyncio
import json
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
    targets = await _build_nuclei_targets(target)

    if not targets:
        await ws.emit("warn", "vulns", f"No HTTP services found for {target} — skipping nuclei")
        return []

    await ws.emit("info", "vulns", f"Scanning {len(targets)} target(s): {', '.join(targets[:4])}{'...' if len(targets) > 4 else ''}")

    try:
        proc = await asyncio.create_subprocess_exec(
            "nuclei",
            "-target", ",".join(targets),
            "-severity", "critical,high,medium,low,info",
            "-json", "-silent",
            "-timeout", "15",
            "-retries", "1",
            "-rate-limit", "50",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=600)

        seen = set()
        for line in stdout.decode(errors="ignore").splitlines():
            if not line.strip():
                continue
            try:
                result = json.loads(line)
                title = result.get("info", {}).get("name", "Unknown")
                severity = result.get("info", {}).get("severity", "info")
                host = result.get("host", target)
                key = f"{title}|{host}"
                if key in seen:
                    continue
                seen.add(key)
                finding = {
                    "title": title,
                    "severity": severity,
                    "cve_id": _extract_cve(result),
                    "description": result.get("info", {}).get("description", ""),
                    "detected_by": "nuclei",
                    "host": host,
                    "template_id": result.get("template-id", ""),
                }
                findings.append(finding)
                await ws.emit("warn", "vulns", f"[{severity.upper()}] {title}")
            except json.JSONDecodeError:
                continue

    except FileNotFoundError:
        await ws.emit("warn", "vulns", "nuclei not found — install: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest")
    except asyncio.TimeoutError:
        await ws.emit("warn", "vulns", "nuclei timed out after 10 minutes")
    except Exception as e:
        await ws.emit("error", "vulns", f"nuclei error: {e}")

    return findings


async def _build_nuclei_targets(target: str) -> list:
    """Build HTTP/HTTPS targets from ports discovered for this IP — searches across all sessions."""
    ip = target.split("/")[0]
    targets = []

    db = SessionLocal()
    try:
        # Find the most recent host entry for this IP (any session)
        host = db.query(Host).filter(Host.ip == ip).order_by(Host.id.desc()).first()

        if host and host.ports:
            for port in host.ports:
                if port.state != "open":
                    continue
                service = (port.service or "").lower()
                version = (port.version or "").lower()
                p = port.port

                is_http = (
                    "http" in service or
                    "http" in version or
                    p in (80, 443, 8080, 8443, 8888, 3000, 3001, 4000, 5000,
                          8008, 8009, 8800, 9000, 9090, 10001, 4443, 7080, 7443)
                )

                if is_http:
                    is_https = (
                        "ssl" in service or "https" in service or
                        "tls" in service or "ssl" in version or
                        p in (443, 8443, 4443, 8800)
                    )
                    scheme = "https" if is_https else "http"
                    targets.append(f"{scheme}://{ip}:{p}")

        # If no ports found in DB, fall back to common ports
        if not targets:
            await ws.emit("info", "vulns", f"No port scan data for {ip} — trying common HTTP ports")
            for p, scheme in [(80,'http'),(443,'https'),(8080,'http'),(8443,'https'),(8008,'http'),(3000,'http'),(8888,'http')]:
                targets.append(f"{scheme}://{ip}:{p}")

    finally:
        db.close()

    return targets


def _extract_cve(result: dict) -> str | None:
    for ref in result.get("info", {}).get("reference", []):
        if "CVE-" in ref.upper():
            parts = ref.upper().split("CVE-")
            if len(parts) > 1:
                return "CVE-" + parts[1].split()[0].strip("/#")
    for tag in result.get("info", {}).get("tags", []):
        if tag.upper().startswith("CVE-"):
            return tag.upper()
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
        ip = finding.get("host", target).replace("http://", "").replace("https://", "").split(":")[0].split("/")[0]
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
            detected_by=finding.get("detected_by", "nuclei"),
        )
        db.add(f)
        db.commit()
        return f.id
    finally:
        db.close()

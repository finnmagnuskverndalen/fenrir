import asyncio
import json
import os
import httpx
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.config import NVD_API_KEY, NVD_BASE_URL
from backend.database import SessionLocal, Host, Port, Finding


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 3 — vulnerability scanning via nuclei + CVE enrichment via NVD."""
    await ws.emit("info", "vulns", f"Starting vulnerability scan on {target}")
    audit_log("PHASE_VULNS_START", target=target, dry_run=dry_run)

    if dry_run:
        await ws.emit("warn", "vulns", f"[DRY RUN] Would run: nuclei -target {target} -severity critical,high,medium,low")
        audit_log("PHASE_VULNS_DRY_RUN", target=target, dry_run=True)
        return []

    findings = await _run_nuclei(session_id, target)
    await ws.emit("ok", "vulns", f"Nuclei complete. {len(findings)} findings. Enriching with NVD...")

    enriched = []
    for finding in findings:
        if finding.get("cve_id"):
            nvd_data = await _lookup_nvd(finding["cve_id"])
            finding.update(nvd_data)
        enriched.append(finding)
        await _save_finding(session_id, target, finding)
        await ws.emit_finding(finding)

    audit_log("PHASE_VULNS_COMPLETE", target=target, detail=f"findings={len(enriched)}")
    await ws.emit("ok", "vulns", f"Vulnerability scan complete. {len(enriched)} findings saved.")
    return enriched


async def _run_nuclei(session_id: str, target: str) -> list:
    findings = []
    home = os.path.expanduser("~")
    templates_dir = f"{home}/nuclei-templates"

    targets = await _build_nuclei_targets(session_id, target)
    await ws.emit("info", "vulns", f"Nuclei scanning {len(targets)} target(s): {', '.join(targets)}")

    try:
        proc = await asyncio.create_subprocess_exec(
            "nuclei",
            "-target", ",".join(targets),
            "-severity", "critical,high,medium,low,info",
            "-t", templates_dir,
            "-jsonl",
            "-no-interactsh",
            "-timeout", "10",
            "-retries", "1",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)

        err_output = stderr.decode(errors="ignore")
        if err_output:
            for line in err_output.splitlines()[:5]:
                if line.strip():
                    await ws.emit("info", "vulns", f"nuclei: {line.strip()}")

        for line in stdout.decode(errors="ignore").splitlines():
            if not line.strip():
                continue
            try:
                result = json.loads(line)
                finding = {
                    "title": result.get("info", {}).get("name", "Unknown"),
                    "severity": result.get("info", {}).get("severity", "info"),
                    "cve_id": _extract_cve(result),
                    "description": result.get("info", {}).get("description", ""),
                    "detected_by": "nuclei",
                    "host": result.get("host", target),
                }
                findings.append(finding)
                await ws.emit("warn", "vulns", f"[{finding['severity'].upper()}] {finding['title']}")
            except json.JSONDecodeError:
                continue
    except FileNotFoundError:
        await ws.emit("warn", "vulns", "nuclei not found — skipping template scan")
    except asyncio.TimeoutError:
        await ws.emit("warn", "vulns", "nuclei timed out after 10 minutes")
    except Exception as e:
        await ws.emit("error", "vulns", f"nuclei error: {e}")
    return findings


async def _build_nuclei_targets(session_id: str, target: str) -> list:
    """Build proper URL targets from ports discovered in the port scan phase."""
    targets = []
    db = SessionLocal()
    try:
        ip = target.split("/")[0]
        host = db.query(Host).filter(
            Host.session_id == session_id,
            Host.ip == ip,
        ).first()
        if host:
            for port in host.ports:
                if port.state == "open":
                    service = (port.service or "").lower()
                    if "http" in service or port.port in (80, 443, 8080, 8443, 8888, 3000, 3001, 4000, 5000, 9090, 9000):
                        scheme = "https" if ("ssl" in service or "https" in service or port.port in (443, 8443)) else "http"
                        targets.append(f"{scheme}://{ip}:{port.port}")
                    elif port.port not in (22, 21, 23, 25, 53):
                        targets.append(f"{ip}:{port.port}")
    finally:
        db.close()
    if not targets:
        targets = [target]
    return targets


def _extract_cve(result: dict) -> str | None:
    refs = result.get("info", {}).get("reference", [])
    for ref in refs:
        if "CVE-" in ref.upper():
            parts = ref.upper().split("CVE-")
            if len(parts) > 1:
                return "CVE-" + parts[1].split()[0].strip("/#")
    tags = result.get("info", {}).get("tags", [])
    for tag in tags:
        if tag.upper().startswith("CVE-"):
            return tag.upper()
    return None


async def _lookup_nvd(cve_id: str) -> dict:
    headers = {}
    if NVD_API_KEY:
        headers["apiKey"] = NVD_API_KEY
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                NVD_BASE_URL,
                params={"cveId": cve_id},
                headers=headers,
            )
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
                    descriptions = cve.get("descriptions", [])
                    desc = next((d["value"] for d in descriptions if d["lang"] == "en"), "")
                    return {"cvss_score": cvss_score, "nvd_description": desc}
    except Exception:
        pass
    return {}


async def _save_finding(session_id: str, target: str, finding: dict):
    db = SessionLocal()
    try:
        ip = finding.get("host", target).replace("http://", "").replace("https://", "").split(":")[0]
        host = db.query(Host).filter(
            Host.session_id == session_id,
            Host.ip == ip,
        ).first()
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
    finally:
        db.close()

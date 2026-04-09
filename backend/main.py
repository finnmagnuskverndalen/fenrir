import json
import uuid
import asyncio
import os
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.config import HOST, PORT, DEBUG, DRY_RUN, is_in_scope, validate_config
from backend.database import init_db, get_db, ScanSession, Host, Finding
from backend.audit import log as audit_log, read_log
from backend import websocket as ws

app = FastAPI(title="Fenrir - Network Security Scanner", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_active_scans: set = set()


@app.on_event("startup")
async def startup():
    init_db()
    try:
        validate_config()
        print("Fenrir is ready.")
    except (ValueError, FileNotFoundError) as e:
        print(f"[WARNING] Config issue: {e}")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws.disconnect(websocket)


class ScanRequest(BaseModel):
    target: str
    phases: list[str] = ["discovery"]
    dry_run: bool = True
    scan_mode: str = "fast"  # "fast" or "extensive"


@app.post("/api/scan/start")
async def start_scan(req: ScanRequest, db: Session = Depends(get_db)):
    target = req.target.strip()

    if target in _active_scans:
        raise HTTPException(status_code=429, detail=f"Scan already running for {target}")

    if not is_in_scope(target):
        audit_log("SCAN_BLOCKED", target=target, detail="Target not in scope")
        raise HTTPException(status_code=403, detail=f"Target {target} is not in scope.")

    session_id = str(uuid.uuid4())
    session = ScanSession(id=session_id, target=target, dry_run=req.dry_run)
    db.add(session)
    db.commit()

    audit_log("SCAN_STARTED", target=target, detail=f"phases={req.phases}", dry_run=req.dry_run)
    await ws.emit("ok", "init", f"Scan started against {target}", {"session_id": session_id})
    asyncio.create_task(run_scan(session_id, target, req.phases, req.dry_run, req.scan_mode))
    return {"session_id": session_id, "status": "started"}


async def run_scan(session_id: str, target: str, phases: list[str], dry_run: bool, scan_mode: str = "fast"):
    _active_scans.add(target)
    try:
        from backend.phases.dns_whois import run as run_dns
        from backend.phases.host_discovery import run as run_discovery
        from backend.phases.port_scan import run as run_ports
        from backend.phases.vuln_scan import run as run_vulns
        from backend.phases.exploit import run as run_exploit
        from ai.analyst import run as run_ai

        phase_map = {
            "discovery": run_discovery,
            "dns":       run_dns,
            "ports":     run_ports,
            "vulns":     run_vulns,
            "ai":        run_ai,
            "exploit":   run_exploit,
        }

        for phase in phases:
            if phase in phase_map:
                await ws.emit_phase_update(phase, "running")
                try:
                    kwargs = {"scan_mode": scan_mode} if phase == "vulns" else {}
                    await phase_map[phase](session_id, target, dry_run, **kwargs)
                    await ws.emit_phase_update(phase, "complete")
                except Exception as e:
                    await ws.emit("error", phase, f"Phase {phase} failed: {e}")
                    await ws.emit_phase_update(phase, "failed")

        audit_log("SCAN_COMPLETE", target=target, detail=f"session={session_id}")
        await ws.emit("ok", "done", "Scan complete.")
    finally:
        _active_scans.discard(target)


@app.post("/api/ai/summarize")
async def ai_summarize(body: dict):
    from ai.analyst import _call_openrouter
    phase = body.get("phase", "")
    data = body.get("data", {})
    finding = data.get("finding", {}) if isinstance(data, dict) else {}
    host_info = data.get("host", {}) if isinstance(data, dict) else {}
    prompts = {
        "detection": f"You are a pentester. Summarize in 3 sentences what was found during network detection: {str(data)[:1000]}. Focus on interesting hosts and OS types.",
        "vulnscan": f"You are a pentester. Summarize in 4 sentences the vulnerability scan findings: {str(data)[:2000]}. Highlight critical risks and immediate actions.",
        "exploit_recon": f"You are a pentester. For this finding: {str(data)[:500]}, explain in 3 sentences: what the vulnerability is, how it can be exploited, and what access an attacker gains.",
        "attack_playbook": f"""You are a senior penetration tester on an authorized engagement. Generate a concise attack playbook for the following finding.

Finding: {finding.get('title', 'N/A')}
CVE: {finding.get('cve_id', 'N/A')} | CVSS: {finding.get('cvss_score', 'N/A')}
Description: {(finding.get('description') or '')[:500]}
Target OS: {host_info.get('os_guess', 'unknown')}
Open ports: {host_info.get('ports', [])}

Respond with exactly these sections, keep each section brief and technical:
## Prerequisites
## Exploitation Steps
## Post-Exploitation
## Detection Evasion
## Verification Command""",
        "chain_analysis": f"""You are a senior penetration tester. Analyze these vulnerabilities found on the same host and identify multi-step attack chains.

Host: {host_info.get('ip', 'N/A')} | OS: {host_info.get('os_guess', 'unknown')}
Open ports: {host_info.get('ports', [])}

Findings:
{str(data.get('findings', []) if isinstance(data, dict) else data)[:2000]}

Identify 2-3 realistic attack chains that combine multiple findings. For each chain:
- Name the chain
- List the steps in order (what finding enables what)
- State the combined severity
- Describe what the attacker achieves at the end""",
    }
    prompt = prompts.get(phase, f"Summarize this security data in 3 sentences: {str(data)[:500]}")
    try:
        summary = await _call_openrouter(
            system="You are a concise, technical penetration testing assistant. Keep responses brief and actionable.",
            user=prompt,
        )
        return {"summary": summary}
    except Exception as e:
        return {"summary": f"AI summary unavailable: {e}"}


@app.post("/api/reports/generate/{session_id}")
async def generate_report(session_id: str):
    from ai.reporter import generate_report
    report = await generate_report(session_id)
    return {"report": report, "session_id": session_id}


@app.get("/api/reports/list")
def list_reports():
    import glob
    files = sorted(glob.glob("reports/*.md"), reverse=True)
    result = []
    for f in files[:20]:
        stat = os.stat(f)
        result.append({
            "filename": os.path.basename(f),
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        })
    return result


@app.get("/api/reports/download/{filename}")
async def download_report(filename: str):
    from fastapi.responses import FileResponse
    path = f"reports/{filename}"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(path, media_type="text/markdown", filename=filename)


@app.post("/api/exploits/lookup")
async def lookup_exploits(body: dict):
    from backend.phases.exploit import searchsploit_lookup
    results = await searchsploit_lookup(body.get("cve_id"), body.get("title", ""))
    return {"results": results}


@app.get("/api/exploits/finding/{finding_id}")
async def get_exploits_for_finding(finding_id: int):
    from backend.phases.exploit import get_exploits_for_finding
    return await get_exploits_for_finding(finding_id)


@app.get("/api/exploits/metasploit/{cve_id}")
async def get_msf_modules(cve_id: str):
    from backend.phases.exploit import get_metasploit_modules
    modules = await get_metasploit_modules(cve_id)
    return {"modules": modules, "cve_id": cve_id}


@app.get("/api/exploits/poc/{cve_id}")
async def get_poc_links(cve_id: str):
    from backend.phases.exploit import get_poc_links
    pocs = await get_poc_links(cve_id)
    return {"pocs": pocs, "cve_id": cve_id}


@app.post("/api/exploits/tls_probe")
async def probe_tls(body: dict):
    from backend.phases.exploit import tls_probe
    host = body.get("host", "")
    port = int(body.get("port", 443))
    if not is_in_scope(host):
        raise HTTPException(status_code=403, detail=f"Target {host} is not in scope.")
    result = await tls_probe(host, port)
    return result


@app.post("/api/exploits/http_fingerprint")
async def fingerprint_http(body: dict):
    from backend.phases.exploit import http_fingerprint
    url = body.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="url is required")
    result = await http_fingerprint(url)
    return result


@app.post("/api/exploits/cred_check")
async def check_creds(body: dict):
    from backend.phases.exploit import default_cred_check
    host    = body.get("host", "")
    port    = int(body.get("port", 80))
    service = body.get("service", "http")
    url     = body.get("url", None)
    if host and not is_in_scope(host):
        raise HTTPException(status_code=403, detail=f"Target {host} is not in scope.")
    audit_log("CRED_CHECK_REQUEST", target=host, detail=f"service={service} port={port}")
    result = await default_cred_check(host, port, service, url)
    return result


@app.post("/api/exploits/chain_analysis")
async def chain_analysis(body: dict):
    from ai.analyst import _call_openrouter
    from backend.database import get_db as _get_db, Finding as _Finding, Host as _Host
    host_ip    = body.get("host_ip", "")
    session_id = body.get("session_id", "")
    db = next(_get_db())
    try:
        host = db.query(_Host).filter(_Host.ip == host_ip).first()
        findings = db.query(_Finding).filter(_Finding.session_id == session_id).all()
        host_findings = [f for f in findings if f.host_id == (host.id if host else -1)]
        findings_data = [
            {"title": f.title, "severity": f.severity, "cve_id": f.cve_id, "cvss": f.cvss_score}
            for f in host_findings
        ]
        host_data = {
            "ip": host_ip,
            "os_guess": host.os_guess if host else "unknown",
            "ports": [{"port": p.port, "service": p.service} for p in (host.ports if host else [])],
        }
        summary = await _call_openrouter(
            system="You are a senior penetration tester on an authorized engagement. Be concise and technical.",
            user=prompts_chain(host_data, findings_data),
            max_tokens=800,
        )
        return {"analysis": summary, "host": host_ip, "findings_count": len(host_findings)}
    except Exception as e:
        return {"analysis": f"Chain analysis failed: {e}", "host": host_ip, "findings_count": 0}
    finally:
        db.close()


def prompts_chain(host: dict, findings: list) -> str:
    return f"""You are a senior penetration tester. Analyze these vulnerabilities on the same host and identify multi-step attack chains.

Host: {host.get('ip')} | OS: {host.get('os_guess', 'unknown')}
Open ports: {host.get('ports', [])}

Findings ({len(findings)} total):
{json.dumps(findings, indent=2)[:2000]}

Identify 2-3 realistic attack chains that combine multiple findings. For each chain:
- Chain name
- Steps in order (which finding enables which)
- Combined severity rating
- What the attacker achieves"""


@app.post("/api/exploits/run")
async def run_exploit_endpoint(body: dict):
    target = body.get("target", "")
    module = body.get("module", "")
    options = body.get("options", {})
    if not is_in_scope(target):
        raise HTTPException(status_code=403, detail=f"Target {target} is not in scope.")
    if DRY_RUN:
        cmd = f"msfconsole -q -x 'use {module}; set RHOSTS {target};"
        for k, v in options.items():
            cmd += f" set {k} {v};"
        cmd += " run; exit'"
        audit_log("EXPLOIT_DRY_RUN", target=target, detail=f"module={module}")
        return {"dry_run": True, "command": cmd, "message": "Set DRY_RUN=false in .env to execute"}
    return {"dry_run": False, "message": "Exploit execution — enable in .env"}


@app.get("/api/sessions")
def get_sessions(db: Session = Depends(get_db)):
    return db.query(ScanSession).order_by(ScanSession.started_at.desc()).limit(20).all()


@app.get("/api/sessions/{session_id}/hosts")
def get_session_hosts(session_id: str, db: Session = Depends(get_db)):
    return db.query(Host).filter(Host.session_id == session_id).all()


@app.get("/api/sessions/{session_id}/findings")
def get_session_findings(session_id: str, db: Session = Depends(get_db)):
    return db.query(Finding).filter(Finding.session_id == session_id).all()


@app.get("/api/findings")
def get_all_findings(severity: str = None, db: Session = Depends(get_db)):
    q = db.query(Finding)
    if severity:
        q = q.filter(Finding.severity == severity)
    return q.order_by(Finding.discovered_at.desc()).limit(200).all()


@app.get("/api/hosts")
def get_all_hosts(db: Session = Depends(get_db)):
    return db.query(Host).order_by(Host.discovered_at.desc()).limit(100).all()


@app.get("/api/audit")
def get_audit():
    return read_log(limit=200)


@app.get("/api/scope")
def get_scope():
    from backend.config import load_scope, SCOPE_FILE
    return {"scope": [str(n) for n in load_scope()], "file": str(SCOPE_FILE)}


@app.get("/api/health")
def health():
    return {"status": "ok", "dry_run": DRY_RUN, "active_scans": list(_active_scans)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=DEBUG)


@app.post("/api/ai/test")
async def ai_test():
    from ai.analyst import _call_openrouter
    try:
        result = await _call_openrouter(
            system="You are a helpful assistant.",
            user="Reply with just the word: WORKING"
        )
        return {"result": result, "status": "ok"}
    except Exception as e:
        return {"result": None, "status": "error", "error": f"{type(e).__name__}: {e}"}

import uuid
import os
from datetime import datetime
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.config import HOST, PORT, DEBUG, DRY_RUN, is_in_scope, validate_config
from backend.database import init_db, get_db, ScanSession, Host, Finding
from backend.audit import log as audit_log, read_log
from backend import websocket as ws

app = FastAPI(title="Fenrir - Network Security Scanner", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track active scan sessions to prevent duplicates
_active_scans: set = set()


@app.on_event("startup")
async def startup():
    init_db()
    try:
        validate_config()
        print("Fenrir is ready.")
    except (ValueError, FileNotFoundError) as e:
        print(f"[WARNING] Config issue: {e}")


# ── WebSocket ───────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws.disconnect(websocket)


# ── Scan ────────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    target: str
    phases: list[str] = ["dns", "ports", "vulns", "ai"]
    dry_run: bool = True


@app.post("/api/scan/start")
async def start_scan(req: ScanRequest, db: Session = Depends(get_db)):
    target = req.target.strip()

    # Prevent duplicate scans on the same target
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

    asyncio.create_task(run_scan(session_id, target, req.phases, req.dry_run))

    return {"session_id": session_id, "status": "started"}


async def run_scan(session_id: str, target: str, phases: list[str], dry_run: bool):
    _active_scans.add(target)
    try:
        from backend.phases.dns_whois import run as run_dns
        from backend.phases.port_scan import run as run_ports
        from backend.phases.vuln_scan import run as run_vulns
        from ai.analyst import run as run_ai

        phase_map = {
            "dns":   run_dns,
            "ports": run_ports,
            "vulns": run_vulns,
            "ai":    run_ai,
        }

        for phase in phases:
            if phase in phase_map:
                await ws.emit_phase_update(phase, "running")
                try:
                    await phase_map[phase](session_id, target, dry_run)
                    await ws.emit_phase_update(phase, "complete")
                except Exception as e:
                    await ws.emit("error", phase, f"Phase {phase} failed: {e}")
                    await ws.emit_phase_update(phase, "failed")

        audit_log("SCAN_COMPLETE", target=target, detail=f"session={session_id}")
        await ws.emit("ok", "done", "Scan complete.")
    finally:
        _active_scans.discard(target)


# ── Reports ─────────────────────────────────────────────────────────────────

@app.post("/api/reports/generate/{session_id}")
async def generate_report(session_id: str):
    from ai.reporter import generate_report
    report = await generate_report(session_id)
    return {"report": report, "session_id": session_id}


# ── Data endpoints ──────────────────────────────────────────────────────────

@app.get("/api/sessions")
def get_sessions(db: Session = Depends(get_db)):
    return db.query(ScanSession).order_by(ScanSession.started_at.desc()).limit(20).all()


@app.get("/api/sessions/{session_id}/hosts")
def get_hosts(session_id: str, db: Session = Depends(get_db)):
    return db.query(Host).filter(Host.session_id == session_id).all()


@app.get("/api/sessions/{session_id}/findings")
def get_findings(session_id: str, db: Session = Depends(get_db)):
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
    return {
        "scope": [str(n) for n in load_scope()],
        "file": str(SCOPE_FILE),
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "dry_run": DRY_RUN, "active_scans": list(_active_scans)}


# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=DEBUG)


@app.get("/api/reports/list")
def list_reports():
    """List all saved report files."""
    import glob
    files = sorted(glob.glob("reports/*.md"), reverse=True)
    result = []
    for f in files[:20]:
        stat = os.stat(f)
        result.append({
            "filename": os.path.basename(f),
            "path": f,
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        })
    return result


@app.get("/api/reports/download/{filename}")
async def download_report(filename: str):
    """Download a saved report file."""
    from fastapi.responses import FileResponse
    path = f"reports/{filename}"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(path, media_type="text/markdown", filename=filename)

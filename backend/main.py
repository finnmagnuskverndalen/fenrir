import uuid
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
    if not is_in_scope(req.target):
        audit_log("SCAN_BLOCKED", target=req.target, detail="Target not in scope")
        raise HTTPException(status_code=403, detail=f"Target {req.target} is not in scope.")

    session_id = str(uuid.uuid4())
    session = ScanSession(id=session_id, target=req.target, dry_run=req.dry_run)
    db.add(session)
    db.commit()

    audit_log("SCAN_STARTED", target=req.target, detail=f"phases={req.phases}", dry_run=req.dry_run)
    await ws.emit("ok", "init", f"Scan started against {req.target}", {"session_id": session_id})

    # Phases run in background
    asyncio.create_task(run_scan(session_id, req.target, req.phases, req.dry_run))

    return {"session_id": session_id, "status": "started"}


async def run_scan(session_id: str, target: str, phases: list[str], dry_run: bool):
    """Orchestrate scan phases sequentially."""
    from backend.phases.dns_whois import run as run_dns
    from backend.phases.port_scan import run as run_ports
    from backend.phases.vuln_scan import run as run_vulns
    from ai.analyst import run as run_ai

    phase_map = {
        "dns": run_dns,
        "ports": run_ports,
        "vulns": run_vulns,
        "ai": run_ai,
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
    return q.order_by(Finding.discovered_at.desc()).limit(100).all()


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
    return {"status": "ok", "dry_run": DRY_RUN}


# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=DEBUG)

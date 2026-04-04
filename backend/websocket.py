import json
import asyncio
from datetime import datetime, timezone
from fastapi import WebSocket
from typing import Optional

# All connected WebSocket clients
connected_clients: list[WebSocket] = []


async def connect(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)


def disconnect(websocket: WebSocket):
    if websocket in connected_clients:
        connected_clients.remove(websocket)


async def broadcast(message: dict):
    """Send a message to all connected clients."""
    if not connected_clients:
        return
    payload = json.dumps({**message, "timestamp": datetime.now(timezone.utc).isoformat()})
    dead = []
    for client in connected_clients:
        try:
            await client.send_text(payload)
        except Exception:
            dead.append(client)
    for client in dead:
        disconnect(client)


async def emit(level: str, phase: str, message: str, data: Optional[dict] = None):
    """Helper to broadcast a structured log line to the UI."""
    await broadcast({
        "type": "log",
        "level": level,        # info, warn, error, ok
        "phase": phase,
        "message": message,
        "data": data or {},
    })


async def emit_host(host: dict):
    await broadcast({"type": "host", "data": host})


async def emit_finding(finding: dict):
    await broadcast({"type": "finding", "data": finding})


async def emit_phase_update(phase: str, status: str):
    await broadcast({"type": "phase", "phase": phase, "status": status})

import asyncio
import nmap
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.database import SessionLocal, Host, Port


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 2 — deep port scan. Skips ping sweep since Phase 1 already confirmed host is alive."""
    await ws.emit("info", "ports", f"Starting port scan on {target}")
    audit_log("PHASE_PORTS_START", target=target, dry_run=dry_run)

    if dry_run:
        await ws.emit("warn", "ports", f"[DRY RUN] Would run: nmap -sV -sC -T4 -Pn {target}")
        audit_log("PHASE_PORTS_DRY_RUN", target=target, dry_run=True)
        return []

    # Skip ping sweep — host already confirmed alive in Phase 1
    # Go straight to deep scan with -Pn
    ip = target.split("/")[0]
    await ws.emit("info", "ports", f"Deep scanning {ip}...")

    host_data = await _deep_scan(ip)
    if not host_data:
        await ws.emit("info", "ports", f"{ip} — no open ports found")
        audit_log("PHASE_PORTS_COMPLETE", target=target, detail="hosts=0")
        await ws.emit("ok", "ports", f"Port scan complete. 0 hosts with open ports.")
        return []

    saved = await _save_host(session_id, ip, host_data)
    port_summary = ", ".join(
        f"{p['port']}/{p['protocol']}({p['service'] or '?'})"
        for p in saved["ports"][:6]
    )
    await ws.emit_host(saved)
    await ws.emit("ok", "ports", f"{ip} — {len(saved['ports'])} ports open: {port_summary}")

    audit_log("PHASE_PORTS_COMPLETE", target=target, detail=f"hosts=1,ports={len(saved['ports'])}")
    await ws.emit("ok", "ports", f"Port scan complete. 1 host with {len(saved['ports'])} open ports.")
    return [saved]


async def _deep_scan(ip: str) -> dict | None:
    """Deep service + version scan. -Pn skips ping since we know the host is up."""
    nm = nmap.PortScanner()
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: nm.scan(
                hosts=ip,
                arguments="-sV -sC -T4 -Pn --open --min-rate 500 --max-retries 2"
            )
        )
        if ip in nm.all_hosts():
            return nm[ip]
        return None
    except Exception as e:
        await ws.emit("error", "ports", f"Scan failed for {ip}: {e}")
        return None


async def _save_host(session_id: str, ip: str, host_data) -> dict:
    db = SessionLocal()
    try:
        hostname = host_data.hostname() or None
        os_guess = None
        if "osmatch" in host_data and host_data["osmatch"]:
            os_guess = host_data["osmatch"][0].get("name")

        # Check if host already exists (from Phase 1 discovery)
        existing = db.query(Host).filter(
            Host.session_id == session_id,
            Host.ip == ip,
        ).first()

        if existing:
            # Update existing host with port scan data
            if os_guess: existing.os_guess = os_guess
            if hostname: existing.hostname = hostname
            host = existing
        else:
            host = Host(session_id=session_id, ip=ip, hostname=hostname, os_guess=os_guess, status="up")
            db.add(host)
        db.flush()

        # Remove old ports if re-scanning
        for old_port in db.query(Port).filter(Port.host_id == host.id).all():
            db.delete(old_port)

        ports_found = []
        for proto in host_data.all_protocols():
            for port_num in sorted(host_data[proto].keys()):
                port_info = host_data[proto][port_num]
                if port_info.get("state") != "open":
                    continue
                p = Port(
                    host_id=host.id,
                    port=port_num,
                    protocol=proto,
                    state="open",
                    service=port_info.get("name"),
                    version=port_info.get("version"),
                )
                db.add(p)
                ports_found.append({
                    "port": port_num,
                    "protocol": proto,
                    "service": p.service,
                    "version": p.version,
                    "state": "open",
                })

        db.commit()
        return {
            "ip": ip,
            "hostname": hostname,
            "os_guess": os_guess,
            "ports": ports_found,
            "id": host.id,
        }
    finally:
        db.close()

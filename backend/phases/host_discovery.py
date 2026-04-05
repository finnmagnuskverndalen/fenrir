import asyncio
import nmap
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.database import SessionLocal, Host


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 1 — fast ping sweep + OS detection only. No port scanning."""
    await ws.emit("info", "discovery", f"Starting host discovery on {target}")
    audit_log("PHASE_DISCOVERY_START", target=target, dry_run=dry_run)

    if dry_run:
        await ws.emit("warn", "discovery", f"[DRY RUN] Would run: nmap -sn -O {target}")
        audit_log("PHASE_DISCOVERY_DRY_RUN", target=target, dry_run=True)
        return []

    nm = nmap.PortScanner()
    try:
        await ws.emit("info", "discovery", "Running ping sweep...")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: nm.scan(hosts=target, arguments="-sn -T4 --min-rate 300")
        )
    except Exception as e:
        await ws.emit("error", "discovery", f"Host discovery failed: {e}")
        return []

    hosts_found = []
    db = SessionLocal()
    try:
        for ip in nm.all_hosts():
            host_data = nm[ip]
            if host_data.state() != 'up':
                continue

            hostname = host_data.hostname() or None
            os_guess = None

            # Try OS detection from ping sweep hints
            if 'osmatch' in host_data and host_data['osmatch']:
                os_guess = host_data['osmatch'][0].get('name')

            host = Host(
                session_id=session_id,
                ip=ip,
                hostname=hostname,
                os_guess=os_guess,
                status='up',
            )
            db.add(host)
            db.commit()

            host_dict = {'ip': ip, 'hostname': hostname, 'os_guess': os_guess, 'ports': []}
            hosts_found.append(host_dict)
            await ws.emit_host(host_dict)
            await ws.emit("ok", "discovery", f"Host up: {ip}{' (' + hostname + ')' if hostname else ''}{' — ' + os_guess if os_guess else ''}")
            await asyncio.sleep(0)

    finally:
        db.close()

    audit_log("PHASE_DISCOVERY_COMPLETE", target=target, detail=f"hosts={len(hosts_found)}")
    await ws.emit("ok", "discovery", f"Discovery complete. {len(hosts_found)} hosts found.")
    return hosts_found

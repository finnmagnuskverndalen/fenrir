import nmap
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.database import SessionLocal, Host, Port, ScanSession


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 2 — port and service scanning via nmap."""
    await ws.emit("info", "ports", f"Starting port scan on {target}")
    audit_log("PHASE_PORTS_START", target=target, dry_run=dry_run)

    if dry_run:
        await ws.emit("warn", "ports", f"[DRY RUN] Would run: nmap -sV -sC -T4 {target}")
        audit_log("PHASE_PORTS_DRY_RUN", target=target, dry_run=True)
        return []

    nm = nmap.PortScanner()
    try:
        await ws.emit("info", "ports", "Running nmap -sV -sC -T4 (this may take a few minutes)...")
        nm.scan(hosts=target, arguments="-sV -sC -T4 --open")
    except Exception as e:
        await ws.emit("error", "ports", f"nmap failed: {e}")
        audit_log("PHASE_PORTS_ERROR", target=target, detail=str(e))
        return []

    hosts_found = []
    db = SessionLocal()
    try:
        for ip in nm.all_hosts():
            host_data = nm[ip]
            hostname = host_data.hostname() or None
            os_guess = None
            if "osmatch" in host_data and host_data["osmatch"]:
                os_guess = host_data["osmatch"][0].get("name")

            host = Host(
                session_id=session_id,
                ip=ip,
                hostname=hostname,
                os_guess=os_guess,
                status=host_data.state(),
            )
            db.add(host)
            db.flush()

            ports_found = []
            for proto in host_data.all_protocols():
                for port_num in host_data[proto].keys():
                    port_info = host_data[proto][port_num]
                    p = Port(
                        host_id=host.id,
                        port=port_num,
                        protocol=proto,
                        state=port_info.get("state", "open"),
                        service=port_info.get("name"),
                        version=port_info.get("version"),
                    )
                    db.add(p)
                    ports_found.append({"port": port_num, "service": p.service, "version": p.version})

            db.commit()
            hosts_found.append({"ip": ip, "hostname": hostname, "os": os_guess, "ports": ports_found})
            await ws.emit_host({"ip": ip, "hostname": hostname, "ports": ports_found})
            await ws.emit("ok", "ports", f"Host {ip} — {len(ports_found)} open ports found")

    finally:
        db.close()

    audit_log("PHASE_PORTS_COMPLETE", target=target, detail=f"hosts={len(hosts_found)}")
    await ws.emit("ok", "ports", f"Port scan complete. {len(hosts_found)} hosts found.")
    return hosts_found

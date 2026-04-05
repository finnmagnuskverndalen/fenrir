import asyncio
import nmap
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.database import SessionLocal, Host, Port


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 2 — two-phase port scanning: fast ping sweep then deep scan per host."""
    await ws.emit("info", "ports", f"Starting port scan on {target}")
    audit_log("PHASE_PORTS_START", target=target, dry_run=dry_run)

    if dry_run:
        await ws.emit("warn", "ports", f"[DRY RUN] Would run: nmap -sn {target} then nmap -sV -sC -Pn per live host")
        audit_log("PHASE_PORTS_DRY_RUN", target=target, dry_run=True)
        return []

    # ── Phase 2a: fast ping sweep to find live hosts ───────────────────────
    await ws.emit("info", "ports", f"Step 1/2 — ping sweep to find live hosts...")
    live_hosts = await _ping_sweep(target)

    if not live_hosts:
        await ws.emit("warn", "ports", "No live hosts found. Try a single IP or check your scope.")
        return []

    await ws.emit("ok", "ports", f"Found {len(live_hosts)} live hosts. Starting deep scan...")

    # ── Phase 2b: deep scan each live host individually ────────────────────
    hosts_found = []
    for i, ip in enumerate(live_hosts):
        await ws.emit("info", "ports", f"Step 2/2 — scanning {ip} ({i+1}/{len(live_hosts)})...")
        host_data = await _deep_scan(ip)
        if host_data:
            saved = await _save_host(session_id, ip, host_data)
            hosts_found.append(saved)
            port_summary = ", ".join(
                f"{p['port']}/{p['protocol']}({p['service'] or '?'})"
                for p in saved["ports"][:5]
            )
            await ws.emit_host(saved)
            await ws.emit("ok", "ports", f"{ip} — {len(saved['ports'])} ports open: {port_summary}")
        else:
            await ws.emit("info", "ports", f"{ip} — no open ports found")

        # yield control so WebSocket messages flush between hosts
        await asyncio.sleep(0)

    audit_log("PHASE_PORTS_COMPLETE", target=target, detail=f"hosts={len(hosts_found)}")
    await ws.emit("ok", "ports", f"Port scan complete. {len(hosts_found)} hosts with open ports.")
    return hosts_found


async def _ping_sweep(target: str) -> list[str]:
    """Fast ping sweep — returns list of live IP addresses."""
    nm = nmap.PortScanner()
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: nm.scan(hosts=target, arguments="-sn -T4 --min-rate 300")
        )
        return [ip for ip in nm.all_hosts() if nm[ip].state() == "up"]
    except Exception as e:
        await ws.emit("error", "ports", f"Ping sweep failed: {e}")
        return []


async def _deep_scan(ip: str) -> dict | None:
    """Deep service scan on a single host."""
    nm = nmap.PortScanner()
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: nm.scan(hosts=ip, arguments="-sV -sC -T4 -Pn --open --min-rate 300 --max-retries 2")
        )
        if ip in nm.all_hosts():
            return nm[ip]
        return None
    except Exception as e:
        await ws.emit("error", "ports", f"Deep scan failed for {ip}: {e}")
        return None


async def _save_host(session_id: str, ip: str, host_data) -> dict:
    """Save host and ports to database, return dict."""
    db = SessionLocal()
    try:
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
            for port_num in sorted(host_data[proto].keys()):
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
                ports_found.append({
                    "port": port_num,
                    "protocol": proto,
                    "service": p.service,
                    "version": p.version,
                    "state": p.state,
                })

        db.commit()
        return {"ip": ip, "hostname": hostname, "os": os_guess, "ports": ports_found}
    finally:
        db.close()

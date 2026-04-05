import asyncio
import nmap
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.database import SessionLocal, Host


def _guess_os_from_hints(hostname: str, vendor: str) -> str:
    """Guess OS/device type from hostname and MAC vendor."""
    hints = f"{hostname or ''} {vendor or ''}".lower()
    if any(x in hints for x in ['android', 'pixel', 'samsung', 'oneplus']): return 'Android Device'
    if any(x in hints for x in ['iphone', 'ipad', 'apple']): return 'Apple iOS/macOS'
    if any(x in hints for x in ['esp', 'arduino', 'lwip', 'tasmota']): return 'IoT / Embedded'
    if any(x in hints for x in ['raspberry', 'lepotato', 'armbian']): return 'Linux SBC'
    if any(x in hints for x in ['home-assistant', 'homeassistant']): return 'Home Assistant'
    if any(x in hints for x in ['windows', 'msft', 'microsoft']): return 'Windows'
    if any(x in hints for x in ['linux', 'ubuntu', 'debian', 'fedora']): return 'Linux'
    if any(x in hints for x in ['router', 'zyxel', 'netgear', 'asus', 'tp-link', 'cisco']): return 'Network Device'
    if any(x in hints for x in ['printer', 'canon', 'epson', 'hp', 'brother']): return 'Printer'
    if any(x in hints for x in ['camera', 'c200', 'c100', 'hikvision', 'dahua']): return 'IP Camera'
    if any(x in hints for x in ['tv', 'samsung', 'lg', 'sony', 'roku']): return 'Smart TV'
    if vendor: return f'Unknown ({vendor})'
    return None


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 1 — ping sweep + hostname resolution + device type detection."""
    await ws.emit("info", "discovery", f"Starting host discovery on {target}")
    audit_log("PHASE_DISCOVERY_START", target=target, dry_run=dry_run)

    if dry_run:
        await ws.emit("warn", "discovery", f"[DRY RUN] Would run: nmap -sn --script nbstat,mdns-service-info {target}")
        audit_log("PHASE_DISCOVERY_DRY_RUN", target=target, dry_run=True)
        return []

    nm = nmap.PortScanner()
    try:
        await ws.emit("info", "discovery", "Running ping sweep with device detection...")
        loop = asyncio.get_event_loop()
        # -sn = no port scan, --script gets extra info, -O requires root so skip it
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

            # Get MAC vendor if available
            vendor = None
            addresses = host_data.get('addresses', {})
            if 'mac' in addresses:
                vendor = host_data.get('vendor', {}).get(addresses['mac'], None)

            # Try nmap osmatch first, fall back to heuristic
            os_guess = None
            if 'osmatch' in host_data and host_data['osmatch']:
                os_guess = host_data['osmatch'][0].get('name')
            if not os_guess:
                os_guess = _guess_os_from_hints(hostname, vendor)

            host = Host(
                session_id=session_id,
                ip=ip,
                hostname=hostname,
                os_guess=os_guess,
                status='up',
            )
            db.add(host)
            db.commit()

            host_dict = {
                'ip': ip,
                'hostname': hostname,
                'os_guess': os_guess,
                'vendor': vendor,
                'ports': [],
            }
            hosts_found.append(host_dict)
            await ws.emit_host(host_dict)

            label = ip
            if hostname: label += f' ({hostname})'
            if os_guess: label += f' — {os_guess}'
            elif vendor: label += f' — {vendor}'
            await ws.emit("ok", "discovery", f"Host up: {label}")
            await asyncio.sleep(0)

    finally:
        db.close()

    audit_log("PHASE_DISCOVERY_COMPLETE", target=target, detail=f"hosts={len(hosts_found)}")
    await ws.emit("ok", "discovery", f"Discovery complete. {len(hosts_found)} hosts found.")
    return hosts_found

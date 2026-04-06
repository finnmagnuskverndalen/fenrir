import asyncio
import nmap
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.database import SessionLocal, Host


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 1 — ARP sweep (instant on LAN) + OS detection per host."""
    await ws.emit("info", "discovery", f"Starting host discovery on {target}")
    audit_log("PHASE_DISCOVERY_START", target=target, dry_run=dry_run)

    if dry_run:
        await ws.emit("warn", "discovery", f"[DRY RUN] Would run: nmap -sn -PR -T4 {target}")
        audit_log("PHASE_DISCOVERY_DRY_RUN", target=target, dry_run=True)
        return []

    # Step 1 — ARP sweep (fast, works on local LAN, can't be blocked)
    await ws.emit("info", "discovery", "Step 1/2 — ARP sweep (fast local discovery)...")
    live_hosts = await _arp_sweep(target)

    if not live_hosts:
        # Fallback to ICMP ping sweep if ARP finds nothing
        await ws.emit("warn", "discovery", "ARP found nothing — trying ICMP ping sweep...")
        live_hosts = await _ping_sweep(target)

    if not live_hosts:
        await ws.emit("warn", "discovery", "No live hosts found. Check scope.txt and network range.")
        return []

    await ws.emit("ok", "discovery", f"Found {len(live_hosts)} live hosts — running OS detection...")

    # Step 2 — OS detection per host (parallel, up to 5 at once)
    hosts_found = []
    db = SessionLocal()
    try:
        # Process in batches of 5 for speed
        batch_size = 5
        for i in range(0, len(live_hosts), batch_size):
            batch = live_hosts[i:i+batch_size]
            await ws.emit("info", "discovery", f"OS detection on hosts {i+1}-{min(i+batch_size, len(live_hosts))}/{len(live_hosts)}...")

            tasks = [_os_detect(ip) for ip in batch]
            results = await asyncio.gather(*tasks)

            for ip, host_info in zip(batch, results):
                hostname = host_info.get('hostname')
                os_guess = host_info.get('os_guess')
                vendor = host_info.get('vendor')

                host = Host(
                    session_id=session_id,
                    ip=ip,
                    hostname=hostname,
                    os_guess=os_guess,
                    status='up',
                )
                db.add(host)
                db.commit()

                host_dict = {'ip': ip, 'hostname': hostname, 'os_guess': os_guess, 'vendor': vendor, 'ports': []}
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


async def _arp_sweep(target: str) -> list:
    """ARP sweep — instant on local LAN, cannot be blocked by firewall."""
    nm = nmap.PortScanner()
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: nm.scan(hosts=target, arguments="-sn -PR -T5 --min-rate 1000")
        )
        hosts = [ip for ip in nm.all_hosts() if nm[ip].state() == 'up']
        if hosts:
            await ws.emit("ok", "discovery", f"ARP sweep found {len(hosts)} hosts in seconds")
        return hosts
    except Exception as e:
        await ws.emit("warn", "discovery", f"ARP sweep failed: {e}")
        return []


async def _ping_sweep(target: str) -> list:
    """ICMP ping sweep fallback."""
    nm = nmap.PortScanner()
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: nm.scan(hosts=target, arguments="-sn -PE -T4 --min-rate 500 --max-retries 1")
        )
        return [ip for ip in nm.all_hosts() if nm[ip].state() == 'up']
    except Exception as e:
        await ws.emit("error", "discovery", f"Ping sweep failed: {e}")
        return []


async def _os_detect(ip: str) -> dict:
    """OS detection on a single host."""
    nm = nmap.PortScanner()
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: nm.scan(
                hosts=ip,
                arguments="-O --osscan-guess --max-os-tries 1 -T4 -Pn --max-retries 1"
            )
        )

        if ip not in nm.all_hosts():
            return {'hostname': None, 'os_guess': None, 'vendor': None}

        host_data = nm[ip]
        hostname = host_data.hostname() or None

        # MAC vendor (gives device type hints)
        vendor = None
        addresses = host_data.get('addresses', {})
        if 'mac' in addresses:
            vendor = host_data.get('vendor', {}).get(addresses['mac'])

        # OS match
        os_guess = None
        if 'osmatch' in host_data and host_data['osmatch']:
            best = host_data['osmatch'][0]
            name = best.get('name', '')
            accuracy = best.get('accuracy', '')
            os_guess = f"{name} ({accuracy}% match)" if accuracy else name

        # Fallback to vendor hint if no OS match
        if not os_guess and vendor:
            os_guess = _vendor_to_os(vendor)

        return {'hostname': hostname, 'os_guess': os_guess, 'vendor': vendor}

    except Exception:
        return {'hostname': None, 'os_guess': None, 'vendor': None}


def _vendor_to_os(vendor: str) -> str:
    """Map MAC vendor to likely OS/device type."""
    v = vendor.lower()
    if any(x in v for x in ['apple']): return 'Apple Device'
    if any(x in v for x in ['samsung', 'google', 'oneplus', 'xiaomi', 'huawei']): return 'Android / Mobile'
    if any(x in v for x in ['microsoft']): return 'Windows'
    if any(x in v for x in ['raspberry', 'raspberr']): return 'Raspberry Pi (Linux)'
    if any(x in v for x in ['espressif']): return 'IoT (ESP32/ESP8266)'
    if any(x in v for x in ['zyxel', 'netgear', 'asus', 'tp-link', 'cisco', 'ubiquiti']): return 'Network Device'
    if any(x in v for x in ['canon', 'epson', 'hp inc', 'brother', 'xerox']): return 'Printer'
    if any(x in v for x in ['hikvision', 'dahua', 'axis']): return 'IP Camera'
    return f'Unknown ({vendor})'

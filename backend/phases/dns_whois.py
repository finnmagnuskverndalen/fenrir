import asyncio
import subprocess
from backend import websocket as ws
from backend.audit import log as audit_log


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 1 — DNS and WHOIS enumeration."""
    await ws.emit("info", "dns", f"Starting DNS/WHOIS on {target}")
    audit_log("PHASE_DNS_START", target=target, dry_run=dry_run)

    results = {
        "session_id": session_id,
        "target": target,
        "whois": {},
        "dns_records": [],
        "subdomains": [],
    }

    if dry_run:
        await ws.emit("warn", "dns", f"[DRY RUN] Would run: whois {target}, dig {target}, subfinder -d {target}")
        audit_log("PHASE_DNS_DRY_RUN", target=target, dry_run=True)
        return results

    # whois
    results["whois"] = await _run_whois(target)

    # dig
    results["dns_records"] = await _run_dig(target)

    # subfinder (if installed)
    results["subdomains"] = await _run_subfinder(target)

    await ws.emit("ok", "dns", f"DNS/WHOIS complete. Found {len(results['subdomains'])} subdomains.")
    audit_log("PHASE_DNS_COMPLETE", target=target, detail=f"subdomains={len(results['subdomains'])}")
    return results


async def _run_whois(target: str) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(
            "whois", target,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
        return {"raw": stdout.decode(errors="ignore")}
    except Exception as e:
        await ws.emit("warn", "dns", f"whois failed: {e}")
        return {}


async def _run_dig(target: str) -> list:
    records = []
    for record_type in ["A", "MX", "NS", "TXT"]:
        try:
            proc = await asyncio.create_subprocess_exec(
                "dig", "+short", record_type, target,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=15)
            lines = [l.strip() for l in stdout.decode(errors="ignore").splitlines() if l.strip()]
            for line in lines:
                records.append({"type": record_type, "value": line})
        except Exception:
            continue
    return records


async def _run_subfinder(target: str) -> list:
    try:
        proc = await asyncio.create_subprocess_exec(
            "subfinder", "-d", target, "-silent",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        return [l.strip() for l in stdout.decode(errors="ignore").splitlines() if l.strip()]
    except FileNotFoundError:
        await ws.emit("warn", "dns", "subfinder not found — skipping subdomain enumeration")
        return []
    except Exception as e:
        await ws.emit("warn", "dns", f"subfinder error: {e}")
        return []

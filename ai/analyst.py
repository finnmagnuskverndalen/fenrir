import httpx
import asyncio
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_BASE_URL, AI_MAX_TOKENS
from backend.database import SessionLocal, Finding


SYSTEM_PROMPT = """You are Fenrir, an expert penetration tester. Be concise and technical. Authorized testing only."""


async def run(session_id: str, target: str, dry_run: bool):
    """AI analysis — per-finding for critical/high, bulk summary for rest."""
    await ws.emit("info", "ai", "Starting AI analysis of findings...")
    audit_log("PHASE_AI_START", target=target, dry_run=dry_run)

    if not OPENROUTER_API_KEY:
        await ws.emit("warn", "ai", "OPENROUTER_API_KEY not set — skipping AI analysis")
        return

    db = SessionLocal()
    try:
        findings = db.query(Finding).filter(Finding.session_id == session_id).all()
        if not findings:
            await ws.emit("warn", "ai", "No findings to analyze.")
            return

        if dry_run:
            await ws.emit("warn", "ai", f"[DRY RUN] Would analyze {len(findings)} findings")
            return

        analyzed = 0
        crit_high = [f for f in findings if f.severity in ("critical", "high") and not f.ai_analysis]

        for finding in crit_high:
            await ws.emit("info", "ai", f"Analyzing: {finding.title[:60]}...")
            try:
                analysis = await _analyze_finding(finding, target)
                if analysis:
                    finding.ai_analysis = analysis
                    db.commit()
                    analyzed += 1
            except Exception as e:
                print(f"AI finding error [{finding.title}]: {type(e).__name__}: {e}", flush=True)
            await asyncio.sleep(0.3)

        await ws.emit("ok", "ai", f"AI analysis complete. {analyzed} findings analyzed.")
        audit_log("PHASE_AI_COMPLETE", target=target, detail=f"findings_analyzed={analyzed}")

    except Exception as e:
        print(f"AI PHASE ERROR: {type(e).__name__}: {e}", flush=True)
        await ws.emit("warn", "ai", f"AI error: {type(e).__name__}: {e}")
    finally:
        db.close()


async def _analyze_finding(finding, target: str) -> str:
    prompt = f"""Finding: {finding.title}
CVE: {finding.cve_id or 'N/A'} | CVSS: {finding.cvss_score or 'N/A'} | Target: {target}
Description: {(finding.description or '')[:300]}

In 3 sentences: (1) what this vulnerability is, (2) how an attacker exploits it, (3) exact remediation."""
    return await _call_openrouter(system=SYSTEM_PROMPT, user=prompt, max_tokens=300)


async def _call_openrouter(system: str, user: str, max_tokens: int = 1000) -> str:
    if not OPENROUTER_API_KEY:
        return "OpenRouter API key not configured."

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/finnmagnuskverndalen/fenrir",
        "X-Title": "Fenrir",
    }
    payload = {
        "model": OPENROUTER_MODEL,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                await asyncio.sleep(5 * (attempt + 1))
                continue
            print(f"OpenRouter HTTP {e.response.status_code}: {e.response.text[:200]}", flush=True)
            raise
        except httpx.TimeoutException:
            if attempt < 2:
                await asyncio.sleep(3)
                continue
            raise
    raise Exception("Max retries exceeded")

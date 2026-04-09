import asyncio
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.database import SessionLocal, Finding
from ai.provider import call_ai, load_settings


SYSTEM_PROMPT = """You are Fenrir, an expert penetration tester. Be concise and technical. Authorized testing only."""


async def run(session_id: str, target: str, dry_run: bool):
    """AI analysis — per-finding for critical/high, bulk summary for rest."""
    await ws.emit("info", "ai", "Starting AI analysis of findings...")
    audit_log("PHASE_AI_START", target=target, dry_run=dry_run)

    settings = load_settings()
    if settings["provider"] == "openrouter" and not settings["openrouter_api_key"]:
        await ws.emit("warn", "ai", "No AI provider configured — skipping AI analysis")
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
    return await call_ai(system=SYSTEM_PROMPT, user=prompt, max_tokens=300)

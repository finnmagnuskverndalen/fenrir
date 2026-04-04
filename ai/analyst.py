import httpx
from backend import websocket as ws
from backend.audit import log as audit_log
from backend.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_BASE_URL, AI_MAX_TOKENS
from backend.database import SessionLocal, Finding


SYSTEM_PROMPT = """You are Fenrir, an expert penetration tester and offensive security analyst.
You are given structured scan results from a network security assessment.
Your job is to:
1. Prioritize findings by real-world exploitability — not just CVSS score
2. Identify attack chains where multiple findings combine into a more serious risk
3. Suggest specific, actionable next steps for each critical finding
4. Write clearly for a technical audience

Always remind the user that findings should only be acted on against authorized targets.
Respond in structured markdown."""


async def run(session_id: str, target: str, dry_run: bool):
    """Phase 4 — AI analysis of all findings via OpenRouter."""
    await ws.emit("info", "ai", "Starting AI analysis of findings...")
    audit_log("PHASE_AI_START", target=target, dry_run=dry_run)

    db = SessionLocal()
    try:
        findings = db.query(Finding).filter(Finding.session_id == session_id).all()
        if not findings:
            await ws.emit("warn", "ai", "No findings to analyze.")
            return

        findings_text = _format_findings(findings)

        if dry_run:
            await ws.emit("warn", "ai", f"[DRY RUN] Would send {len(findings)} findings to {OPENROUTER_MODEL} for analysis")
            return

        analysis = await _call_openrouter(
            system=SYSTEM_PROMPT,
            user=f"Analyze these findings from a scan of {target}:\n\n{findings_text}",
        )

        # Save AI analysis back to each critical/high finding
        for finding in findings:
            if finding.severity in ("critical", "high"):
                finding.ai_analysis = analysis
        db.commit()

        await ws.emit("ok", "ai", "AI analysis complete.", {"analysis": analysis})
        audit_log("PHASE_AI_COMPLETE", target=target, detail=f"findings_analyzed={len(findings)}")

    finally:
        db.close()


async def analyze_finding(finding_title: str, cve_id: str, description: str, target: str) -> str:
    """Get AI analysis for a single finding."""
    prompt = f"""Analyze this security finding:

Title: {finding_title}
CVE: {cve_id or 'N/A'}
Description: {description}
Target: {target}

Provide:
1. Plain-English explanation of the vulnerability
2. Real-world impact if exploited
3. Specific exploitation steps (for authorized testing only)
4. Recommended remediation"""

    return await _call_openrouter(system=SYSTEM_PROMPT, user=prompt)


async def _call_openrouter(system: str, user: str) -> str:
    """Call OpenRouter API and return the response text."""
    if not OPENROUTER_API_KEY:
        return "OpenRouter API key not configured. Add OPENROUTER_API_KEY to your .env file."

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/finnmagnuskverndalen/fenrir",
        "X-Title": "Fenrir - Network Security Scanner",
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "max_tokens": AI_MAX_TOKENS,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        await ws.emit("error", "ai", f"OpenRouter API error: {e.response.status_code}")
        return f"API error: {e.response.status_code}"
    except Exception as e:
        await ws.emit("error", "ai", f"AI call failed: {e}")
        return f"AI analysis failed: {e}"


def _format_findings(findings) -> str:
    lines = []
    for f in findings:
        lines.append(
            f"- [{f.severity.upper()}] {f.title}"
            + (f" ({f.cve_id})" if f.cve_id else "")
            + (f" — CVSS {f.cvss_score}" if f.cvss_score else "")
            + (f"\n  Host: {f.host.ip}" if f.host else "")
            + (f"\n  {f.description[:200]}" if f.description else "")
        )
    return "\n".join(lines)

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
            await ws.emit("warn", "ai", f"[DRY RUN] Would send {len(findings)} findings to {OPENROUTER_MODEL}")
            return

        await ws.emit("info", "ai", f"Sending {len(findings)} findings to {OPENROUTER_MODEL}...")

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

    except Exception as e:
        await ws.emit("warn", "ai", f"AI analysis skipped: {e}")
        audit_log("PHASE_AI_ERROR", target=target, detail=str(e))
    finally:
        db.close()


async def analyze_finding(finding_title: str, cve_id: str, description: str, target: str) -> str:
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
    if not OPENROUTER_API_KEY:
        return "OpenRouter API key not configured."

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
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        error_body = e.response.text[:200] if e.response else "no body"
        await ws.emit("error", "ai", f"OpenRouter HTTP {e.response.status_code}: {error_body}")
        return f"API error {e.response.status_code}: {error_body}"
    except httpx.TimeoutException:
        await ws.emit("warn", "ai", "OpenRouter request timed out after 120s — try a faster model")
        return "AI analysis timed out."
    except Exception as e:
        await ws.emit("error", "ai", f"AI call failed: {type(e).__name__}: {e}")
        return f"AI analysis failed: {type(e).__name__}: {e}"


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

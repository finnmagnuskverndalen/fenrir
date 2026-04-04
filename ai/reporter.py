import httpx
from datetime import datetime
from backend.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, OPENROUTER_BASE_URL, AI_MAX_TOKENS
from backend.database import SessionLocal, ScanSession, Host, Finding


REPORT_SYSTEM_PROMPT = """You are a professional penetration tester writing a formal security report.
Write clearly, professionally, and in structured markdown.
Include an executive summary, technical findings, and remediation recommendations.
Each finding should have: severity, description, evidence, impact, and remediation steps."""


async def generate_report(session_id: str) -> str:
    """Generate a full pentest report for a session using OpenRouter."""
    db = SessionLocal()
    try:
        session = db.query(ScanSession).filter(ScanSession.id == session_id).first()
        if not session:
            return "Session not found."

        hosts = db.query(Host).filter(Host.session_id == session_id).all()
        findings = db.query(Finding).filter(Finding.session_id == session_id).all()

        context = _build_context(session, hosts, findings)
        report = await _call_openrouter(
            system=REPORT_SYSTEM_PROMPT,
            user=f"Write a penetration test report for this engagement:\n\n{context}",
        )

        # Save report to file
        filename = f"reports/fenrir_report_{session_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M')}.md"
        import os
        os.makedirs("reports", exist_ok=True)
        with open(filename, "w") as f:
            f.write(report)

        return report

    finally:
        db.close()


def _build_context(session, hosts, findings) -> str:
    lines = [
        f"Target: {session.target}",
        f"Scan date: {session.started_at}",
        f"Hosts discovered: {len(hosts)}",
        f"Total findings: {len(findings)}",
        "",
        "Hosts:",
    ]
    for host in hosts:
        ports = [f"{p.port}/{p.protocol} ({p.service})" for p in host.ports]
        lines.append(f"  - {host.ip} ({host.hostname or 'no hostname'}) — {', '.join(ports)}")

    lines.append("\nFindings:")
    for f in sorted(findings, key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}.get(x.severity, 5)):
        lines.append(
            f"  [{f.severity.upper()}] {f.title}"
            + (f" ({f.cve_id})" if f.cve_id else "")
            + (f" — CVSS {f.cvss_score}" if f.cvss_score else "")
        )
        if f.description:
            lines.append(f"    {f.description[:300]}")

    return "\n".join(lines)


async def _call_openrouter(system: str, user: str) -> str:
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
    except Exception as e:
        return f"Report generation failed: {e}"

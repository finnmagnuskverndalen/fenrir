import os
from datetime import datetime
from backend.database import SessionLocal, ScanSession, Host, Finding
from ai.provider import call_ai


REPORT_SYSTEM_PROMPT = """You are a senior penetration tester writing a professional security assessment report.

Write a complete, structured pentest report in markdown format with these exact sections:

# Executive Summary
A 2-3 paragraph non-technical summary covering: what was tested, overall risk level, most critical findings, and immediate recommended actions.

# Scope and Methodology
What was scanned, which tools were used, and the testing phases performed.

# Risk Summary
A table with columns: Severity | Count | Description

# Critical and High Findings
For each critical/high finding, include:
### [SEVERITY] Finding Title
- **CVE:** (if applicable)
- **CVSS Score:** (if available)
- **Affected Host:**
- **Description:**
- **Impact:** What an attacker could do if this is exploited
- **Remediation:** Specific steps to fix this

# Medium and Low Findings
Brief descriptions of medium/low findings in a table format.

# Remediation Roadmap
Prioritized action plan:
1. Immediate (fix within 24-48 hours)
2. Short-term (fix within 1-2 weeks)
3. Long-term (fix within 1-3 months)

# Conclusion
Brief closing paragraph.

Be specific, technical, and actionable. Do not use placeholder text."""


async def generate_report(session_id: str) -> str:
    db = SessionLocal()
    try:
        session = db.query(ScanSession).filter(ScanSession.id == session_id).first()
        if not session:
            return "Session not found."

        hosts = db.query(Host).filter(Host.session_id == session_id).all()
        findings = db.query(Finding).filter(Finding.session_id == session_id).all()

        if not findings:
            return "No findings to report for this session."

        context = _build_context(session, hosts, findings)
        report = await call_ai(
            system=REPORT_SYSTEM_PROMPT,
            user=f"Write a penetration test report for this engagement:\n\n{context}",
        )

        os.makedirs("reports", exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"reports/fenrir_report_{session_id[:8]}_{timestamp}.md"
        with open(filename, "w") as f:
            f.write(report)

        return report
    finally:
        db.close()


def _build_context(session, hosts, findings) -> str:
    sev_counts = {}
    for f in findings:
        sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1

    lines = [
        f"Target: {session.target}",
        f"Scan date: {session.started_at}",
        f"Hosts discovered: {len(hosts)}",
        f"Total findings: {len(findings)}",
        f"Severity breakdown: {', '.join(f'{k}: {v}' for k, v in sorted(sev_counts.items()))}",
        "",
        "=== HOSTS ===",
    ]

    for host in hosts:
        ports = db_ports_summary(host)
        lines.append(f"  {host.ip} ({host.hostname or 'no hostname'}) — OS: {host.os_guess or 'unknown'}")
        lines.append(f"  Open ports: {ports}")

    lines.append("")
    lines.append("=== FINDINGS (sorted by severity) ===")

    order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    sorted_findings = sorted(findings, key=lambda x: order.get(x.severity, 5))

    for f in sorted_findings:
        lines.append(f"\n[{f.severity.upper()}] {f.title}")
        if f.cve_id:
            lines.append(f"  CVE: {f.cve_id}")
        if f.cvss_score:
            lines.append(f"  CVSS: {f.cvss_score}")
        if f.host:
            lines.append(f"  Host: {f.host.ip if hasattr(f.host, 'ip') else 'unknown'}")
        if f.description:
            lines.append(f"  Description: {f.description[:400]}")

    return "\n".join(lines)


def db_ports_summary(host) -> str:
    if not host.ports:
        return "none"
    return ", ".join(f"{p.port}/{p.protocol}({p.service or '?'})" for p in host.ports[:10])

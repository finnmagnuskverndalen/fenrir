import json
from datetime import datetime, timezone
from pathlib import Path
from backend.config import AUDIT_LOG


def log(action: str, target: str = "", detail: str = "", dry_run: bool = False):
    """Append a timestamped entry to audit.log. Never overwrites."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "target": target,
        "detail": detail,
        "dry_run": dry_run,
    }
    with open(AUDIT_LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")


def read_log(limit: int = 200) -> list[dict]:
    """Return the last N entries from audit.log."""
    if not Path(AUDIT_LOG).exists():
        return []
    lines = Path(AUDIT_LOG).read_text().strip().splitlines()
    entries = []
    for line in lines[-limit:]:
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return list(reversed(entries))

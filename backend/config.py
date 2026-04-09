import os
import ipaddress
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
SCOPE_FILE = BASE_DIR / "scope.txt"
AUDIT_LOG = BASE_DIR / "audit.log"
DB_PATH = BASE_DIR / "fenrir.db"

# ── server ─────────────────────────────────────────────────────────────────
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8765))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# ── AI (OpenRouter) ────────────────────────────────────────────────────────
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", 4096))

# ── NVD ────────────────────────────────────────────────────────────────────
NVD_API_KEY = os.getenv("NVD_API_KEY", "")
NVD_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"

# ── safety ─────────────────────────────────────────────────────────────────
DRY_RUN = os.getenv("DRY_RUN", "true").lower() == "true"
ALLOW_PUBLIC_IPS = os.getenv("ALLOW_PUBLIC_IPS", "false").lower() == "true"
CRED_CHECK_ENABLED = os.getenv("CRED_CHECK_ENABLED", "false").lower() == "true"
POC_LOOKUP_ENABLED = os.getenv("POC_LOOKUP_ENABLED", "true").lower() == "true"
TLS_PROBE_ENABLED  = os.getenv("TLS_PROBE_ENABLED",  "true").lower() == "true"


def load_scope() -> list[ipaddress.IPv4Network]:
    """Load authorized CIDR ranges from scope.txt."""
    if not SCOPE_FILE.exists():
        return []
    networks = []
    for line in SCOPE_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        try:
            networks.append(ipaddress.IPv4Network(line, strict=False))
        except ValueError:
            print(f"[config] Invalid CIDR in scope.txt: {line}")
    return networks


def is_in_scope(target: str) -> bool:
    """Return True if target IP or CIDR is within an authorized scope entry."""
    scope = load_scope()
    if not scope:
        return False
    try:
        target_net = ipaddress.IPv4Network(target, strict=False)
    except ValueError:
        return False

    # Block public IPs unless explicitly allowed
    if not ALLOW_PUBLIC_IPS:
        for addr in target_net.hosts():
            if not (
                addr.is_private
                or addr.is_loopback
                or addr.is_link_local
            ):
                return False

    for authorized in scope:
        if target_net.subnet_of(authorized) or target_net == authorized:
            return True
    return False


def validate_config():
    """Raise if required config is missing."""
    # Check AI provider — skip API key requirement for Ollama
    try:
        from ai.provider import load_settings
        settings = load_settings()
        provider = settings.get("provider", "openrouter")
    except Exception:
        provider = "openrouter"

    if provider == "openrouter" and not OPENROUTER_API_KEY and not _settings_has_key():
        raise ValueError(
            "OPENROUTER_API_KEY is not set. Add it to your .env file or configure it in Settings.\n"
            "Get a free key at https://openrouter.ai/keys"
        )
    if not SCOPE_FILE.exists():
        raise FileNotFoundError(
            "scope.txt not found. Create it and add your authorized CIDR ranges.\n"
            "Example: echo '192.168.1.0/24' > scope.txt"
        )
    if not load_scope():
        raise ValueError("scope.txt is empty. Add at least one CIDR range.")


def _settings_has_key() -> bool:
    """Check if settings.json has an OpenRouter API key."""
    settings_path = BASE_DIR / "settings.json"
    if not settings_path.exists():
        return False
    try:
        import json
        data = json.loads(settings_path.read_text())
        return bool(data.get("openrouter_api_key", ""))
    except Exception:
        return False

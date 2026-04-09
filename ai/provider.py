"""
AI provider abstraction — supports OpenRouter and Ollama.
Settings are read from settings.json on every call so changes take effect immediately.
Falls back to .env values for backwards compatibility.
"""
import json
import asyncio
import httpx
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SETTINGS_PATH = BASE_DIR / "settings.json"

DEFAULT_SETTINGS = {
    "provider": "openrouter",
    "openrouter_api_key": "",
    "openrouter_model": "meta-llama/llama-3.3-70b-instruct",
    "ollama_base_url": "http://localhost:11434",
    "ollama_model": "llama3.2",
    "ai_max_tokens": 4096,
}


def load_settings() -> dict:
    """Load settings from settings.json, falling back to .env values."""
    settings = dict(DEFAULT_SETTINGS)

    # Load from settings.json if it exists
    if SETTINGS_PATH.exists():
        try:
            stored = json.loads(SETTINGS_PATH.read_text())
            settings.update({k: v for k, v in stored.items() if k in DEFAULT_SETTINGS})
        except Exception:
            pass

    # Fall back to .env values if settings.json has no API key set
    if not settings["openrouter_api_key"]:
        from backend.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, AI_MAX_TOKENS
        if OPENROUTER_API_KEY:
            settings["openrouter_api_key"] = OPENROUTER_API_KEY
        if settings["openrouter_model"] == DEFAULT_SETTINGS["openrouter_model"]:
            settings["openrouter_model"] = OPENROUTER_MODEL
        settings["ai_max_tokens"] = AI_MAX_TOKENS

    return settings


def save_settings(data: dict):
    """Persist settings to settings.json. Merges with existing."""
    current = load_settings()
    current.update({k: v for k, v in data.items() if k in DEFAULT_SETTINGS})
    SETTINGS_PATH.write_text(json.dumps(current, indent=2))


async def call_ai(system: str, user: str, max_tokens: int = None) -> str:
    """Single entry point for all LLM calls. Reads provider from settings each time."""
    settings = load_settings()
    tokens = max_tokens or settings["ai_max_tokens"]

    if settings["provider"] == "ollama":
        return await _call_ollama(settings, system, user, tokens)
    return await _call_openrouter(settings, system, user, tokens)


async def _call_openrouter(settings: dict, system: str, user: str, max_tokens: int) -> str:
    api_key = settings["openrouter_api_key"]
    if not api_key:
        return "OpenRouter API key not configured. Set it in Settings."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/finnmagnuskverndalen/fenrir",
        "X-Title": "Fenrir",
    }
    payload = {
        "model": settings["openrouter_model"],
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                await asyncio.sleep(5 * (attempt + 1))
                continue
            raise
        except httpx.TimeoutException:
            if attempt < 2:
                await asyncio.sleep(3)
                continue
            raise
    raise Exception("Max retries exceeded")


async def _call_ollama(settings: dict, system: str, user: str, max_tokens: int) -> str:
    base_url = settings["ollama_base_url"].rstrip("/")
    payload = {
        "model": settings["ollama_model"],
        "max_tokens": max_tokens,
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                f"{base_url}/v1/chat/completions",
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
    except httpx.ConnectError:
        raise Exception(f"Cannot connect to Ollama at {base_url}. Is it running?")
    except httpx.TimeoutException:
        raise Exception("Ollama request timed out (180s). Try a smaller model.")


async def list_ollama_models(base_url: str) -> list:
    """Return list of model names installed in Ollama."""
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(f"{base_url.rstrip('/')}/api/tags")
            resp.raise_for_status()
            return [m["name"] for m in resp.json().get("models", [])]
    except Exception:
        return []


async def test_connection() -> dict:
    """Send a test prompt and return ok/error."""
    try:
        result = await call_ai(
            system="You are a helpful assistant.",
            user="Reply with just the word: WORKING",
            max_tokens=10,
        )
        return {"ok": True, "response": result.strip()}
    except Exception as e:
        return {"ok": False, "error": str(e)}

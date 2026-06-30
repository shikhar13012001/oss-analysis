"""
Centralised configuration for the Hermes bot.

All values are read from environment variables (with .env support via
python-dotenv). Required variables are validated lazily through
``validate_runtime_config()`` instead of raising at import time, so that
utility modules (e.g. ``print_session_string``) can be imported without every
secret being present.
"""

import os
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()


# ── Helpers ─────────────────────────────────────────────────────────────────


def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _get_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        raise ValueError(f"{name} must be an integer, got: {raw!r}")


def _normalise_channel_username(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    if value.startswith(("http://", "https://")):
        parts = [part for part in urlparse(value).path.split("/") if part]
        if parts[:1] == ["s"]:
            parts = parts[1:]
        value = parts[0] if parts else ""
    return value.removeprefix("@").lower()


# ── Telegram ───────────────────────────────────────────────────────────────

TELEGRAM_BOT_TOKEN = _get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = _get("TELEGRAM_CHANNEL_ID")
TELEGRAM_CHANNEL_URL = _get("TELEGRAM_CHANNEL_URL")
TELEGRAM_CHANNEL_USERNAME = _normalise_channel_username(TELEGRAM_CHANNEL_URL)
TELEGRAM_API_ID = _get_int("TELEGRAM_API_ID", 0)
TELEGRAM_API_HASH = _get("TELEGRAM_API_HASH")
TELEGRAM_PHONE = _get("TELEGRAM_PHONE")
TELEGRAM_SESSION_NAME = _get("TELEGRAM_SESSION_NAME", "hermes-github-repos")
TELEGRAM_SESSION_STRING = _get("TELEGRAM_SESSION_STRING")
TELEGRAM_CHANNEL_BACKFILL_LIMIT = _get_int("TELEGRAM_CHANNEL_BACKFILL_LIMIT", 10)

# ── Ollama Cloud ────────────────────────────────────────────────────────────

OLLAMA_API_KEY = _get("OLLAMA_API_KEY")
OLLAMA_HOST = _get("OLLAMA_HOST", "https://ollama.com")
OLLAMA_MODEL = _get("OLLAMA_MODEL", "gpt-oss:120b")

# ── GitHub ──────────────────────────────────────────────────────────────────

GITHUB_TOKEN = _get("GITHUB_TOKEN")

# ── Sanity ──────────────────────────────────────────────────────────────────

SANITY_PROJECT_ID = _get("SANITY_PROJECT_ID")
SANITY_DATASET = _get("SANITY_DATASET", "production")
SANITY_API_VERSION = _get("SANITY_API_VERSION", "2024-01-01")
SANITY_WRITE_TOKEN = _get("SANITY_WRITE_TOKEN")

# ── Webhook / port ─────────────────────────────────────────────────────────

WEBHOOK_URL = _get("WEBHOOK_URL")
PORT = _get_int("PORT", 8080)
IS_PRODUCTION = bool(WEBHOOK_URL)

# Public base URL of the website, used for Telegram reply links.
SITE_URL = _get("SITE_URL", "http://localhost:3000")


# ── Runtime validation ─────────────────────────────────────────────────────

class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid at runtime."""


def require(*names: str) -> None:
    """Ensure each config attribute listed by name is non-empty."""
    missing = [n for n in names if not getattr(_this_module(), n, "")]
    if missing:
        raise ConfigError(
            "Missing required environment variables: " + ", ".join(missing)
        )


def _this_module():
    import sys
    return sys.modules[__name__]


def validate_bot_config() -> None:
    """Validate config needed for ``python -m bot.main`` (Bot API mode)."""
    require("TELEGRAM_BOT_TOKEN", "GITHUB_TOKEN", "OLLAMA_API_KEY",
            "SANITY_PROJECT_ID", "SANITY_WRITE_TOKEN")


def validate_listener_config() -> None:
    """Validate config needed for ``python -m bot.channel_listener``."""
    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        raise ConfigError(
            "TELEGRAM_API_ID and TELEGRAM_API_HASH are required for "
            "bot.channel_listener (get them from https://my.telegram.org)."
        )
    if not TELEGRAM_CHANNEL_URL and not TELEGRAM_CHANNEL_USERNAME:
        raise ConfigError(
            "TELEGRAM_CHANNEL_URL must point to a public Telegram channel."
        )
    require("GITHUB_TOKEN", "OLLAMA_API_KEY", "SANITY_PROJECT_ID", "SANITY_WRITE_TOKEN")
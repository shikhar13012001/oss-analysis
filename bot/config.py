import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv()

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


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHANNEL_ID = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()
TELEGRAM_CHANNEL_URL = os.getenv("TELEGRAM_CHANNEL_URL", "").strip()
TELEGRAM_CHANNEL_USERNAME = _normalise_channel_username(TELEGRAM_CHANNEL_URL)
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "").strip()
TELEGRAM_PHONE = os.getenv("TELEGRAM_PHONE", "").strip()
TELEGRAM_SESSION_NAME = os.getenv("TELEGRAM_SESSION_NAME", "hermes-github-repos").strip()
TELEGRAM_SESSION_STRING = os.getenv("TELEGRAM_SESSION_STRING", "").strip()
TELEGRAM_CHANNEL_BACKFILL_LIMIT = int(os.getenv("TELEGRAM_CHANNEL_BACKFILL_LIMIT", "10"))

OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "").strip()
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "https://ollama.com").strip()
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gpt-oss:120b").strip()
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]

SANITY_PROJECT_ID = os.environ["SANITY_PROJECT_ID"]
SANITY_DATASET = os.getenv("SANITY_DATASET", "production")
SANITY_API_VERSION = os.getenv("SANITY_API_VERSION", "2024-01-01")
SANITY_WRITE_TOKEN = os.environ["SANITY_WRITE_TOKEN"]

WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
PORT = int(os.getenv("PORT", "8080"))
IS_PRODUCTION = bool(WEBHOOK_URL)

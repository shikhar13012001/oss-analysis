"""
Telegram channel listener for public source feeds such as https://t.me/github_repos.

This uses a Telegram user session via Telethon so Hermes can ingest posts from a
public channel, extract GitHub URLs, and feed the full post text into analysis.
"""

import asyncio
import logging

from telethon import TelegramClient, events
from telethon.errors.rpcerrorlist import PhoneNumberInvalidError
from telethon.sessions import StringSession

from bot.config import (
    TELEGRAM_API_HASH,
    TELEGRAM_API_ID,
    TELEGRAM_CHANNEL_BACKFILL_LIMIT,
    TELEGRAM_CHANNEL_URL,
    TELEGRAM_CHANNEL_USERNAME,
    TELEGRAM_PHONE,
    TELEGRAM_SESSION_NAME,
    TELEGRAM_SESSION_STRING,
)
from bot.github_client import RepoNotFoundError, extract_github_url
from bot.pipeline import analyse_and_save_repo
from bot.sanity_client import already_processed

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("hermes.channel_listener")


def _channel_ref() -> str:
    if TELEGRAM_CHANNEL_URL:
        return TELEGRAM_CHANNEL_URL
    if TELEGRAM_CHANNEL_USERNAME:
        return f"@{TELEGRAM_CHANNEL_USERNAME}"
    raise RuntimeError("Set TELEGRAM_CHANNEL_URL to a public Telegram channel URL.")


def _channel_label(chat) -> str:
    username = getattr(chat, "username", None)
    return f"@{username}" if username else str(chat.id)


def _message_url(chat, message_id: int) -> str | None:
    username = getattr(chat, "username", None)
    if not username:
        return None
    return f"https://t.me/{username}/{message_id}"


async def _process_message(message, chat):
    text = (message.message or "").strip()
    if not text:
        return

    github_url = extract_github_url(text)
    if not github_url:
        return

    try:
        duplicate = await already_processed(github_url)
    except Exception:
        log.warning("Sanity check failed for %s, skipping", github_url, exc_info=True)
        return

    if duplicate:
        log.info("Skipping duplicate %s from %s", github_url, _channel_label(chat))
        return

    source_channel = _channel_label(chat)
    source_message_url = _message_url(chat, message.id)
    log.info("Analysing %s from %s", github_url, source_channel)

    try:
        _, analysis, slug = await analyse_and_save_repo(
            github_url,
            telegram_message_text=text,
            source_channel=source_channel,
            source_message_url=source_message_url,
        )
    except RepoNotFoundError as exc:
        log.warning("Skipping %s: %s", github_url, exc)
        return
    except Exception:
        log.exception("Pipeline error for %s", github_url)
        return

    log.info("Saved %s as %s (%s)", github_url, slug, analysis["status"])


async def _backfill_recent_posts(client: TelegramClient, entity):
    if TELEGRAM_CHANNEL_BACKFILL_LIMIT <= 0:
        return

    log.info(
        "Backfilling up to %s recent posts from %s",
        TELEGRAM_CHANNEL_BACKFILL_LIMIT,
        _channel_ref(),
    )

    recent_messages = []
    async for message in client.iter_messages(entity, limit=TELEGRAM_CHANNEL_BACKFILL_LIMIT):
        recent_messages.append(message)

    # Telethon returns newest-first by default. Process oldest-to-newest within
    # just the latest N posts so startup does not crawl ancient channel history.
    for message in reversed(recent_messages):
        chat = await message.get_chat()
        await _process_message(message, chat)


async def main():
    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        raise RuntimeError(
            "TELEGRAM_API_ID and TELEGRAM_API_HASH are required for bot.channel_listener."
        )

    session = StringSession(TELEGRAM_SESSION_STRING) if TELEGRAM_SESSION_STRING else TELEGRAM_SESSION_NAME
    client = TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH)
    try:
        await client.start(phone=TELEGRAM_PHONE or None)
    except PhoneNumberInvalidError as exc:
        raise RuntimeError(
            "Telegram login failed. Use your personal Telegram number in full "
            "international format, for example +919555607181."
        ) from exc

    entity = await client.get_entity(_channel_ref())
    chat = await client.get_entity(entity)
    log.info("Listening to %s", _channel_label(chat))

    await _backfill_recent_posts(client, entity)

    @client.on(events.NewMessage(chats=entity))
    async def on_new_message(event):
        event_chat = await event.get_chat()
        await _process_message(event.message, event_chat)

    await client.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())

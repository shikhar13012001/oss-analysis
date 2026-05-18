"""
One-time helper for deployment.

Logs into Telegram and prints a Telethon StringSession that can be stored in
TELEGRAM_SESSION_STRING for non-interactive deployments.
"""

import asyncio

from telethon import TelegramClient
from telethon.sessions import StringSession

from bot.config import TELEGRAM_API_HASH, TELEGRAM_API_ID, TELEGRAM_PHONE


async def main():
    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        raise RuntimeError("Set TELEGRAM_API_ID and TELEGRAM_API_HASH first.")

    client = TelegramClient(StringSession(), TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.start(phone=TELEGRAM_PHONE or None)
    print(client.session.save())
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())

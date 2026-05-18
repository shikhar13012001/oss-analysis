"""
Hermes Bot v2
─────────────
Local:  python -m bot.main   (polling — no WEBHOOK_URL)
Prod:   python -m bot.main   (webhook — WEBHOOK_URL set)
"""

import logging

from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

from bot.config import (
    IS_PRODUCTION,
    PORT,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID,
    TELEGRAM_CHANNEL_USERNAME,
    WEBHOOK_URL,
)
from bot.github_client import extract_github_url
from bot.pipeline import analyse_and_save_repo
from bot.sanity_client import already_processed

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("hermes")

# Update this after Vercel deploy
SITE_URL = "http://localhost:3000"

PROCESSING = "🔍 Hermes is analysing this repo..."
DUPLICATE  = "⏭ Already analysed — skipping."
ERROR      = "❌ Failed: {err}"

QUALIFIED_MSG = """\
✅ *Qualified — {name}*
_{tagline}_

Score {score}/10 · License risk: {risk} · {complexity} complexity
Buyer: _{buyer}_

🔗 {url}/ideas/{slug}
"""

REJECTED_MSG = """\
❌ *Rejected — {repo}*
Category: `{cat}` · Score {score}/10

_{reasons}_

Fixable: {fix}
🔗 {url}/rejected/{slug}
"""


def _should_process_message(msg) -> bool:
    expected_channel = bool(TELEGRAM_CHANNEL_ID or TELEGRAM_CHANNEL_USERNAME)
    if msg.chat.type != "channel":
        return not expected_channel

    if TELEGRAM_CHANNEL_ID and str(msg.chat.id) == TELEGRAM_CHANNEL_ID:
        return True

    if TELEGRAM_CHANNEL_USERNAME:
        return (msg.chat.username or "").lower() == TELEGRAM_CHANNEL_USERNAME

    return not expected_channel


def _source_channel_label(msg) -> str:
    return f"@{msg.chat.username}" if msg.chat.username else str(msg.chat.id)


def _source_message_url(msg) -> str | None:
    if not msg.chat.username:
        return None
    return f"https://t.me/{msg.chat.username}/{msg.message_id}"


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.channel_post or update.message
    if not msg or not msg.text:
        return

    if not _should_process_message(msg):
        log.info("Ignoring Telegram post from chat %s", msg.chat.id)
        return

    github_url = extract_github_url(msg.text)
    if not github_url:
        return

    log.info(f"Received: {github_url}")

    if await already_processed(github_url):
        await msg.reply_text(DUPLICATE)
        return

    status_msg = await msg.reply_text(PROCESSING)

    try:
        repo, analysis, slug = await analyse_and_save_repo(
            github_url,
            telegram_message_text=msg.text,
            source_channel=_source_channel_label(msg),
            source_message_url=_source_message_url(msg),
        )
    except Exception as exc:
        log.exception(f"Pipeline error for {github_url}")
        await status_msg.edit_text(ERROR.format(err=str(exc)[:200]))
        return

    if analysis["status"] == "qualified":
        p = analysis.get("product", {})
        text = QUALIFIED_MSG.format(
            name=p.get("name", repo.repo_name),
            tagline=p.get("tagline", ""),
            score=analysis.get("viabilityScore", "?"),
            risk=analysis.get("licenseAnalysis", {}).get("risk", "?"),
            complexity=p.get("deploymentComplexity", "?"),
            buyer=p.get("specificBuyer", "")[:80],
            url=SITE_URL,
            slug=slug,
        )
    else:
        r = analysis.get("rejection", {})
        reasons = " · ".join(r.get("reasons", [])[:2])
        text = REJECTED_MSG.format(
            repo=repo.repo_name,
            cat=r.get("category", "unknown"),
            score=analysis.get("viabilityScore", "?"),
            reasons=reasons[:120],
            fix="Yes — see page" if r.get("couldBeFixed") else "No",
            url=SITE_URL,
            slug=slug,
        )

    await status_msg.edit_text(
        text, parse_mode="Markdown", disable_web_page_preview=True
    )


def main():
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError("Set TELEGRAM_BOT_TOKEN before running bot.main.")

    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )

    if IS_PRODUCTION:
        log.info(f"Webhook mode → {WEBHOOK_URL}:{PORT}")
        app.run_webhook(
            listen="0.0.0.0",
            port=PORT,
            webhook_url=f"{WEBHOOK_URL}/webhook",
            url_path="webhook",
        )
    else:
        log.info("Polling mode (local)...")
        app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()

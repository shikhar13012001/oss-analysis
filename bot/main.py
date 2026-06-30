"""
Hermes Bot v2 — Telegram Bot API ingestion mode.

Local:  python -m bot.main   (polling — no WEBHOOK_URL)
Prod:   python -m bot.main   (webhook — WEBHOOK_URL set)
"""

from __future__ import annotations

import html
import logging

from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

from bot.config import (
    IS_PRODUCTION,
    PORT,
    SITE_URL,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID,
    TELEGRAM_CHANNEL_USERNAME,
    WEBHOOK_URL,
    validate_bot_config,
)
from bot.github_client import extract_github_url
from bot.pipeline import PipelineError, analyse_and_save_repo
from bot.sanity_client import already_processed

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("hermes")

PROCESSING = "🔍 Hermes is analysing this repo..."
DUPLICATE = "⏭ Already analysed — skipping."
ERROR = "❌ Failed: {err}"

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


# ── Telegram formatting helpers ─────────────────────────────────────────────


def _md_escape(text: str) -> str:
    """
    Escape MarkdownV1 special characters in dynamic content so model output
    containing ``_``/``*``/``[`` etc. doesn't break message sending.
    """
    if not text:
        return ""
    # Escape every Markdown special char.
    return text.replace("\\", "\\\\").translate(
        str.maketrans({
            "_": "\\_",
            "*": "\\*",
            "[": "\\[",
            "]": "\\]",
            "(": "\\(",
            ")": "\\)",
            "`": "\\`",
            "#": "\\#",
            "+": "\\+",
            "-": "\\-",
            ".": "\\.",
            "!": "\\!",
            "~": "\\~",
            ">": "\\>",
            "|": "\\|",
        })
    )


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

    log.info("Received: %s", github_url)

    try:
        if await already_processed(github_url):
            await msg.reply_text(DUPLICATE)
            return
    except Exception:
        # Dup-check failure should not block ingestion; already_processed
        # already returns False on error, but guard the call anyway.
        log.warning("Dup check raised for %s; proceeding", github_url, exc_info=True)

    status_msg = await msg.reply_text(PROCESSING)

    try:
        result = await analyse_and_save_repo(
            github_url,
            telegram_message_text=msg.text,
            source_channel=_source_channel_label(msg),
            source_message_url=_source_message_url(msg),
        )
    except PipelineError as exc:
        log.warning("Pipeline failed for %s: [%s] %s", github_url, exc.stage, exc)
        await _safe_edit(status_msg, ERROR.format(err=str(exc)[:200]))
        return
    except Exception as exc:
        log.exception("Unexpected pipeline error for %s", github_url)
        await _safe_edit(status_msg, ERROR.format(err=str(exc)[:200]))
        return

    repo, analysis, slug = result.repo, result.analysis, result.slug
    status = analysis.get("status") or "rejected"

    if status == "qualified":
        p = analysis.get("product", {}) or {}
        text = QUALIFIED_MSG.format(
            name=_md_escape(p.get("name", "") or repo.repo_name),
            tagline=_md_escape(p.get("tagline", "")),
            score=analysis.get("viabilityScore", "?"),
            risk=(analysis.get("licenseAnalysis", {}) or {}).get("risk", "?"),
            complexity=_md_escape(p.get("deploymentComplexity", "?")),
            buyer=_md_escape((p.get("specificBuyer", "") or "")[:80]),
            url=SITE_URL,
            slug=slug,
        )
    else:
        r = analysis.get("rejection", {}) or {}
        reasons = " · ".join(r.get("reasons", [])[:2])
        text = REJECTED_MSG.format(
            repo=_md_escape(repo.repo_name),
            cat=_md_escape(r.get("category", "unknown")),
            score=analysis.get("viabilityScore", "?"),
            reasons=_md_escape(reasons[:120]),
            fix="Yes — see page" if r.get("couldBeFixed") else "No",
            url=SITE_URL,
            slug=slug,
        )

    await _safe_edit(status_msg, text, parse_mode="Markdown",
                     disable_web_page_preview=True)


async def _safe_edit(status_msg, text: str, **kwargs):
    """Edit a status message, tolerating deletion/edge cases."""
    try:
        await status_msg.edit_text(text, **kwargs)
    except Exception:
        log.debug("Could not edit status message: %s", text[:80])


def main():
    validate_bot_config()

    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)
    )

    if IS_PRODUCTION:
        log.info("Webhook mode → %s:%s", WEBHOOK_URL, PORT)
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
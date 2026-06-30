"""
End-to-end pipeline: fetch repo → analyse → save to Sanity.

Wraps each stage with clear errors so callers (bot.main, channel_listener)
can surface a useful message instead of a stack trace.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from bot.config import require
from bot.github_client import RepoData, fetch_repo
from bot.hermes_agent import analyse_repo
from bot.sanity_client import save_result

log = logging.getLogger("hermes.pipeline")


@dataclass
class PipelineResult:
    repo: RepoData
    analysis: dict[str, Any]
    slug: str


class PipelineError(RuntimeError):
    """Raised when a pipeline stage fails with a user-friendly message."""

    def __init__(self, stage: str, message: str, *, url: str = "") -> None:
        self.stage = stage
        self.url = url
        super().__init__(f"[{stage}] {message}")


async def analyse_and_save_repo(
    github_url: str,
    telegram_message_text: str = "",
    source_channel: str = "",
    source_message_url: str | None = None,
) -> PipelineResult:
    """
    Run the full pipeline for a single GitHub URL.

    Stages: ``fetch`` → ``analyse`` → ``save``. Each stage wraps its
    underlying error in a ``PipelineError`` with the stage name so callers
    can show "Failed at analyse: …" rather than an opaque traceback.
    """
    require("GITHUB_TOKEN", "OLLAMA_API_KEY", "SANITY_PROJECT_ID", "SANITY_WRITE_TOKEN")

    try:
        repo = await fetch_repo(github_url)
    except Exception as exc:
        raise PipelineError("fetch", str(exc), url=github_url) from exc

    try:
        analysis = await analyse_repo(
            repo,
            telegram_message_text=telegram_message_text,
            source_channel=source_channel,
            source_message_url=source_message_url,
        )
    except Exception as exc:
        raise PipelineError("analyse", str(exc), url=github_url) from exc

    try:
        slug = await save_result(
            repo,
            analysis,
            source_channel=source_channel,
            source_message_text=telegram_message_text,
            source_message_url=source_message_url,
        )
    except Exception as exc:
        raise PipelineError("save", str(exc), url=github_url) from exc

    return PipelineResult(repo=repo, analysis=analysis, slug=slug)
from typing import Any

from bot.github_client import RepoData, fetch_repo
from bot.hermes_agent import analyse_repo
from bot.sanity_client import save_result


async def analyse_and_save_repo(
    github_url: str,
    telegram_message_text: str = "",
    source_channel: str = "",
    source_message_url: str | None = None,
) -> tuple[RepoData, dict[str, Any], str]:
    repo = await fetch_repo(github_url)
    analysis = await analyse_repo(
        repo,
        telegram_message_text=telegram_message_text,
        source_channel=source_channel,
        source_message_url=source_message_url,
    )
    slug = await save_result(
        repo,
        analysis,
        source_channel=source_channel,
        source_message_text=telegram_message_text,
        source_message_url=source_message_url,
    )
    return repo, analysis, slug

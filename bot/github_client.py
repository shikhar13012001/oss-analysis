"""GitHub metadata fetcher for Hermes."""

from __future__ import annotations

import base64
import logging
import re
from dataclasses import dataclass
from typing import Optional

import httpx

from bot._http import with_retries
from bot.config import GITHUB_TOKEN

log = logging.getLogger("hermes.github")

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

GITHUB_URL_RE = re.compile(
    r"https?://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)"
)
README_MAX_CHARS = 8_000
LICENSE_MAX_CHARS = 3_000
REQUEST_TIMEOUT = httpx.Timeout(20.0, connect=10.0)


class RepoNotFoundError(Exception):
    """Raised when a GitHub repo returns 404."""


class GitHubAccessError(Exception):
    """Raised when GitHub refuses the request (auth, rate limit, etc.)."""


@dataclass
class RepoData:
    owner: str
    repo_name: str
    github_url: str
    description: str
    stars: int
    language: str
    topics: list[str]
    license_spdx: Optional[str]
    readme_content: str
    license_content: str


def extract_github_url(text: str) -> Optional[str]:
    m = GITHUB_URL_RE.search(text)
    return m.group(0) if m else None


def parse_owner_repo(url: str) -> tuple[str, str]:
    m = GITHUB_URL_RE.search(url)
    if not m:
        raise ValueError(f"Cannot parse GitHub URL: {url}")
    return m.group(1), m.group(2)


async def fetch_repo(url: str) -> RepoData:
    """Fetch repo metadata, README, and LICENSE in parallel with retries."""
    owner, repo = parse_owner_repo(url)

    async def _fetch(client: httpx.AsyncClient):
        meta, readme, lic = await __gather(client, owner, repo)
        return RepoData(
            owner=owner,
            repo_name=repo,
            github_url=f"https://github.com/{owner}/{repo}",
            description=meta.get("description") or "",
            stars=int(meta.get("stargazers_count") or 0),
            language=meta.get("language") or "",
            topics=meta.get("topics") or [],
            license_spdx=(meta.get("license") or {}).get("spdx_id"),
            readme_content=readme,
            license_content=lic,
        )

    return await with_retries(
        _fetch, op=f"github:fetch_repo:{owner}/{repo}",
        max_attempts=3, timeout=REQUEST_TIMEOUT,
    )


async def __gather(client: httpx.AsyncClient, owner: str, repo: str):
    import asyncio
    return await asyncio.gather(
        _get_meta(client, owner, repo),
        _get_readme(client, owner, repo),
        _get_license(client, owner, repo),
    )


async def _get_meta(client: httpx.AsyncClient, owner: str, repo: str) -> dict:
    url = f"https://api.github.com/repos/{owner}/{repo}"
    r = await client.get(url)
    if r.status_code == 404:
        raise RepoNotFoundError(f"GitHub repo not found: {owner}/{repo}")
    if r.status_code in (401, 403):
        # Surface auth/rate-limit failures clearly rather than retrying.
        raise GitHubAccessError(
            f"GitHub API refused request ({r.status_code}) for {owner}/{repo}: "
            f"{_error_message(r)}"
        )
    r.raise_for_status()
    return r.json()


async def _get_readme(client: httpx.AsyncClient, owner: str, repo: str) -> str:
    try:
        r = await client.get(f"https://api.github.com/repos/{owner}/{repo}/readme")
        if r.status_code == 404:
            return ""
        if r.status_code in (401, 403):
            log.warning("README fetch blocked (%s) for %s/%s",
                        r.status_code, owner, repo)
            return ""
        r.raise_for_status()
        content = base64.b64decode(r.json()["content"]).decode("utf-8", errors="replace")
        return content[:README_MAX_CHARS]
    except httpx.HTTPStatusError:
        raise
    except Exception as exc:
        log.debug("README unavailable for %s/%s: %s", owner, repo, exc)
        return ""


async def _get_license(client: httpx.AsyncClient, owner: str, repo: str) -> str:
    try:
        r = await client.get(f"https://api.github.com/repos/{owner}/{repo}/license")
        if r.status_code == 404:
            return ""
        if r.status_code in (401, 403):
            log.warning("LICENSE fetch blocked (%s) for %s/%s",
                        r.status_code, owner, repo)
            return ""
        r.raise_for_status()
        content = base64.b64decode(r.json()["content"]).decode("utf-8", errors="replace")
        return content[:LICENSE_MAX_CHARS]
    except httpx.HTTPStatusError:
        raise
    except Exception as exc:
        log.debug("LICENSE unavailable for %s/%s: %s", owner, repo, exc)
        return ""


def _error_message(response: httpx.Response) -> str:
    try:
        body = response.json()
        msg = body.get("message") if isinstance(body, dict) else None
        return msg or response.text[:200]
    except Exception:
        return response.text[:200]
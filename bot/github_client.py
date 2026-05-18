import base64
import re
from dataclasses import dataclass
from typing import Optional
import asyncio

import httpx
from bot.config import GITHUB_TOKEN

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

GITHUB_URL_RE = re.compile(
    r"https?://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)"
)
README_MAX_CHARS  = 8_000
LICENSE_MAX_CHARS = 3_000


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
    owner, repo = parse_owner_repo(url)
    async with httpx.AsyncClient(headers=HEADERS, timeout=20) as client:
        meta, readme, lic = await asyncio.gather(
            _get_meta(client, owner, repo),
            _get_readme(client, owner, repo),
            _get_license(client, owner, repo),
        )
    return RepoData(
        owner=owner,
        repo_name=repo,
        github_url=f"https://github.com/{owner}/{repo}",
        description=meta.get("description") or "",
        stars=meta.get("stargazers_count", 0),
        language=meta.get("language") or "",
        topics=meta.get("topics", []),
        license_spdx=(meta.get("license") or {}).get("spdx_id"),
        readme_content=readme,
        license_content=lic,
    )


class RepoNotFoundError(Exception):
    pass


async def _get_meta(client, owner, repo) -> dict:
    r = await client.get(f"https://api.github.com/repos/{owner}/{repo}")
    if r.status_code == 404:
        raise RepoNotFoundError(f"GitHub repo not found: {owner}/{repo}")
    r.raise_for_status()
    return r.json()


async def _get_readme(client, owner, repo) -> str:
    try:
        r = await client.get(f"https://api.github.com/repos/{owner}/{repo}/readme")
        r.raise_for_status()
        content = base64.b64decode(r.json()["content"]).decode("utf-8", errors="replace")
        return content[:README_MAX_CHARS]
    except Exception:
        return ""


async def _get_license(client, owner, repo) -> str:
    try:
        r = await client.get(f"https://api.github.com/repos/{owner}/{repo}/license")
        r.raise_for_status()
        content = base64.b64decode(r.json()["content"]).decode("utf-8", errors="replace")
        return content[:LICENSE_MAX_CHARS]
    except Exception:
        return ""

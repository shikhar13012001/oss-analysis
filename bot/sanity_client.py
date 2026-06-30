"""
Sanity Content Lake client for the Hermes bot.

Writes analyses directly to the *published* document (no ``drafts.`` prefix)
so they go live immediately — Hermes auto-approves every analysis. Reads
(duplicate check) use the write token with the ``previewDrafts`` perspective
so any legacy drafts are still detected and the website can render both.
"""

from __future__ import annotations

import hashlib
import json
import logging
import urllib.parse
from typing import Any

import httpx
from slugify import slugify

from bot._http import with_retries
from bot.config import (
    SANITY_API_VERSION,
    SANITY_DATASET,
    SANITY_PROJECT_ID,
    SANITY_WRITE_TOKEN,
)
from bot.github_client import RepoData

log = logging.getLogger("hermes.sanity")

_MUTATE_URL = (
    f"https://{SANITY_PROJECT_ID}.api.sanity.io"
    f"/v{SANITY_API_VERSION}/data/mutate/{SANITY_DATASET}"
)
_QUERY_URL = (
    f"https://{SANITY_PROJECT_ID}.api.sanity.io"
    f"/v{SANITY_API_VERSION}/data/query/{SANITY_DATASET}"
)

_WRITE_HEADERS = {
    "Authorization": f"Bearer {SANITY_WRITE_TOKEN}",
    "Content-Type": "application/json",
}

_QUERY_TIMEOUT = httpx.Timeout(15.0, connect=10.0)
_MUTATE_TIMEOUT = httpx.Timeout(25.0, connect=10.0)


# ── Helpers ─────────────────────────────────────────────────────────────────


def _doc_id(github_url: str) -> str:
    """Stable deterministic *published* document ID from URL.

    No ``drafts.`` prefix — the analysis is written straight to the published
    document so it is visible on the website immediately (auto-approve).
    """
    h = hashlib.sha1(github_url.encode()).hexdigest()[:16]
    return f"repo-{h}"


def _make_slug(owner: str, repo_name: str) -> str:
    return slugify(f"{repo_name}-{owner}")


def _keyed(items: list, prefix: str = "k") -> list:
    """Add ``_key`` to array-of-object items (required by Sanity)."""
    return [{**item, "_key": f"{prefix}{i}"} for i, item in enumerate(items)]


# ── Public API ─────────────────────────────────────────────────────────────


class SanityWriteError(RuntimeError):
    """Raised when a Sanity mutate call fails."""


async def already_processed(github_url: str) -> bool:
    """
    Query Sanity (including drafts) for an existing document with this
    ``githubUrl``. Uses the write token so drafts are visible.

    On transient/query errors returns ``False`` (treat as not-yet-processed)
    and logs a warning, so a flaky Sanity never blocks ingestion — the worst
    case is a duplicate write, which ``createOrReplace`` de-dupes by ID.
    """
    query = '*[_type == "repoAnalysis" && githubUrl == $url][0]._id'
    params = {
        "query": query,
        "$url": json.dumps(github_url),
        "perspective": "previewDrafts",
    }
    encoded = urllib.parse.urlencode(params)

    async def _do(client: httpx.AsyncClient) -> dict[str, Any]:
        r = await client.get(
            f"{_QUERY_URL}?{encoded}",
            headers={"Authorization": f"Bearer {SANITY_WRITE_TOKEN}"},
        )
        r.raise_for_status()
        return r.json()

    try:
        data = await with_retries(
            _do, op=f"sanity:dup_check:{github_url}",
            max_attempts=2, timeout=_QUERY_TIMEOUT,
        )
    except Exception:
        log.warning("Duplicate check failed for %s — assuming not processed",
                    github_url, exc_info=True)
        return False

    if isinstance(data, dict) and data.get("error"):
        log.warning("Sanity query error for %s: %s",
                    github_url, data["error"])
        return False

    return data.get("result") is not None


async def save_result(
    repo: RepoData,
    analysis: dict[str, Any],
    source_channel: str = "",
    source_message_text: str = "",
    source_message_url: str | None = None,
) -> str:
    """
    Write the analysis to Sanity as a *published* document (auto-approve) and
    return the slug. Any pre-existing draft for the same URL is deleted in the
    same transaction so it cannot shadow the freshly-published document.
    """
    doc_id = _doc_id(repo.github_url)
    draft_id = f"drafts.{doc_id}"
    slug = _make_slug(repo.owner, repo.repo_name)
    doc = _build_document(
        doc_id,
        slug,
        repo,
        analysis,
        source_channel=source_channel,
        source_message_text=source_message_text,
        source_message_url=source_message_url,
    )

    # createOrReplace the published doc, and drop any stale draft so the
    # website (previewDrafts perspective) shows the published version.
    payload = {
        "mutations": [
            {"createOrReplace": doc},
            {"delete": {"id": draft_id}},
        ]
    }

    async def _do(client: httpx.AsyncClient) -> httpx.Response:
        r = await client.post(_MUTATE_URL, json=payload, headers=_WRITE_HEADERS)
        if r.status_code in (401, 403):
            raise SanityWriteError(
                f"Sanity refused write ({r.status_code}). Check SANITY_WRITE_TOKEN."
            )
        r.raise_for_status()
        return r

    try:
        await with_retries(
            _do, op=f"sanity:save:{repo.owner}/{repo.repo_name}",
            max_attempts=3, timeout=_MUTATE_TIMEOUT,
        )
    except SanityWriteError:
        raise
    except httpx.HTTPStatusError as exc:
        raise SanityWriteError(
            f"Sanity write failed ({exc.response.status_code}) for "
            f"{repo.owner}/{repo.repo_name}"
        ) from exc

    log.info("Saved %s/%s as %s (%s)",
             repo.owner, repo.repo_name, slug, analysis.get("status"))
    return slug


# ── Document builder ───────────────────────────────────────────────────────


def _build_document(
    doc_id: str,
    slug: str,
    repo: RepoData,
    analysis: dict[str, Any],
    source_channel: str = "",
    source_message_text: str = "",
    source_message_url: str | None = None,
) -> dict[str, Any]:
    status = analysis.get("status") or "rejected"
    if status not in ("qualified", "rejected"):
        status = "rejected"

    lic = analysis.get("licenseAnalysis", {}) or {}
    score = analysis.get("viabilityScore", 0)
    try:
        score = max(0, min(10, int(score)))
    except (TypeError, ValueError):
        score = 0

    doc: dict[str, Any] = {
        "_id": doc_id,
        "_type": "repoAnalysis",
        "githubUrl": repo.github_url,
        "owner": repo.owner,
        "repoName": repo.repo_name,
        "slug": {"_type": "slug", "current": slug},
        "stars": repo.stars,
        "language": repo.language,
        "topics": repo.topics,
        "status": status,
        "viabilityScore": score,
        "licenseSpdx": lic.get("spdx", "Unknown") or "Unknown",
        "licenseRisk": lic.get("risk", "High") or "High",
        "licenseRiskReason": lic.get("riskReason", "") or "",
        "summary": analysis.get("summary", "") or "",
        "sourceChannel": source_channel,
        "sourceMessageText": source_message_text,
        "sourceMessageUrl": source_message_url,
    }

    if status == "qualified":
        p = analysis.get("product", {}) or {}
        bm = analysis.get("businessModel", {}) or {}
        roadmap = analysis.get("revenueRoadmap", []) or []

        doc.update({
            "productName": p.get("name", "") or "",
            "tagline": p.get("tagline", "") or "",
            "productDescription": p.get("description", "") or "",
            "specificBuyer": p.get("specificBuyer", "") or "",
            "buyerWorkflow": p.get("buyerWorkflow", "") or "",
            "whyTheyPay": p.get("whyTheyPay", "") or "",
            "competitorCheck": p.get("competitorCheck", "") or "",
            "deploymentComplexity": p.get("deploymentComplexity", "Medium") or "Medium",
            "deploymentComplexityReason": p.get("deploymentComplexityReason", "") or "",
            "buildTime": p.get("buildTime", "") or "",
            "techStack": p.get("techStack", "") or "",
            "byokModel": p.get("byokModel"),
            "freemiumModel": p.get("freemiumModel", "") or "",
            "revenuePotential": p.get("revenuePotential", "Low") or "Low",
            "seoKeywords": p.get("seoKeywords", []) or [],
            "prerequisites": p.get("prerequisites", []) or [],
            "viabilityReasons": p.get("viabilityReasons", []) or [],
            "businessModel": {
                "freeTier": bm.get("freeTier", "") or "",
                "proTier": bm.get("proTier", "") or "",
                "pricing": bm.get("pricing", "") or "",
                "monetisationMethods": bm.get("monetisationMethods", []) or [],
            },
            "revenueRoadmap": _keyed(
                [
                    {
                        "phase": ph.get("phase", "") or "",
                        "title": ph.get("title", "") or "",
                        "duration": ph.get("duration", "") or "",
                        "actions": ph.get("actions", []) or [],
                    }
                    for ph in roadmap
                    if isinstance(ph, dict)
                ],
                prefix="ph",
            ),
        })
    else:  # rejected
        r = analysis.get("rejection", {}) or {}
        doc.update({
            "rejectionCategory": r.get("category", "") or "",
            "rejectionReasons": r.get("reasons", []) or [],
            "couldBeFixed": bool(r.get("couldBeFixed", False)),
            "howToFix": r.get("howToFix"),
            "alternativeUses": r.get("alternativeUses", []) or [],
        })

    return doc
"""
Sanity Content Lake client for Hermes bot.
Writes all analyses as drafts (prefix: drafts.)
so they appear in Sanity Studio for human review before publishing.
"""

import hashlib
import json
import urllib.parse
from typing import Any

import httpx
from slugify import slugify

from bot.config import (
    SANITY_PROJECT_ID,
    SANITY_DATASET,
    SANITY_API_VERSION,
    SANITY_WRITE_TOKEN,
)
from bot.github_client import RepoData

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


# ── Helpers ────────────────────────────────────────────────────────────────

def _doc_id(github_url: str) -> str:
    """Stable deterministic draft ID from URL."""
    h = hashlib.sha1(github_url.encode()).hexdigest()[:16]
    return f"drafts.repo-{h}"


def _make_slug(owner: str, repo_name: str) -> str:
    return slugify(f"{repo_name}-{owner}")


def _keyed(items: list, prefix: str = "k") -> list:
    """Add _key to array-of-object items (required by Sanity)."""
    return [{**item, "_key": f"{prefix}{i}"} for i, item in enumerate(items)]


# ── Public API ─────────────────────────────────────────────────────────────

async def already_processed(github_url: str) -> bool:
    """
    Query Sanity (including drafts) for an existing document
    with this githubUrl. Uses the write token so drafts are visible.
    """
    query = '*[_type == "repoAnalysis" && githubUrl == $url][0]._id'
    params = {
        "query": query,
        "$url": json.dumps(github_url),
        "perspective": "previewDrafts",
    }
    encoded = urllib.parse.urlencode(params)

    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{_QUERY_URL}?{encoded}",
            headers={"Authorization": f"Bearer {SANITY_WRITE_TOKEN}"},
        )
        data = r.json()
        return data.get("result") is not None


async def save_result(
    repo: RepoData,
    analysis: dict[str, Any],
    source_channel: str = "",
    source_message_text: str = "",
    source_message_url: str | None = None,
) -> str:
    """
    Write analysis to Sanity as an unpublished draft.
    Returns the slug string.
    """
    doc_id = _doc_id(repo.github_url)
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

    payload = {"mutations": [{"createOrReplace": doc}]}

    async with httpx.AsyncClient(headers=_WRITE_HEADERS, timeout=20) as client:
        r = await client.post(_MUTATE_URL, json=payload)
        r.raise_for_status()

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

    lic    = analysis.get("licenseAnalysis", {})
    status = analysis["status"]

    doc: dict[str, Any] = {
        "_id":     doc_id,
        "_type":   "repoAnalysis",
        "githubUrl":  repo.github_url,
        "owner":      repo.owner,
        "repoName":   repo.repo_name,
        "slug":       {"_type": "slug", "current": slug},
        "stars":      repo.stars,
        "language":   repo.language,
        "topics":     repo.topics,
        "status":     status,
        "viabilityScore": analysis.get("viabilityScore", 0),
        "licenseSpdx":       lic.get("spdx", "Unknown"),
        "licenseRisk":       lic.get("risk", "High"),
        "licenseRiskReason": lic.get("riskReason", ""),
        "summary": analysis.get("summary", ""),
        "sourceChannel": source_channel,
        "sourceMessageText": source_message_text,
        "sourceMessageUrl": source_message_url,
    }

    if status == "qualified":
        p       = analysis.get("product", {})
        bm      = analysis.get("businessModel", {})
        roadmap = analysis.get("revenueRoadmap", [])

        doc.update({
            "productName":               p.get("name", ""),
            "tagline":                   p.get("tagline", ""),
            "productDescription":        p.get("description", ""),
            "specificBuyer":             p.get("specificBuyer", ""),
            "buyerWorkflow":             p.get("buyerWorkflow", ""),
            "whyTheyPay":                p.get("whyTheyPay", ""),
            "competitorCheck":           p.get("competitorCheck", ""),
            "deploymentComplexity":      p.get("deploymentComplexity", "Medium"),
            "deploymentComplexityReason":p.get("deploymentComplexityReason", ""),
            "buildTime":                 p.get("buildTime", ""),
            "techStack":                 p.get("techStack", ""),
            "byokModel":                 p.get("byokModel"),
            "freemiumModel":             p.get("freemiumModel", ""),
            "revenuePotential":          p.get("revenuePotential", "Low"),
            "seoKeywords":               p.get("seoKeywords", []),
            "prerequisites":             p.get("prerequisites", []),
            "viabilityReasons":          p.get("viabilityReasons", []),
            "businessModel": {
                "freeTier":             bm.get("freeTier", ""),
                "proTier":              bm.get("proTier", ""),
                "pricing":              bm.get("pricing", ""),
                "monetisationMethods":  bm.get("monetisationMethods", []),
            },
            "revenueRoadmap": _keyed(
                [
                    {
                        "phase":    ph.get("phase", ""),
                        "title":    ph.get("title", ""),
                        "duration": ph.get("duration", ""),
                        "actions":  ph.get("actions", []),
                    }
                    for ph in roadmap
                ],
                prefix="ph",
            ),
        })

    else:  # rejected
        r = analysis.get("rejection", {})
        doc.update({
            "rejectionCategory": r.get("category", ""),
            "rejectionReasons":  r.get("reasons", []),
            "couldBeFixed":      r.get("couldBeFixed", False),
            "howToFix":          r.get("howToFix"),
            "alternativeUses":   r.get("alternativeUses", []),
        })

    return doc

"""
Structured-output validation for the Hermes analysis LLM response.

The Ollama model is instructed to return a strict JSON object, but models
occasionally drift: they add markdown fences, truncate output, or use the
wrong enum value. This module parses, validates, and coerces the raw response
into a normalised dict that ``sanity_client`` can write safely.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

log = logging.getLogger("hermes.schema")

VALID_STATUSES = {"qualified", "rejected"}
VALID_RISKS = {"Low", "Medium", "High"}
VALID_COMPLEXITY = {"Low", "Medium", "High"}
VALID_REVENUE = {"Low", "Medium", "High"}

# Rejection categories allowed by the prompt + schema.
VALID_REJECTION_CATEGORIES = {
    "legal_risk", "exploit_tool", "hardware_dependency", "research_only",
    "already_exists", "too_niche", "no_license", "complex_setup",
}


class AnalysisParseError(ValueError):
    """Raised when the model output cannot be turned into a valid analysis."""


# ── Helpers ─────────────────────────────────────────────────────────────────


def _strip_fences(raw: str) -> str:
    """Remove ```json ... ``` fences wherever they wrap the JSON payload."""
    text = raw.strip()
    # Handle a leading fence with optional language tag.
    text = re.sub(r"^\s*```(?:json)?\s*", "", text)
    # Handle a trailing fence.
    text = re.sub(r"\s*```\s*$", "", text)
    # If the model embedded the JSON inside prose, try to isolate the first
    # balanced { ... } block as a last resort.
    if not text.startswith("{"):
        m = re.search(r"\{[\s\S]*\}", text)
        if m:
            text = m.group(0)
    return text.strip()


def _coerce_int(value: Any, default: int, lo: int, hi: int) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        try:
            n = int(float(value))  # models sometimes emit "7.0"
        except (TypeError, ValueError):
            return default
    return max(lo, min(hi, n))


def _coerce_str_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return []


def _enum(value: Any, valid: set[str], default: str) -> str:
    if isinstance(value, str) and value in valid:
        return value
    if isinstance(value, str) and value:
        # Tolerate case drift, e.g. "low" → "Low".
        capped = value.capitalize()
        if capped in valid:
            return capped
    return default


# ── Public API ───────────────────────────────────────────────────────────────


def parse_analysis(raw: str) -> dict[str, Any]:
    """
    Parse raw model output into a validated analysis dict.

    Raises ``AnalysisParseError`` if no JSON object can be recovered.
    Never raises on individual field mismatches — those are coerced to safe
    defaults and logged, so a partially-bad model response still produces a
    writeable Sanity document.
    """
    if not raw or not raw.strip():
        raise AnalysisParseError("Ollama returned an empty response.")

    text = _strip_fences(raw)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AnalysisParseError(
            f"Ollama response is not valid JSON: {exc.msg}"
        ) from exc

    if not isinstance(data, dict):
        raise AnalysisParseError(
            f"Ollama response is not a JSON object (got {type(data).__name__})."
        )

    return _normalise(data)


def _normalise(data: dict[str, Any]) -> dict[str, Any]:
    status = _enum(data.get("status"), VALID_STATUSES, "rejected")
    score = _coerce_int(data.get("viabilityScore"), 0, 0, 10)

    lic = data.get("licenseAnalysis") or {}
    if not isinstance(lic, dict):
        lic = {}
    license_analysis = {
        "spdx": str(lic.get("spdx") or "Unknown"),
        "risk": _enum(lic.get("risk"), VALID_RISKS, "High"),
        "riskReason": str(lic.get("riskReason") or ""),
    }

    summary = str(data.get("summary") or "")

    result: dict[str, Any] = {
        "status": status,
        "viabilityScore": score,
        "licenseAnalysis": license_analysis,
        "summary": summary,
    }

    if status == "qualified":
        result["product"] = _normalise_product(data.get("product") or {})
        result["businessModel"] = _normalise_business(data.get("businessModel") or {})
        result["revenueRoadmap"] = _normalise_roadmap(data.get("revenueRoadmap") or [])
    else:
        result["rejection"] = _normalise_rejection(data.get("rejection") or {})

    return result


def _normalise_product(p: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(p, dict):
        p = {}
    return {
        "name": str(p.get("name") or ""),
        "tagline": str(p.get("tagline") or ""),
        "description": str(p.get("description") or ""),
        "specificBuyer": str(p.get("specificBuyer") or ""),
        "buyerWorkflow": str(p.get("buyerWorkflow") or ""),
        "whyTheyPay": str(p.get("whyTheyPay") or ""),
        "competitorCheck": str(p.get("competitorCheck") or ""),
        "deploymentComplexity": _enum(
            p.get("deploymentComplexity"), VALID_COMPLEXITY, "Medium"
        ),
        "deploymentComplexityReason": str(p.get("deploymentComplexityReason") or ""),
        "buildTime": str(p.get("buildTime") or ""),
        "techStack": str(p.get("techStack") or ""),
        "byokModel": p.get("byokModel") if isinstance(p.get("byokModel"), str) else None,
        "freemiumModel": str(p.get("freemiumModel") or ""),
        "revenuePotential": _enum(p.get("revenuePotential"), VALID_REVENUE, "Low"),
        "seoKeywords": _coerce_str_list(p.get("seoKeywords")),
        "prerequisites": _coerce_str_list(p.get("prerequisites")),
        "viabilityReasons": _coerce_str_list(p.get("viabilityReasons")),
    }


def _normalise_business(bm: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(bm, dict):
        bm = {}
    return {
        "freeTier": str(bm.get("freeTier") or ""),
        "proTier": str(bm.get("proTier") or ""),
        "pricing": str(bm.get("pricing") or ""),
        "monetisationMethods": _coerce_str_list(bm.get("monetisationMethods")),
    }


def _normalise_roadmap(roadmap: Any) -> list[dict[str, Any]]:
    if not isinstance(roadmap, list):
        return []
    phases: list[dict[str, Any]] = []
    for ph in roadmap:
        if not isinstance(ph, dict):
            continue
        phases.append({
            "phase": str(ph.get("phase") or ""),
            "title": str(ph.get("title") or ""),
            "duration": str(ph.get("duration") or ""),
            "actions": _coerce_str_list(ph.get("actions")),
        })
    return phases


def _normalise_rejection(r: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(r, dict):
        r = {}
    category = r.get("category")
    if category not in VALID_REJECTION_CATEGORIES:
        # Keep unknown categories verbatim so the UI can still render them,
        # but flag in logs.
        if category:
            log.warning("Unknown rejection category from model: %r", category)
        category = str(category or "")
    how_to_fix = r.get("howToFix")
    return {
        "reasons": _coerce_str_list(r.get("reasons")),
        "category": category,
        "couldBeFixed": bool(r.get("couldBeFixed") or False),
        "howToFix": how_to_fix if isinstance(how_to_fix, str) and how_to_fix else None,
        "alternativeUses": _coerce_str_list(r.get("alternativeUses")),
    }
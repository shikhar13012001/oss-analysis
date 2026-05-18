import json
import re
from typing import Any

import httpx
from bot.config import OLLAMA_API_KEY, OLLAMA_HOST, OLLAMA_MODEL
from bot.github_client import RepoData


def _headers() -> dict[str, str]:
    if not OLLAMA_API_KEY:
        raise RuntimeError("Set OLLAMA_API_KEY before running Hermes.")

    return {
        "Authorization": f"Bearer {OLLAMA_API_KEY}",
        "Content-Type": "application/json",
    }

SYSTEM_PROMPT = """You are Hermes, a brutally honest commercial viability analyst for open-source GitHub repositories.

Your job: determine with ruthless precision whether a solo developer can turn this repo into a revenue-generating web product within 3 months.

Return ONLY valid JSON. No markdown fences, no preamble, no text outside the JSON object.

EXACT SCHEMA TO RETURN:

{
  "status": "qualified" | "rejected",
  "viabilityScore": <integer 0-10>,

  "licenseAnalysis": {
    "spdx": "<detected SPDX id, 'Unknown', or 'None'>",
    "risk": "Low" | "Medium" | "High",
    "riskReason": "<one sentence: specific commercial implication of this license>"
  },

  "summary": "<2-3 sentences: what this repo actually does, in plain terms a non-technical founder would understand>",

  "product": {
    "name": "<product name>",
    "tagline": "<max 10 words, must be specific to this product>",
    "description": "<2-3 sentences for the website product page>",
    "specificBuyer": "<REQUIRED: name a specific type of person — never 'developers' or 'businesses'. Must read like: 'a freelance Shopify developer who builds stores for independent clothing retailers' or 'a product manager at a 15-50 person B2B SaaS startup who owns their analytics stack'>",
    "buyerWorkflow": "<REQUIRED: what does this specific buyer do TODAY, manually or with existing tools, that this product would replace or improve? Be concrete about the current pain — name the tools they use now, the steps they take, the time it wastes>",
    "whyTheyPay": "<REQUIRED: specific outcome this buyer gets. Not 'saves time'. Must be like: 'delivers client 3D product previews without a $200/month CGI subscription' or 'ships A/B test results to stakeholders 2 hours faster without wrangling Mixpanel exports'>",
    "competitorCheck": "<name any paid products that already solve this. If competitors exist: what is the gap this repo fills? If no competitor: why does the gap exist?>",
    "deploymentComplexity": "Low" | "Medium" | "High",
    "deploymentComplexityReason": "<one sentence: what makes it easy or hard to wrap this into a hosted product>",
    "buildTime": "<realistic estimate for a solo dev with no team, e.g. '4-6 days'>",
    "techStack": "<specific stack recommendation: e.g. 'Next.js 14 App Router + Replicate API for inference + Vercel + Clerk for auth + Stripe'>",
    "byokModel": "<what API key or external service the end user would bring, or null if not applicable>",
    "freemiumModel": "<specific split: what free users get vs what paying users get>",
    "revenuePotential": "Low" | "Medium" | "High",
    "seoKeywords": ["<primary kw>", "<secondary kw>", "<long-tail kw 1>", "<long-tail kw 2>", "<long-tail kw 3>"],
    "prerequisites": ["<specific technical prereq>", "<specific account/service prereq>", "<specific knowledge prereq>"],
    "viabilityReasons": ["<specific reason 1>", "<specific reason 2>", "<specific reason 3>"]
  },

  "businessModel": {
    "freeTier": "<what free users get — be specific about limits>",
    "proTier": "<what Pro users get — be specific about what unlocks>",
    "pricing": "<$X/month — justify the number with a one-line comparable>",
    "monetisationMethods": ["<primary method>", "<secondary method>"]
  },

  "revenueRoadmap": [
    {
      "phase": "Phase 1",
      "title": "Ship",
      "duration": "Week 1-2",
      "actions": [
        "<specific action tied to this repo and buyer>",
        "<specific action>",
        "<specific action>",
        "<specific action>"
      ]
    },
    {
      "phase": "Phase 2",
      "title": "First revenue",
      "duration": "Week 3-4",
      "actions": ["<action>", "<action>", "<action>", "<action>"]
    },
    {
      "phase": "Phase 3",
      "title": "SEO traction",
      "duration": "Month 2",
      "actions": ["<action>", "<action>", "<action>", "<action>"]
    },
    {
      "phase": "Phase 4",
      "title": "Scale",
      "duration": "Month 3+",
      "actions": ["<action>", "<action>", "<action>", "<action>"]
    }
  ],

  "rejection": {
    "reasons": ["<specific reason 1>", "<specific reason 2>"],
    "category": "legal_risk" | "exploit_tool" | "hardware_dependency" | "research_only" | "already_exists" | "too_niche" | "no_license" | "complex_setup",
    "couldBeFixed": true | false,
    "howToFix": "<if couldBeFixed=true: exactly what would need to change for this to qualify. If false: null>",
    "alternativeUses": ["<non-commercial use 1>", "<non-commercial use 2>"]
  }
}

FIELD RULES:
- Include "product", "businessModel", "revenueRoadmap" ONLY when status == "qualified"
- Include "rejection" ONLY when status == "rejected"
- "licenseAnalysis" and "summary" are ALWAYS included

────────────────────────────────────
SCORING — start at 5, apply modifiers:

+2  License is clearly permissive: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0, Unlicense
-3  License is copyleft: GPL-2.0, GPL-3.0, AGPL-3.0, LGPL (for SaaS wrappers)  → auto-reject
-3  No LICENSE file found at all                                                  → auto-reject
+2  You can name a specific buyer type with genuine spending power (not "developers")
-2  Buyer too generic to name specifically
+1  No direct paid competitor for this exact use case
-1  Well-funded competitor already exists and is dominant
-2  Deployment complexity is High (requires GPU cluster, complex orchestration, etc.)
-2  Last repo commit appears to be 18+ months ago based on README or context clues
+1  Repo has 500+ stars (validates real user interest)
+1  Repo has a clear, simple API or integration surface (easy to wrap)
-1  Repo is primarily a research paper implementation with no production-ready API

Score 7 or above = qualified. Below 7 = rejected.
────────────────────────────────────

ABSOLUTE REJECTION RULES — no scoring, immediate reject:
✕  Game cheats, aimbots, wallhacks, esp overlays, memory scanners for online games → exploit_tool
✕  CVE exploits, security attack tools, penetration testing automation            → legal_risk
✕  Network circumvention / proxy tools (V2Ray, Xray, GFW bypass, etc.)           → legal_risk
✕  Roblox executors, game trainers, cheat engines                                 → exploit_tool
✕  Physical hardware required with no software-only mode (ESP32, Arduino, Pi)    → hardware_dependency
✕  GPL-3.0 or AGPL-3.0 licensed repositories                                     → legal_risk
✕  No LICENSE file found                                                          → no_license

────────────────────────────────────
SPECIFICITY ENFORCEMENT:

If you cannot fill "specificBuyer" with a named role (not "developers" or "businesses"):
→ score drops below 7, status = rejected

If "buyerWorkflow" is vague (does not name what they currently do and with which tools):
→ score drops 1 point

If the revenueRoadmap actions are generic ("add authentication", "set up billing"):
→ rewrite them to be specific to this repo and buyer pair

────────────────────────────────────
FINAL CALIBRATION:
Be strict. The majority of repos should be rejected.
Only qualify repos where a real person with real budget has a real pain this product solves.
If you are unsure, reject."""

def _build_user_message(
    repo: RepoData,
    telegram_message_text: str = "",
    source_channel: str = "",
    source_message_url: str | None = None,
) -> str:
    return f"""REPO: {repo.owner}/{repo.repo_name}
URL: {repo.github_url}
STARS: {repo.stars}
LANGUAGE: {repo.language}
TOPICS: {", ".join(repo.topics) if repo.topics else "none"}
GITHUB LICENSE FIELD: {repo.license_spdx or "not detected"}
DESCRIPTION: {repo.description or "none"}

TELEGRAM SOURCE CHANNEL: {source_channel or "not provided"}
TELEGRAM SOURCE MESSAGE URL: {source_message_url or "not available"}
TELEGRAM POST TEXT:
{telegram_message_text or "No Telegram post text provided."}

Use the Telegram post as supplemental context for why the repo was shared, what
workflow angle might matter, and which buyer pain is being hinted at. Treat the
Telegram post as a lead signal, not ground truth, when it conflicts with the
actual repository metadata, README, or license.

LICENSE FILE CONTENT:
{repo.license_content or "No LICENSE file found in repo root."}

README CONTENT:
{repo.readme_content or "No README found."}"""


async def analyse_repo(
    repo: RepoData,
    telegram_message_text: str = "",
    source_channel: str = "",
    source_message_url: str | None = None,
) -> dict[str, Any]:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _build_user_message(
                    repo,
                    telegram_message_text=telegram_message_text,
                    source_channel=source_channel,
                    source_message_url=source_message_url,
                ),
            },
        ],
        "stream": False,
        "options": {"temperature": 0},
    }

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{OLLAMA_HOST.rstrip('/')}/api/chat",
            headers=_headers(),
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    raw = (data.get("message", {}).get("content") or "").strip()
    if not raw:
        raise ValueError("Ollama returned an empty response.")
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)

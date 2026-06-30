import { sanityClient } from "./sanity";
import type { RepoAnalysis } from "./types";

// Shared field projection used in list queries
const CARD_FIELDS = `
  _id,
  "isDraft": _id match "drafts.*",
  "slug": slug.current,
  githubUrl,
  owner,
  repoName,
  stars,
  language,
  status,
  viabilityScore,
  licenseRisk,
  summary,
  revenuePotential,
  productName,
  tagline,
  buildTime,
  rejectionCategory,
  rejectionReasons,
  couldBeFixed
`;

// Full projection used in detail queries
const FULL_FIELDS = `
  ${CARD_FIELDS},
  topics,
  licenseSpdx,
  licenseRiskReason,
  publishedAt,
  sourceChannel,
  sourceMessageUrl,
  sourceMessageText,
  productDescription,
  specificBuyer,
  buyerWorkflow,
  whyTheyPay,
  competitorCheck,
  deploymentComplexity,
  deploymentComplexityReason,
  techStack,
  byokModel,
  freemiumModel,
  seoKeywords,
  prerequisites,
  viabilityReasons,
  businessModel,
  revenueRoadmap,
  howToFix,
  alternativeUses
`;

// ── Safe fetch wrapper ──────────────────────────────────────────────────────
//
// Every query is wrapped so a flaky Sanity API (rate limit, transient 5xx, or
// misconfigured token) degrades to an empty state instead of 500-ing the
// whole page. Errors are logged once on the server.

async function safeFetch<T>(
  query: string,
  params: Record<string, unknown>,
  fallback: T,
): Promise<T> {
  try {
    return await sanityClient.fetch<T>(query, params);
  } catch (err) {
    console.error("[hermes] Sanity query failed:", err);
    return fallback;
  }
}

export type Stats = { total: number; qualified: number; rejected: number };

// ── Stats ──────────────────────────────────────────────────────────────────

export async function getStats(): Promise<Stats | null> {
  return safeFetch<Stats | null>(
    `{
      "total":     count(*[_type == "repoAnalysis"]),
      "qualified": count(*[_type == "repoAnalysis" && status == "qualified"]),
      "rejected":  count(*[_type == "repoAnalysis" && status == "rejected"])
    }`,
    {},
    null,
  );
}

// ── Qualified ──────────────────────────────────────────────────────────────

export async function getLatestQualified(limit = 6): Promise<RepoAnalysis[]> {
  // GROQ [0...N] is exclusive of N, so it returns N items for [0...N].
  // (Previously this passed limit - 1, which returned one fewer item than asked.)
  return safeFetch<RepoAnalysis[]>(
    `*[_type == "repoAnalysis" && status == "qualified"] | order(_createdAt desc) [0...$limit] { ${CARD_FIELDS} }`,
    { limit },
    [],
  );
}

export async function getAllQualified(): Promise<RepoAnalysis[]> {
  return safeFetch<RepoAnalysis[]>(
    `*[_type == "repoAnalysis" && status == "qualified"] | order(_createdAt desc) { ${CARD_FIELDS} }`,
    {},
    [],
  );
}

export async function getQualifiedBySlug(slug: string): Promise<RepoAnalysis | null> {
  return safeFetch<RepoAnalysis | null>(
    `*[_type == "repoAnalysis" && slug.current == $slug && status == "qualified"][0] { ${FULL_FIELDS} }`,
    { slug },
    null,
  );
}

// ── Rejected ───────────────────────────────────────────────────────────────

export async function getLatestRejected(limit = 6): Promise<RepoAnalysis[]> {
  return safeFetch<RepoAnalysis[]>(
    `*[_type == "repoAnalysis" && status == "rejected"] | order(_createdAt desc) [0...$limit] { ${CARD_FIELDS} }`,
    { limit },
    [],
  );
}

export async function getAllRejected(): Promise<RepoAnalysis[]> {
  return safeFetch<RepoAnalysis[]>(
    `*[_type == "repoAnalysis" && status == "rejected"] | order(_createdAt desc) { ${CARD_FIELDS} }`,
    {},
    [],
  );
}

export async function getRejectedBySlug(slug: string): Promise<RepoAnalysis | null> {
  return safeFetch<RepoAnalysis | null>(
    `*[_type == "repoAnalysis" && slug.current == $slug && status == "rejected"][0] { ${FULL_FIELDS} }`,
    { slug },
    null,
  );
}
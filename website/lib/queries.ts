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

// ── Stats ──────────────────────────────────────────────────────────────────

export async function getStats() {
  const result = await sanityClient.fetch<{ total: number; qualified: number; rejected: number }>(`{
    "total":     count(*[_type == "repoAnalysis"]),
    "qualified": count(*[_type == "repoAnalysis" && status == "qualified"]),
    "rejected":  count(*[_type == "repoAnalysis" && status == "rejected"])
  }`);
  return result;
}

// ── Qualified ──────────────────────────────────────────────────────────────

export async function getLatestQualified(limit = 6): Promise<RepoAnalysis[]> {
  return sanityClient.fetch(
    `*[_type == "repoAnalysis" && status == "qualified"] | order(_createdAt desc) [0...$limit] { ${CARD_FIELDS} }`,
    { limit: limit - 1 }
  );
}

export async function getAllQualified(): Promise<RepoAnalysis[]> {
  return sanityClient.fetch(
    `*[_type == "repoAnalysis" && status == "qualified"] | order(_createdAt desc) { ${CARD_FIELDS} }`
  );
}

export async function getQualifiedBySlug(slug: string): Promise<RepoAnalysis | null> {
  return sanityClient.fetch(
    `*[_type == "repoAnalysis" && slug.current == $slug && status == "qualified"][0] { ${FULL_FIELDS} }`,
    { slug }
  );
}

// ── Rejected ───────────────────────────────────────────────────────────────

export async function getLatestRejected(limit = 6): Promise<RepoAnalysis[]> {
  return sanityClient.fetch(
    `*[_type == "repoAnalysis" && status == "rejected"] | order(_createdAt desc) [0...$limit] { ${CARD_FIELDS} }`,
    { limit: limit - 1 }
  );
}

export async function getAllRejected(): Promise<RepoAnalysis[]> {
  return sanityClient.fetch(
    `*[_type == "repoAnalysis" && status == "rejected"] | order(_createdAt desc) { ${CARD_FIELDS} }`
  );
}

export async function getRejectedBySlug(slug: string): Promise<RepoAnalysis | null> {
  return sanityClient.fetch(
    `*[_type == "repoAnalysis" && slug.current == $slug && status == "rejected"][0] { ${FULL_FIELDS} }`,
    { slug }
  );
}

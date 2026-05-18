export type LicenseRisk       = "Low" | "Medium" | "High";
export type DeployComplexity  = "Low" | "Medium" | "High";
export type RevenuePotential  = "Low" | "Medium" | "High";
export type RepoStatus        = "qualified" | "rejected";

export type RejectionCategory =
  | "legal_risk" | "exploit_tool" | "hardware_dependency"
  | "research_only" | "already_exists" | "too_niche"
  | "no_license" | "complex_setup";

export interface RoadmapPhase {
  _key: string;
  phase: string;
  title: string;
  duration: string;
  actions: string[];
}

export interface BusinessModel {
  freeTier: string;
  proTier: string;
  pricing: string;
  monetisationMethods: string[];
}

export interface RepoAnalysis {
  _id: string;
  slug: string;             // projected from slug.current
  githubUrl: string;
  owner: string;
  repoName: string;
  stars: number;
  language: string;
  topics: string[];
  status: RepoStatus;
  viabilityScore: number;
  licenseSpdx: string;
  licenseRisk: LicenseRisk;
  licenseRiskReason: string;
  summary: string;
  sourceChannel?: string;
  sourceMessageUrl?: string;
  sourceMessageText?: string;
  publishedAt?: string;
  isDraft: boolean;         // projected: _id starts with "drafts."

  // Qualified fields
  productName?: string;
  tagline?: string;
  productDescription?: string;
  specificBuyer?: string;
  buyerWorkflow?: string;
  whyTheyPay?: string;
  competitorCheck?: string;
  deploymentComplexity?: DeployComplexity;
  deploymentComplexityReason?: string;
  buildTime?: string;
  techStack?: string;
  byokModel?: string | null;
  freemiumModel?: string;
  revenuePotential?: RevenuePotential;
  seoKeywords?: string[];
  prerequisites?: string[];
  viabilityReasons?: string[];
  businessModel?: BusinessModel;
  revenueRoadmap?: RoadmapPhase[];

  // Rejected fields
  rejectionCategory?: RejectionCategory;
  rejectionReasons?: string[];
  couldBeFixed?: boolean;
  howToFix?: string | null;
  alternativeUses?: string[];
}

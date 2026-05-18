export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRejectedBySlug } from "@/lib/queries";

const CAT_LABELS: Record<string, string> = {
  legal_risk:          "Legal risk",
  exploit_tool:        "Exploit / cheat tool",
  hardware_dependency: "Hardware dependency",
  research_only:       "Research only",
  already_exists:      "Already a product",
  too_niche:           "Too niche",
  no_license:          "No license",
  complex_setup:       "Complex setup",
};

export default async function RejectedDetailPage({ params }: { params: { slug: string } }) {
  const repo = await getRejectedBySlug(params.slug);
  if (!repo) notFound();

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-600 mb-6">
        <a href="/rejected" className="hover:text-zinc-400 transition-colors">Rejected</a>
        <span className="mx-2">›</span>
        <span className="text-zinc-400">{repo.repoName}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-red-300 bg-red-950/60 ring-1 ring-red-800 px-2.5 py-1 rounded-md font-medium">
            ✕ Rejected
          </span>
          <span className="text-xs text-zinc-400 bg-zinc-900 ring-1 ring-zinc-800 px-2.5 py-1 rounded-md">
            {CAT_LABELS[repo.rejectionCategory ?? ""] ?? repo.rejectionCategory?.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-zinc-500 bg-zinc-900 ring-1 ring-zinc-800 px-2.5 py-1 rounded-md">
            Score {repo.viabilityScore}/10
          </span>
          {repo.couldBeFixed && (
            <span className="text-xs text-amber-300 bg-amber-950/60 ring-1 ring-amber-800 px-2.5 py-1 rounded-md">
              ⚡ Could be fixed
            </span>
          )}
          {repo.isDraft && (
            <span className="text-xs text-amber-400 bg-amber-950/50 ring-1 ring-amber-800 px-2.5 py-1 rounded-md font-medium">
              DRAFT
            </span>
          )}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight mb-2">{repo.repoName}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-zinc-500 mb-2">
          <span>by {repo.owner}</span>
          <span>★ {repo.stars?.toLocaleString()}</span>
          <span>{repo.language}</span>
          <span>License: {repo.licenseSpdx ?? "none"}</span>
        </div>

        <a href={repo.githubUrl} target="_blank" rel="noopener noreferrer"
          className="text-sm text-zinc-600 hover:text-zinc-300 transition-colors">
          {repo.githubUrl} ↗
        </a>
      </div>

      {/* Summary */}
      {repo.summary && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-5">
          <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">What this repo does</div>
          <p className="text-sm text-zinc-300 leading-relaxed">{repo.summary}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Why rejected */}
        <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-5">
          <h2 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-3">
            Why this was rejected
          </h2>
          <ul className="space-y-2">
            {repo.rejectionReasons?.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-red-500 mt-0.5 shrink-0">✕</span>{r}
              </li>
            ))}
          </ul>
        </div>

        {/* License note */}
        {repo.licenseRiskReason && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">License risk</div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-medium ${
                repo.licenseRisk === "Low"  ? "text-emerald-400" :
                repo.licenseRisk === "High" ? "text-red-400" : "text-amber-400"
              }`}>{repo.licenseRisk}</span>
              <span className="text-xs text-zinc-600">· {repo.licenseSpdx}</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{repo.licenseRiskReason}</p>
          </div>
        )}

        {/* Could be fixed */}
        {repo.couldBeFixed && repo.howToFix ? (
          <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-5">
            <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-3">
              How it could be fixed
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">{repo.howToFix}</p>
          </div>
        ) : !repo.couldBeFixed ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-600 uppercase tracking-wider mb-2">
              Can this be fixed?
            </h2>
            <p className="text-sm text-zinc-600">
              No — the core blocker cannot be resolved without fundamentally changing the project.
            </p>
          </div>
        ) : null}

        {/* Alternative uses */}
        {repo.alternativeUses && repo.alternativeUses.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Alternative uses
            </h2>
            <ul className="space-y-2">
              {repo.alternativeUses.map((u, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-zinc-600 mt-0.5 shrink-0">→</span>{u}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRejectedBySlug } from "@/lib/queries";
import { catLabel, formatStars, licenseRiskDetailColorClass, safeText } from "@/lib/format";

export default async function RejectedDetailPage({ params }: { params: { slug: string } }) {
  const repo = await getRejectedBySlug(params.slug);
  if (!repo) notFound();

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="text-xs text-ash mb-8">
        <a href="/rejected" className="hover:text-mute transition-colors">Rejected</a>
        <span className="mx-2 text-stone">›</span>
        <span className="text-mute">{safeText(repo.repoName)}</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-wrap items-center gap-1.5 mb-5">
          <span className="text-xs text-accent-red bg-accent-red/10 ring-1 ring-accent-red/25 px-2 py-0.5 rounded font-medium">
            ✕ Rejected
          </span>
          <span className="text-xs text-mute bg-surface-elevated ring-1 ring-hairline px-2 py-0.5 rounded">
            {catLabel(repo.rejectionCategory)}
          </span>
          <span className="text-xs text-ash bg-surface-elevated ring-1 ring-hairline px-2 py-0.5 rounded">
            Score {repo.viabilityScore ?? 0}/10
          </span>
          {repo.couldBeFixed && (
            <span className="text-xs text-accent-yellow bg-accent-yellow/10 ring-1 ring-accent-yellow/25 px-2 py-0.5 rounded">
              ⚡ Could be fixed
            </span>
          )}
          {repo.isDraft && (
            <span className="text-xs text-accent-yellow bg-accent-yellow/10 ring-1 ring-accent-yellow/25 px-2 py-0.5 rounded font-medium">
              DRAFT
            </span>
          )}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-ink mb-2">{safeText(repo.repoName)}</h1>

        <div className="flex flex-wrap gap-4 text-xs text-ash mb-3">
          <span>by {safeText(repo.owner)}</span>
          <span>★ {formatStars(repo.stars)}</span>
          <span>{safeText(repo.language, "—")}</span>
          <span>License: {safeText(repo.licenseSpdx, "none")}</span>
        </div>

        {repo.githubUrl && (
          <a href={repo.githubUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-ash hover:text-mute transition-colors">
            {repo.githubUrl} ↗
          </a>
        )}
      </div>

      {/* Summary */}
      {repo.summary && (
        <div className="bg-surface border border-hairline rounded-lg p-5 mb-4">
          <div className="text-[10px] text-ash uppercase tracking-widest font-medium mb-2">What this repo does</div>
          <p className="text-sm text-body leading-relaxed">{repo.summary}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Why rejected */}
        <div className="bg-accent-red/5 border border-accent-red/20 rounded-lg p-5">
          <h2 className="text-[10px] font-medium text-accent-red/70 uppercase tracking-widest mb-3">
            Why this was rejected
          </h2>
          {(repo.rejectionReasons?.length ?? 0) > 0 ? (
            <ul className="space-y-2">
              {repo.rejectionReasons!.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-body">
                  <span className="text-accent-red mt-0.5 shrink-0">✕</span>{r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ash">No specific reasons were recorded.</p>
          )}
        </div>

        {/* License note */}
        {repo.licenseRiskReason && (
          <div className="bg-surface border border-hairline rounded-lg p-5">
            <div className="text-[10px] text-ash uppercase tracking-widest font-medium mb-2">License risk</div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-medium ${licenseRiskDetailColorClass(repo.licenseRisk)}`}>
                {safeText(repo.licenseRisk, "Unknown")}
              </span>
              <span className="text-xs text-ash">· {safeText(repo.licenseSpdx, "none")}</span>
            </div>
            <p className="text-sm text-mute leading-relaxed">{repo.licenseRiskReason}</p>
          </div>
        )}

        {/* Could be fixed */}
        {repo.couldBeFixed && repo.howToFix ? (
          <div className="bg-accent-yellow/5 border border-accent-yellow/20 rounded-lg p-5">
            <h2 className="text-[10px] font-medium text-accent-yellow/70 uppercase tracking-widest mb-3">
              How it could be fixed
            </h2>
            <p className="text-sm text-body leading-relaxed">{repo.howToFix}</p>
          </div>
        ) : !repo.couldBeFixed ? (
          <div className="bg-surface border border-hairline rounded-lg p-5">
            <h2 className="text-[10px] font-medium text-ash uppercase tracking-widest mb-2">
              Can this be fixed?
            </h2>
            <p className="text-sm text-ash">
              No — the core blocker cannot be resolved without fundamentally changing the project.
            </p>
          </div>
        ) : null}

        {/* Alternative uses */}
        {repo.alternativeUses && repo.alternativeUses.length > 0 && (
          <div className="bg-surface border border-hairline rounded-lg p-5">
            <h2 className="text-[10px] font-medium text-ash uppercase tracking-widest mb-3">
              Alternative uses
            </h2>
            <ul className="space-y-2">
              {repo.alternativeUses.map((u, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-body">
                  <span className="text-ash mt-0.5 shrink-0">→</span>{u}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

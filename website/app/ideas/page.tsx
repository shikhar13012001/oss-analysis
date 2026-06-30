export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getAllQualified } from "@/lib/queries";
import {
  formatStars,
  licenseRiskColorClass,
  revenueClass,
  revenueLabel,
  safeText,
} from "@/lib/format";

export const metadata: Metadata = { title: "Qualified Ideas" };

export default async function IdeasPage() {
  const ideas = await getAllQualified();

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-ink mb-1.5 tracking-tight">Qualified ideas</h1>
        <p className="text-mute text-sm">
          {ideas.length} repos with a clear path to revenue. All have permissive licenses.
        </p>
      </div>

      {ideas.length === 0 ? (
        <p className="text-ash py-16 text-center">No qualified ideas yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ideas.map((idea) => (
            <Link key={idea._id} href={`/ideas/${idea.slug}`}
              className="bg-surface border border-hairline rounded-lg p-5 hover:border-[rgba(255,255,255,0.16)] transition-colors group flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${revenueClass(idea.revenuePotential)}`}>
                  {revenueLabel(idea.revenuePotential)} potential
                </span>
                <div className="flex items-center gap-1.5">
                  {idea.isDraft && (
                    <span className="text-[10px] bg-accent-yellow/10 text-accent-yellow ring-1 ring-accent-yellow/25 px-1.5 py-0.5 rounded font-medium">DRAFT</span>
                  )}
                  <span className="text-xs text-ash">{idea.viabilityScore ?? 0}/10</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-medium text-ink group-hover:text-white transition-colors mb-1 text-sm">
                  {safeText(idea.productName, idea.repoName)}
                </h2>
                <p className="text-sm text-mute line-clamp-2 leading-relaxed">{safeText(idea.tagline)}</p>
              </div>
              <div className="flex flex-wrap gap-2.5 text-xs text-ash mt-auto">
                <span>★ {formatStars(idea.stars)}</span>
                <span>{safeText(idea.language, "—")}</span>
                {idea.buildTime && <span>{idea.buildTime}</span>}
                <span className={licenseRiskColorClass(idea.licenseRisk)}>
                  {safeText(idea.licenseRisk, "Unknown")} risk
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

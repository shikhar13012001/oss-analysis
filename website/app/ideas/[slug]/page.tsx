export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getQualifiedBySlug } from "@/lib/queries";
import IdeaTabs from "./IdeaTabs";
import { formatStars, revenueClass, safeText } from "@/lib/format";

export default async function IdeaPage({ params }: { params: { slug: string } }) {
  const idea = await getQualifiedBySlug(params.slug);
  if (!idea) notFound();

  const riskClass =
    idea.licenseRisk === "Low"  ? "text-accent-green bg-accent-green/10 ring-accent-green/25" :
    idea.licenseRisk === "High" ? "text-accent-red   bg-accent-red/10   ring-accent-red/25"   :
                                  "text-accent-yellow bg-accent-yellow/10 ring-accent-yellow/25";

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-xs text-ash mb-8">
        <a href="/ideas" className="hover:text-mute transition-colors">Ideas</a>
        <span className="mx-2 text-stone">›</span>
        <span className="text-mute">{safeText(idea.productName, idea.repoName)}</span>
      </nav>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ring-1 ${revenueClass(idea.revenuePotential)}`}>
          {safeText(idea.revenuePotential, "Low")} potential
        </span>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ring-1 ${riskClass}`}>
          {safeText(idea.licenseRisk, "Unknown")} license · {safeText(idea.licenseSpdx, "Unknown")}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated ring-1 ring-hairline text-mute">
          Score {idea.viabilityScore ?? 0}/10
        </span>
        {idea.isDraft && (
          <span className="text-xs px-2 py-0.5 rounded bg-accent-yellow/10 ring-1 ring-accent-yellow/25 text-accent-yellow font-medium">
            DRAFT
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-semibold tracking-tight text-ink mb-2">
        {safeText(idea.productName, idea.repoName)}
      </h1>
      {idea.tagline && (
        <p className="text-lg text-mute mb-5 leading-relaxed">{idea.tagline}</p>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-ash mb-10 pb-10 border-b border-hairline">
        <span>★ {formatStars(idea.stars)}</span>
        <span>{safeText(idea.language, "—")}</span>
        {idea.buildTime && <span>Build: {idea.buildTime}</span>}
        {idea.githubUrl && (
          <a href={idea.githubUrl} target="_blank" rel="noopener noreferrer"
            className="hover:text-mute transition-colors">
            {safeText(idea.owner)}/{safeText(idea.repoName)} ↗
          </a>
        )}
      </div>

      {/* Tabs */}
      <IdeaTabs idea={idea} />
    </div>
  );
}

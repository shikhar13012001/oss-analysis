export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getQualifiedBySlug } from "@/lib/queries";
import IdeaTabs from "./IdeaTabs";

export default async function IdeaPage({ params }: { params: { slug: string } }) {
  const idea = await getQualifiedBySlug(params.slug);
  if (!idea) notFound();

  const RISK_CLASS =
    idea.licenseRisk === "Low"  ? "text-emerald-400 bg-emerald-950/60 ring-emerald-800" :
    idea.licenseRisk === "High" ? "text-red-400     bg-red-950/60     ring-red-800"     :
                                  "text-amber-400   bg-amber-950/60   ring-amber-800";

  const REVENUE_CLASS =
    idea.revenuePotential === "High"   ? "text-emerald-300 bg-emerald-900/60 ring-emerald-800" :
    idea.revenuePotential === "Medium" ? "text-amber-300   bg-amber-900/60   ring-amber-800"   :
                                         "text-zinc-400    bg-zinc-800        ring-zinc-700";

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-600 mb-6">
        <a href="/ideas" className="hover:text-zinc-400 transition-colors">Ideas</a>
        <span className="mx-2">›</span>
        <span className="text-zinc-400">{idea.productName}</span>
      </nav>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`text-xs px-2.5 py-1 rounded-md font-medium ring-1 ${REVENUE_CLASS}`}>
          {idea.revenuePotential} revenue potential
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-md font-medium ring-1 ${RISK_CLASS}`}>
          {idea.licenseRisk} license risk · {idea.licenseSpdx}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-900 ring-1 ring-zinc-800 text-zinc-400">
          Score {idea.viabilityScore}/10
        </span>
        {idea.isDraft && (
          <span className="text-xs px-2.5 py-1 rounded-md bg-amber-950/60 ring-1 ring-amber-800 text-amber-400 font-medium">
            DRAFT — not yet reviewed
          </span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{idea.productName}</h1>
      <p className="text-xl text-zinc-400 mb-4">{idea.tagline}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 mb-8">
        <span>★ {idea.stars?.toLocaleString()}</span>
        <span>{idea.language}</span>
        {idea.buildTime && <span>Build: {idea.buildTime}</span>}
        <a href={idea.githubUrl} target="_blank" rel="noopener noreferrer"
          className="hover:text-zinc-300 transition-colors">
          {idea.owner}/{idea.repoName} ↗
        </a>
      </div>

      {/* Tabs */}
      <IdeaTabs idea={idea} />
    </div>
  );
}

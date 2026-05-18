export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getAllQualified } from "@/lib/queries";
import type { RepoAnalysis } from "@/lib/types";

export const metadata: Metadata = { title: "Qualified Ideas" };

const REVENUE_PILL: Record<string, string> = {
  High:   "bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-800",
  Medium: "bg-amber-900/60   text-amber-300   ring-1 ring-amber-800",
  Low:    "bg-zinc-800       text-zinc-400    ring-1 ring-zinc-700",
};

export default async function IdeasPage() {
  const ideas = await getAllQualified();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Qualified ideas</h1>
        <p className="text-zinc-500 text-sm">
          {ideas.length} repos with a clear path to revenue. All have permissive licenses.
        </p>
      </div>

      {ideas.length === 0 ? (
        <p className="text-zinc-600 py-16 text-center">No qualified ideas yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <Link key={idea._id} href={`/ideas/${idea.slug}`}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-all group flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${REVENUE_PILL[idea.revenuePotential ?? "Low"]}`}>
                  {idea.revenuePotential} potential
                </span>
                <div className="flex items-center gap-1.5">
                  {idea.isDraft && (
                    <span className="text-[10px] bg-amber-900/50 text-amber-400 ring-1 ring-amber-800 px-1.5 py-0.5 rounded font-medium">DRAFT</span>
                  )}
                  <span className="text-xs text-zinc-600">{idea.viabilityScore}/10</span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-medium text-zinc-100 group-hover:text-white transition-colors mb-1">
                  {idea.productName}
                </h2>
                <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{idea.tagline}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
                <span>★ {idea.stars?.toLocaleString()}</span>
                <span>{idea.language}</span>
                <span>{idea.buildTime}</span>
                <span className={
                  idea.licenseRisk === "Low" ? "text-emerald-600" :
                  idea.licenseRisk === "High" ? "text-red-600" : "text-amber-600"
                }>{idea.licenseRisk} license risk</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

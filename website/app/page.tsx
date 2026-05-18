export const dynamic = "force-dynamic";

import Link from "next/link";
import { getStats, getLatestQualified, getLatestRejected } from "@/lib/queries";
import type { RepoAnalysis } from "@/lib/types";

const REVENUE_PILL: Record<string, string> = {
  High:   "bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-800",
  Medium: "bg-amber-900/60   text-amber-300   ring-1 ring-amber-800",
  Low:    "bg-zinc-800       text-zinc-400    ring-1 ring-zinc-700",
};

const CAT_PILL: Record<string, string> = {
  legal_risk:          "bg-red-900/50    text-red-300    ring-1 ring-red-800",
  exploit_tool:        "bg-red-900/50    text-red-300    ring-1 ring-red-800",
  hardware_dependency: "bg-orange-900/50 text-orange-300 ring-1 ring-orange-800",
  research_only:       "bg-blue-900/50   text-blue-300   ring-1 ring-blue-800",
  already_exists:      "bg-purple-900/50 text-purple-300 ring-1 ring-purple-800",
  no_license:          "bg-red-900/50    text-red-300    ring-1 ring-red-800",
};

function DraftBadge() {
  return (
    <span className="text-[10px] font-medium bg-amber-900/50 text-amber-400 ring-1 ring-amber-800 px-1.5 py-0.5 rounded">
      DRAFT
    </span>
  );
}

function QualifiedCard({ idea }: { idea: RepoAnalysis }) {
  return (
    <Link href={`/ideas/${idea.slug}`}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-all group flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${REVENUE_PILL[idea.revenuePotential ?? "Low"]}`}>
          {idea.revenuePotential} potential
        </span>
        <div className="flex items-center gap-1.5">
          {idea.isDraft && <DraftBadge />}
          <span className="text-xs text-zinc-600">{idea.viabilityScore}/10</span>
        </div>
      </div>
      <div>
        <h3 className="font-medium text-zinc-100 group-hover:text-white transition-colors mb-0.5">
          {idea.productName}
        </h3>
        <p className="text-sm text-zinc-400 line-clamp-2">{idea.tagline}</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-600 mt-auto">
        <span>★ {idea.stars?.toLocaleString()}</span>
        <span>{idea.language}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${
          idea.licenseRisk === "Low" ? "text-emerald-500" :
          idea.licenseRisk === "High" ? "text-red-500" : "text-amber-500"
        }`}>{idea.licenseRisk} risk</span>
      </div>
    </Link>
  );
}

function RejectedRow({ r }: { r: RepoAnalysis }) {
  return (
    <Link href={`/rejected/${r.slug}`}
      className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 hover:border-zinc-600 transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${CAT_PILL[r.rejectionCategory ?? ""] ?? "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700"}`}>
          {r.rejectionCategory?.replace(/_/g, " ")}
        </span>
        <div className="min-w-0">
          <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
            {r.repoName}
          </span>
          <span className="text-zinc-600 text-xs ml-1.5">by {r.owner}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {r.isDraft && <DraftBadge />}
        <span className="text-xs text-zinc-600">
          {r.couldBeFixed ? "⚡ fixable" : "✕ dead end"}
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [stats, qualified, rejected] = await Promise.all([
    getStats(),
    getLatestQualified(6),
    getLatestRejected(6),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="py-14 max-w-xl">
        <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 ring-1 ring-emerald-800 rounded-full px-3 py-1 mb-6">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Localhost build — showing drafts
        </div>
        <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
          Every trending OSS repo,<br />
          <span className="text-zinc-500">validated for revenue.</span>
        </h1>
        <p className="text-zinc-400 leading-relaxed mb-8">
          Hermes analyses open-source repos for license risk, buyer fit, and monetisation
          potential. Qualified ideas get a full product breakdown. Rejected ones explain
          exactly why.
        </p>
        <div className="flex gap-3">
          <Link href="/ideas"
            className="bg-white text-zinc-950 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors">
            Browse ideas →
          </Link>
          <Link href="/rejected"
            className="border border-zinc-700 px-5 py-2.5 rounded-lg text-sm text-zinc-300 hover:border-zinc-500 transition-colors">
            See rejected
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3 mb-14 max-w-sm">
        {[
          { label: "Analysed",  value: stats?.total     ?? 0 },
          { label: "Qualified", value: stats?.qualified ?? 0 },
          { label: "Rejected",  value: stats?.rejected  ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-zinc-600 mt-0.5">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Latest qualified */}
      {qualified.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium">Latest qualified ideas</h2>
            <Link href="/ideas" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {qualified.map((idea) => <QualifiedCard key={idea._id} idea={idea} />)}
          </div>
        </section>
      )}

      {/* Latest rejected */}
      {rejected.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium">Recently rejected</h2>
            <Link href="/rejected" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">View all →</Link>
          </div>
          <div className="flex flex-col gap-2">
            {rejected.map((r) => <RejectedRow key={r._id} r={r} />)}
          </div>
        </section>
      )}

      {qualified.length === 0 && rejected.length === 0 && (
        <div className="py-20 text-center text-zinc-600">
          <p className="text-lg mb-2">No analyses yet.</p>
          <p className="text-sm">Run the Telegram channel listener or post a GitHub URL through the bot to get started.</p>
        </div>
      )}
    </div>
  );
}

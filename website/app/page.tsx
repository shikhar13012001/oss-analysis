export const dynamic = "force-dynamic";

import Link from "next/link";
import { getStats, getLatestQualified, getLatestRejected } from "@/lib/queries";
import type { RepoAnalysis } from "@/lib/types";
import {
  catLabelShort,
  catPillClass,
  formatStars,
  licenseRiskColorClass,
  revenueClass,
  revenueLabel,
  safeText,
} from "@/lib/format";

function DraftBadge() {
  return (
    <span className="text-[10px] font-medium bg-[rgba(255,197,51,0.12)] text-accent-yellow ring-1 ring-accent-yellow/25 px-1.5 py-0.5 rounded">
      DRAFT
    </span>
  );
}

function QualifiedCard({ idea }: { idea: RepoAnalysis }) {
  return (
    <Link href={`/ideas/${idea.slug}`}
      className="bg-surface border border-hairline rounded-lg p-5 hover:border-[rgba(255,255,255,0.16)] transition-colors group flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${revenueClass(idea.revenuePotential)}`}>
          {revenueLabel(idea.revenuePotential)} potential
        </span>
        <div className="flex items-center gap-1.5">
          {idea.isDraft && <DraftBadge />}
          <span className="text-xs text-ash">{idea.viabilityScore ?? 0}/10</span>
        </div>
      </div>
      <div>
        <h3 className="font-medium text-ink group-hover:text-white transition-colors mb-0.5 text-sm">
          {safeText(idea.productName, idea.repoName)}
        </h3>
        <p className="text-sm text-mute line-clamp-2 leading-relaxed">{safeText(idea.tagline)}</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-ash mt-auto">
        <span>★ {formatStars(idea.stars)}</span>
        <span>{safeText(idea.language, "—")}</span>
        <span className={`text-xs ${licenseRiskColorClass(idea.licenseRisk)}`}>
          {safeText(idea.licenseRisk, "Unknown")} risk
        </span>
      </div>
    </Link>
  );
}

function RejectedRow({ r }: { r: RepoAnalysis }) {
  return (
    <Link href={`/rejected/${r.slug}`}
      className="bg-surface border border-hairline rounded-lg px-4 py-3 flex items-center justify-between gap-4 hover:border-[rgba(255,255,255,0.16)] transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${catPillClass(r.rejectionCategory)}`}>
          {catLabelShort(r.rejectionCategory)}
        </span>
        <div className="min-w-0">
          <span className="text-sm font-medium text-body group-hover:text-ink transition-colors">
            {safeText(r.repoName)}
          </span>
          <span className="text-mute text-xs ml-1.5">by {safeText(r.owner)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {r.isDraft && <DraftBadge />}
        <span className="text-xs text-ash">
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
      {/* Hero — with diagonal red stripe motif */}
      <section className="py-16 max-w-xl relative -mx-6 px-6 overflow-hidden">
        <div className="hero-stripe absolute inset-0 pointer-events-none" aria-hidden />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs text-accent-green bg-accent-green/10 ring-1 ring-accent-green/25 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse" />
            Live analysis pipeline
          </div>
          <h1 className="text-4xl font-semibold tracking-tight leading-[1.1] mb-4 text-ink">
            Every trending OSS repo,<br />
            <span className="text-ash">validated for revenue.</span>
          </h1>
          <p className="text-body leading-relaxed mb-8 text-[15px]">
            Hermes analyses open-source repos for license risk, buyer fit, and monetisation
            potential. Qualified ideas get a full product breakdown. Rejected ones explain
            exactly why.
          </p>
          <div className="flex gap-3">
            <Link href="/ideas"
              className="bg-white text-black px-5 py-2.5 rounded-md text-sm font-medium hover:bg-[#e8e8e8] transition-colors">
              Browse ideas →
            </Link>
            <Link href="/rejected"
              className="border border-hairline px-5 py-2.5 rounded-md text-sm text-mute hover:text-ink hover:border-[rgba(255,255,255,0.16)] transition-colors">
              See rejected
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-3 mb-14 max-w-xs">
        {[
          { label: "Analysed",  value: stats?.total     ?? 0 },
          { label: "Qualified", value: stats?.qualified ?? 0 },
          { label: "Rejected",  value: stats?.rejected  ?? 0 },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-hairline rounded-lg p-4 text-center">
            <div className="text-2xl font-semibold text-ink">{s.value}</div>
            <div className="text-xs text-ash mt-0.5">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Latest qualified */}
      {qualified.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink">Latest qualified ideas</h2>
            <Link href="/ideas" className="text-xs text-ash hover:text-mute transition-colors">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {qualified.map((idea) => <QualifiedCard key={idea._id} idea={idea} />)}
          </div>
        </section>
      )}

      {/* Latest rejected */}
      {rejected.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink">Recently rejected</h2>
            <Link href="/rejected" className="text-xs text-ash hover:text-mute transition-colors">View all →</Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {rejected.map((r) => <RejectedRow key={r._id} r={r} />)}
          </div>
        </section>
      )}

      {qualified.length === 0 && rejected.length === 0 && (
        <div className="py-20 text-center text-ash">
          <p className="text-lg mb-2 text-mute">No analyses yet.</p>
          <p className="text-sm">Run the Telegram channel listener or post a GitHub URL through the bot to get started.</p>
        </div>
      )}
    </div>
  );
}

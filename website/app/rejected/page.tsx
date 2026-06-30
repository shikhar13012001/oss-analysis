export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getAllRejected } from "@/lib/queries";
import { catLabel, catStyleClass, safeText } from "@/lib/format";

export const metadata: Metadata = { title: "Rejected Repos" };

export default async function RejectedPage() {
  const repos = await getAllRejected();

  const grouped = repos.reduce<Record<string, typeof repos>>((acc, r) => {
    const cat = r.rejectionCategory ?? "unknown";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-ink mb-1.5 tracking-tight">Rejected repos</h1>
        <p className="text-mute text-sm">
          {repos.length} repos that won&apos;t work — and exactly why. The rejection analysis is often more useful than the qualified list.
        </p>
      </div>

      {repos.length === 0 ? (
        <p className="text-ash py-16 text-center">No rejected repos yet.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ring-1 ${catStyleClass(cat)}`}>
                  {catLabel(cat)}
                </span>
                <span className="text-xs text-ash">{items.length} repo{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {items.map((r) => (
                  <Link key={r._id} href={`/rejected/${r.slug}`}
                    className="bg-surface border border-hairline rounded-lg px-4 py-3 flex items-center justify-between gap-4 hover:border-[rgba(255,255,255,0.16)] transition-colors group">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-body group-hover:text-ink transition-colors">
                        {safeText(r.repoName)}
                      </span>
                      <span className="text-ash text-xs ml-1.5">by {safeText(r.owner)}</span>
                      {r.rejectionReasons?.[0] && (
                        <p className="text-xs text-ash mt-0.5 truncate">{r.rejectionReasons[0]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.isDraft && (
                        <span className="text-[10px] bg-accent-yellow/10 text-accent-yellow ring-1 ring-accent-yellow/25 px-1.5 py-0.5 rounded font-medium">DRAFT</span>
                      )}
                      <span className="text-xs text-ash">
                        {r.couldBeFixed ? "⚡ fixable" : "✕"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

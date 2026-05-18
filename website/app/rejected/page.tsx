export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getAllRejected } from "@/lib/queries";

export const metadata: Metadata = { title: "Rejected Repos" };

const CAT_STYLE: Record<string, string> = {
  legal_risk:          "text-red-300    bg-red-900/40    ring-red-800/60",
  exploit_tool:        "text-red-300    bg-red-900/40    ring-red-800/60",
  hardware_dependency: "text-orange-300 bg-orange-900/40 ring-orange-800/60",
  research_only:       "text-blue-300   bg-blue-900/40   ring-blue-800/60",
  already_exists:      "text-purple-300 bg-purple-900/40 ring-purple-800/60",
  too_niche:           "text-zinc-400   bg-zinc-800      ring-zinc-700",
  no_license:          "text-red-300    bg-red-900/40    ring-red-800/60",
  complex_setup:       "text-zinc-400   bg-zinc-800      ring-zinc-700",
};

const CAT_LABELS: Record<string, string> = {
  legal_risk:          "Legal risk",
  exploit_tool:        "Exploit tool",
  hardware_dependency: "Hardware only",
  research_only:       "Research only",
  already_exists:      "Already a product",
  too_niche:           "Too niche",
  no_license:          "No license",
  complex_setup:       "Complex setup",
};

export default async function RejectedPage() {
  const repos = await getAllRejected();

  // Group by category
  const grouped = repos.reduce<Record<string, typeof repos>>((acc, r) => {
    const cat = r.rejectionCategory ?? "unknown";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Rejected repos</h1>
        <p className="text-zinc-500 text-sm">
          {repos.length} repos that won't work — and exactly why. The rejection analysis is often more useful than the qualified list.
        </p>
      </div>

      {repos.length === 0 ? (
        <p className="text-zinc-600 py-16 text-center">No rejected repos yet.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-md font-medium ring-1 ${CAT_STYLE[cat] ?? "text-zinc-400 bg-zinc-800 ring-zinc-700"}`}>
                  {CAT_LABELS[cat] ?? cat.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-zinc-600">{items.length} repo{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((r) => (
                  <Link key={r._id} href={`/rejected/${r.slug}`}
                    className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-5 py-3.5 flex items-center justify-between gap-4 hover:border-zinc-600 transition-all group">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                        {r.repoName}
                      </span>
                      <span className="text-zinc-600 text-xs ml-1.5">by {r.owner}</span>
                      {r.rejectionReasons?.[0] && (
                        <p className="text-xs text-zinc-600 mt-0.5 truncate">{r.rejectionReasons[0]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.isDraft && (
                        <span className="text-[10px] bg-amber-900/50 text-amber-400 ring-1 ring-amber-800 px-1.5 py-0.5 rounded font-medium">DRAFT</span>
                      )}
                      <span className="text-xs text-zinc-600">
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

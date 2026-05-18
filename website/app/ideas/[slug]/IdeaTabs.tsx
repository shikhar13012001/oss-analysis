"use client";

import { useState } from "react";
import type { RepoAnalysis } from "@/lib/types";

type Tab = "product" | "buyer" | "business" | "roadmap" | "prereqs";

const TABS: { id: Tab; label: string }[] = [
  { id: "product",  label: "Product"        },
  { id: "buyer",    label: "Buyer intel"    },
  { id: "business", label: "Business model" },
  { id: "roadmap",  label: "Roadmap"        },
  { id: "prereqs",  label: "Prerequisites"  },
];

const PHASE_STYLE = [
  "border-blue-800/60   bg-blue-950/30   text-blue-200",
  "border-emerald-800/60 bg-emerald-950/30 text-emerald-200",
  "border-amber-800/60  bg-amber-950/30  text-amber-200",
  "border-pink-800/60   bg-pink-950/30   text-pink-200",
];

function Chip({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">{label}</div>
      <p className={`text-sm text-zinc-300 leading-relaxed ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded-full">
      {text}
    </span>
  );
}

export default function IdeaTabs({ idea }: { idea: RepoAnalysis }) {
  const [tab, setTab] = useState<Tab>("product");
  const bm = idea.businessModel;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-w-fit ${
              tab === t.id
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Product tab */}
      {tab === "product" && (
        <div className="space-y-5">
          <p className="text-zinc-300 leading-relaxed">{idea.productDescription}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <Chip label="Tech stack"         value={idea.techStack} />
            <Chip label="BYOK model"         value={idea.byokModel ?? "Not required"} />
            <Chip label="Freemium model"     value={idea.freemiumModel} />
            <Chip label="Deployment complexity" value={`${idea.deploymentComplexity} — ${idea.deploymentComplexityReason}`} />
          </div>

          {idea.seoKeywords && idea.seoKeywords.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">SEO keywords</div>
              <div className="flex flex-wrap gap-2">
                {idea.seoKeywords.map((kw) => <Tag key={kw} text={kw} />)}
              </div>
            </div>
          )}

          {idea.viabilityReasons && idea.viabilityReasons.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3">Why it qualifies</div>
              <ul className="space-y-2">
                {idea.viabilityReasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Buyer intel tab */}
      {tab === "buyer" && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Specific buyer</div>
            <p className="text-zinc-200 font-medium">{idea.specificBuyer}</p>
          </div>

          <Chip label="What they do today (the pain)" value={idea.buyerWorkflow} />
          <Chip label="Why they pay (the outcome)"    value={idea.whyTheyPay} />
          <Chip label="Competitor landscape"          value={idea.competitorCheck} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-500 leading-relaxed">
            <span className="text-zinc-400 font-medium">Summary:</span>{" "}
            {idea.summary}
          </div>
        </div>
      )}

      {/* Business model tab */}
      {tab === "business" && bm && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">Free tier</div>
              <p className="text-sm text-zinc-300 leading-relaxed">{bm.freeTier}</p>
            </div>
            <div className="bg-zinc-900 border border-emerald-900/50 rounded-xl p-5">
              <div className="text-xs text-emerald-600 uppercase tracking-wider font-medium mb-2">Pro tier</div>
              <p className="text-sm text-zinc-300 leading-relaxed">{bm.proTier}</p>
              <p className="text-emerald-400 font-semibold mt-3">{bm.pricing}</p>
            </div>
          </div>

          {bm.monetisationMethods && bm.monetisationMethods.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-3">Monetisation methods</div>
              <ul className="space-y-2">
                {bm.monetisationMethods.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className="text-amber-500 mt-0.5 shrink-0">→</span>{m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Roadmap tab */}
      {tab === "roadmap" && (
        <div className="space-y-3">
          {(idea.revenueRoadmap ?? []).map((phase, i) => (
            <div key={phase._key ?? i}
              className={`border rounded-xl p-5 ${PHASE_STYLE[i] ?? PHASE_STYLE[0]}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs opacity-50 font-medium">{phase.phase}</span>
                  <h3 className="font-semibold text-lg leading-tight">{phase.title}</h3>
                </div>
                <span className="text-xs opacity-50 bg-black/20 px-3 py-1 rounded-full shrink-0">
                  {phase.duration}
                </span>
              </div>
              <ul className="space-y-2">
                {phase.actions?.map((action, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm opacity-75">
                    <span className="opacity-40 shrink-0 mt-0.5">›</span>{action}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Prerequisites tab */}
      {tab === "prereqs" && (
        <div className="space-y-3">
          {(idea.prerequisites ?? []).map((p, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-start gap-3">
              <span className="text-zinc-600 font-mono text-sm shrink-0 mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

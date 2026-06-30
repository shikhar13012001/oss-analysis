"use client";

import { useState } from "react";
import type { RepoAnalysis } from "@/lib/types";
import { safeText } from "@/lib/format";

type Tab = "product" | "buyer" | "business" | "roadmap" | "prereqs";

const TABS: { id: Tab; label: string }[] = [
  { id: "product",  label: "Product"        },
  { id: "buyer",    label: "Buyer intel"    },
  { id: "business", label: "Business model" },
  { id: "roadmap",  label: "Roadmap"        },
  { id: "prereqs",  label: "Prerequisites"  },
];

const PHASE_STYLE = [
  "border-accent-blue/20   bg-accent-blue/5   text-blue-200",
  "border-accent-green/20  bg-accent-green/5  text-green-200",
  "border-accent-yellow/20 bg-accent-yellow/5 text-yellow-200",
  "border-accent-red/20    bg-accent-red/5    text-red-200",
];

function InfoCard({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="bg-surface border border-hairline rounded-lg p-4">
      <div className="text-[10px] text-ash uppercase tracking-widest font-medium mb-2">{label}</div>
      <p className={`text-sm text-body leading-relaxed ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <span className="text-xs bg-surface-elevated border border-hairline text-mute px-2.5 py-1 rounded-full">
      {text}
    </span>
  );
}

export default function IdeaTabs({ idea }: { idea: RepoAnalysis }) {
  const [tab, setTab] = useState<Tab>("product");
  const bm = idea.businessModel;

  return (
    <div>
      {/* Pill-tab bar */}
      <div className="flex gap-1 bg-surface border border-hairline rounded-xl p-1 mb-8 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-w-fit ${
              tab === t.id
                ? "bg-surface-elevated text-ink"
                : "text-mute hover:text-body"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Product tab */}
      {tab === "product" && (
        <div className="space-y-5">
          {idea.productDescription && (
            <p className="text-body leading-relaxed text-[15px]">{idea.productDescription}</p>
          )}

          <div className="grid sm:grid-cols-2 gap-2.5">
            <InfoCard label="Tech stack"           value={idea.techStack} />
            <InfoCard label="BYOK model"           value={idea.byokModel ?? "Not required"} />
            <InfoCard label="Freemium model"       value={idea.freemiumModel} />
            <InfoCard
              label="Deployment complexity"
              value={
                idea.deploymentComplexity
                  ? `${idea.deploymentComplexity} — ${safeText(idea.deploymentComplexityReason)}`
                  : undefined
              }
            />
          </div>

          {idea.seoKeywords && idea.seoKeywords.length > 0 && (
            <div>
              <div className="text-[10px] text-ash uppercase tracking-widest font-medium mb-2.5">SEO keywords</div>
              <div className="flex flex-wrap gap-2">
                {idea.seoKeywords.map((kw) => <Tag key={kw} text={kw} />)}
              </div>
            </div>
          )}

          {idea.viabilityReasons && idea.viabilityReasons.length > 0 && (
            <div>
              <div className="text-[10px] text-ash uppercase tracking-widest font-medium mb-3">Why it qualifies</div>
              <ul className="space-y-2">
                {idea.viabilityReasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-body">
                    <span className="text-accent-green mt-0.5 shrink-0">✓</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Buyer intel tab */}
      {tab === "buyer" && (
        <div className="space-y-3">
          <div className="bg-surface border border-hairline rounded-lg p-5">
            <div className="text-[10px] text-ash uppercase tracking-widest font-medium mb-2">Specific buyer</div>
            <p className="text-body font-medium">{safeText(idea.specificBuyer, "—")}</p>
          </div>

          <InfoCard label="What they do today (the pain)" value={idea.buyerWorkflow} />
          <InfoCard label="Why they pay (the outcome)"    value={idea.whyTheyPay} />
          <InfoCard label="Competitor landscape"          value={idea.competitorCheck} />

          {idea.summary && (
            <div className="bg-surface border border-hairline rounded-lg p-5 text-sm text-ash leading-relaxed">
              <span className="text-mute font-medium">Summary: </span>
              {idea.summary}
            </div>
          )}
        </div>
      )}

      {/* Business model tab */}
      {tab === "business" && bm && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-surface border border-hairline rounded-lg p-5">
              <div className="text-[10px] text-ash uppercase tracking-widest font-medium mb-2">Free tier</div>
              <p className="text-sm text-body leading-relaxed">{safeText(bm.freeTier, "—")}</p>
            </div>
            <div className="bg-surface border border-accent-green/20 rounded-lg p-5">
              <div className="text-[10px] text-accent-green/70 uppercase tracking-widest font-medium mb-2">Pro tier</div>
              <p className="text-sm text-body leading-relaxed">{safeText(bm.proTier, "—")}</p>
              <p className="text-accent-green font-semibold mt-3 text-sm">{safeText(bm.pricing)}</p>
            </div>
          </div>

          {bm.monetisationMethods && bm.monetisationMethods.length > 0 && (
            <div className="bg-surface border border-hairline rounded-lg p-5">
              <div className="text-[10px] text-ash uppercase tracking-widest font-medium mb-3">Monetisation methods</div>
              <ul className="space-y-2">
                {bm.monetisationMethods.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-body">
                    <span className="text-accent-yellow mt-0.5 shrink-0">→</span>{m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Roadmap tab */}
      {tab === "roadmap" && (
        <div className="space-y-2.5">
          {(idea.revenueRoadmap ?? []).length === 0 ? (
            <p className="text-sm text-ash">No roadmap provided.</p>
          ) : (
            (idea.revenueRoadmap ?? []).map((phase, i) => (
              <div key={phase._key ?? i}
                className={`border rounded-lg p-5 ${PHASE_STYLE[i] ?? PHASE_STYLE[0]}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] opacity-50 font-medium uppercase tracking-widest">{safeText(phase.phase)}</span>
                    <h3 className="font-semibold text-base leading-tight mt-0.5">{safeText(phase.title, "Untitled phase")}</h3>
                  </div>
                  <span className="text-xs opacity-50 bg-black/20 px-3 py-1 rounded-full shrink-0">
                    {safeText(phase.duration)}
                  </span>
                </div>
                {(phase.actions?.length ?? 0) > 0 ? (
                  <ul className="space-y-1.5">
                    {phase.actions!.map((action, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm opacity-75">
                        <span className="opacity-40 shrink-0 mt-0.5">›</span>{action}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}

      {/* Prerequisites tab */}
      {tab === "prereqs" && (
        <div className="space-y-2">
          {(idea.prerequisites ?? []).length === 0 ? (
            <p className="text-sm text-ash">No prerequisites recorded.</p>
          ) : (
            (idea.prerequisites ?? []).map((p, i) => (
              <div key={i} className="bg-surface border border-hairline rounded-lg px-5 py-4 flex items-start gap-3">
                <span className="text-ash font-mono text-xs shrink-0 mt-0.5 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-body leading-relaxed">{p}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

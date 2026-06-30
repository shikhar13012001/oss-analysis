/**
 * Shared UI formatting helpers for the Hermes website.
 *
 * Centralises the pill colour maps and category labels that were previously
 * duplicated across the pages. Uses the Raycast-style design tokens defined in
 * tailwind.config.js (canvas/surface/surface-elevated/hairline, ink/body/mute/
 * ash/stone, accent-green/red/yellow/blue). Also provides null-safe text
 * helpers so the UI never renders the literal string "undefined".
 */

import type { LicenseRisk, RejectionCategory, RevenuePotential } from "./types";

// ── Safe text ───────────────────────────────────────────────────────────────

/** Return a fallback when a value is missing, so React never renders "undefined". */
export function safeText(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  const str = String(value);
  return str.trim() === "" ? fallback : str;
}

/** Format a star count with a thousands separator; 0 is shown as "0". */
export function formatStars(stars: number | undefined | null): string {
  if (stars === null || stars === undefined) return "0";
  return stars.toLocaleString();
}

// ── Revenue potential pill ─────────────────────────────────────────────────

// Uses the accent scale: green = High, yellow = Medium, neutral surface = Low.
export const REVENUE_PILL: Record<RevenuePotential, string> = {
  High: "bg-accent-green/10 text-accent-green ring-1 ring-accent-green/25",
  Medium: "bg-accent-yellow/10 text-accent-yellow ring-1 ring-accent-yellow/25",
  Low: "bg-surface-elevated text-mute ring-1 ring-hairline",
};

export function revenueClass(potential: RevenuePotential | undefined): string {
  return REVENUE_PILL[potential ?? "Low"] ?? REVENUE_PILL.Low;
}

/** Human label for revenue potential, never undefined. */
export function revenueLabel(potential: RevenuePotential | undefined): string {
  return safeText(potential, "Low");
}

// ── License risk colour ─────────────────────────────────────────────────────

/** Compact inline colour used in card meta rows (text only). */
export function licenseRiskColorClass(risk: LicenseRisk | string | undefined): string {
  if (risk === "Low") return "text-accent-green";
  if (risk === "High") return "text-accent-red";
  return "text-accent-yellow";
}

/** Slightly stronger colour used in the rejected detail panel. */
export function licenseRiskDetailColorClass(risk: LicenseRisk | string | undefined): string {
  if (risk === "Low") return "text-accent-green";
  if (risk === "High") return "text-accent-red";
  return "text-accent-yellow";
}

// ── Rejection category ──────────────────────────────────────────────────────

// Compact pill (used in home-page rejected rows).
export const CAT_PILL: Record<RejectionCategory, string> = {
  legal_risk: "bg-accent-red/10 text-accent-red ring-1 ring-accent-red/25",
  exploit_tool: "bg-accent-red/10 text-accent-red ring-1 ring-accent-red/25",
  hardware_dependency: "bg-accent-yellow/10 text-accent-yellow ring-1 ring-accent-yellow/25",
  research_only: "bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/25",
  already_exists: "bg-accent-yellow/10 text-accent-yellow ring-1 ring-accent-yellow/25",
  too_niche: "bg-surface-elevated text-mute ring-1 ring-hairline",
  no_license: "bg-accent-red/10 text-accent-red ring-1 ring-accent-red/25",
  complex_setup: "bg-surface-elevated text-mute ring-1 ring-hairline",
};

// Group-header style (used on the rejected list page). Same accent mapping,
// expressed as text/bg/ring triplet without an explicit ring width.
export const CAT_STYLE: Record<RejectionCategory, string> = {
  legal_risk: "text-accent-red bg-accent-red/10 ring-accent-red/25",
  exploit_tool: "text-accent-red bg-accent-red/10 ring-accent-red/25",
  hardware_dependency: "text-accent-yellow bg-accent-yellow/10 ring-accent-yellow/25",
  research_only: "text-accent-blue bg-accent-blue/10 ring-accent-blue/25",
  already_exists: "text-accent-yellow bg-accent-yellow/10 ring-accent-yellow/25",
  too_niche: "text-mute bg-surface-elevated ring-hairline",
  no_license: "text-accent-red bg-accent-red/10 ring-accent-red/25",
  complex_setup: "text-mute bg-surface-elevated ring-hairline",
};

export const CAT_LABELS: Record<RejectionCategory, string> = {
  legal_risk: "Legal risk",
  exploit_tool: "Exploit / cheat tool",
  hardware_dependency: "Hardware dependency",
  research_only: "Research only",
  already_exists: "Already a product",
  too_niche: "Too niche",
  no_license: "No license",
  complex_setup: "Complex setup",
};

const DEFAULT_CAT_PILL = "bg-surface-elevated text-mute ring-1 ring-hairline";
const DEFAULT_CAT_STYLE = "text-mute bg-surface-elevated ring-hairline";

export function catPillClass(cat: string | undefined): string {
  if (!cat) return DEFAULT_CAT_PILL;
  return CAT_PILL[cat as RejectionCategory] ?? DEFAULT_CAT_PILL;
}

export function catStyleClass(cat: string | undefined): string {
  if (!cat) return DEFAULT_CAT_STYLE;
  return CAT_STYLE[cat as RejectionCategory] ?? DEFAULT_CAT_STYLE;
}

export function catLabel(cat: string | undefined): string {
  if (!cat) return "Unknown";
  return CAT_LABELS[cat as RejectionCategory] ?? cat.replace(/_/g, " ");
}

/** Pretty label for a category used inside compact rows (shorter wording). */
export function catLabelShort(cat: string | undefined): string {
  if (!cat) return "Unknown";
  const short: Record<string, string> = {
    hardware_dependency: "Hardware only",
    exploit_tool: "Exploit tool",
    already_exists: "Already a product",
  };
  return short[cat] ?? catLabel(cat);
}
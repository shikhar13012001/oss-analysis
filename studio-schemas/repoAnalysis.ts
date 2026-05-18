import { defineType, defineField, defineArrayMember } from "sanity";

export const repoAnalysis = defineType({
  name: "repoAnalysis",
  title: "Repo Analysis",
  type: "document",

  preview: {
    select: {
      title: "repoName",
      subtitle: "status",
      score: "viabilityScore",
    },
    prepare({ title, subtitle, score }) {
      const icon = subtitle === "qualified" ? "✅" : "❌";
      return { title: `${icon} ${title}`, subtitle: `${subtitle} · score ${score ?? "?"}` };
    },
  },

  groups: [
    { name: "core",     title: "Core",          default: true },
    { name: "product",  title: "Product"                      },
    { name: "business", title: "Business model"               },
    { name: "roadmap",  title: "Revenue roadmap"              },
    { name: "rejection",title: "Rejection"                    },
  ],

  fields: [
    // ── Core ───────────────────────────────────────────────────────
    defineField({
      name: "githubUrl", title: "GitHub URL", type: "url",
      group: "core", validation: (R) => R.required(),
    }),
    defineField({ name: "owner",    title: "Owner",    type: "string", group: "core" }),
    defineField({ name: "repoName", title: "Repo name",type: "string", group: "core" }),
    defineField({
      name: "slug", title: "Slug", type: "slug", group: "core",
      options: { source: "repoName", maxLength: 96 },
    }),
    defineField({ name: "stars",    title: "Stars",    type: "number", group: "core" }),
    defineField({ name: "language", title: "Language", type: "string", group: "core" }),
    defineField({
      name: "topics", title: "Topics", type: "array", group: "core",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "status", title: "Status", type: "string", group: "core",
      options: { list: ["qualified", "rejected"], layout: "radio" },
      validation: (R) => R.required(),
    }),
    defineField({ name: "viabilityScore", title: "Viability score (0-10)", type: "number", group: "core" }),

    // License
    defineField({ name: "licenseSpdx",       title: "License SPDX",       type: "string", group: "core" }),
    defineField({
      name: "licenseRisk", title: "License risk", type: "string", group: "core",
      options: { list: ["Low", "Medium", "High"], layout: "radio" },
    }),
    defineField({ name: "licenseRiskReason", title: "License risk reason", type: "text", rows: 2, group: "core" }),

    defineField({ name: "summary", title: "Summary (plain English)", type: "text", rows: 3, group: "core" }),
    defineField({ name: "sourceChannel", title: "Source channel", type: "string", group: "core" }),
    defineField({ name: "sourceMessageUrl", title: "Source message URL", type: "url", group: "core" }),
    defineField({ name: "sourceMessageText", title: "Source message text", type: "text", rows: 4, group: "core" }),
    defineField({ name: "publishedAt", title: "Published at", type: "datetime", group: "core" }),

    // ── Product (qualified only) ────────────────────────────────────
    defineField({ name: "productName",        title: "Product name",        type: "string", group: "product" }),
    defineField({ name: "tagline",            title: "Tagline",             type: "string", group: "product" }),
    defineField({ name: "productDescription", title: "Product description", type: "text", rows: 3, group: "product" }),
    defineField({
      name: "specificBuyer", title: "Specific buyer", type: "text", rows: 2, group: "product",
      description: "Named type of person — not 'developers'. E.g. 'freelance Shopify dev who builds stores for independent clothing retailers'",
    }),
    defineField({
      name: "buyerWorkflow", title: "Buyer workflow today", type: "text", rows: 3, group: "product",
      description: "What they do today, manually or with existing tools",
    }),
    defineField({
      name: "whyTheyPay", title: "Why they pay", type: "text", rows: 2, group: "product",
      description: "Specific outcome — not 'saves time'",
    }),
    defineField({ name: "competitorCheck",            title: "Competitor check",             type: "text", rows: 2, group: "product" }),
    defineField({
      name: "deploymentComplexity", title: "Deployment complexity", type: "string", group: "product",
      options: { list: ["Low", "Medium", "High"], layout: "radio" },
    }),
    defineField({ name: "deploymentComplexityReason", title: "Deployment complexity reason", type: "string", group: "product" }),
    defineField({ name: "buildTime",                  title: "Build time estimate",          type: "string", group: "product" }),
    defineField({ name: "techStack",                  title: "Recommended tech stack",       type: "text", rows: 2, group: "product" }),
    defineField({ name: "byokModel",                  title: "BYOK model",                   type: "string", group: "product" }),
    defineField({ name: "freemiumModel",              title: "Freemium model",               type: "text", rows: 2, group: "product" }),
    defineField({
      name: "revenuePotential", title: "Revenue potential", type: "string", group: "product",
      options: { list: ["Low", "Medium", "High"], layout: "radio" },
    }),
    defineField({
      name: "seoKeywords", title: "SEO keywords", type: "array", group: "product",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "prerequisites", title: "Prerequisites", type: "array", group: "product",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "viabilityReasons", title: "Viability reasons", type: "array", group: "product",
      of: [defineArrayMember({ type: "string" })],
    }),

    // ── Business model ─────────────────────────────────────────────
    defineField({
      name: "businessModel", title: "Business model", type: "object", group: "business",
      fields: [
        defineField({ name: "freeTier",            title: "Free tier",             type: "text", rows: 2 }),
        defineField({ name: "proTier",             title: "Pro tier",              type: "text", rows: 2 }),
        defineField({ name: "pricing",             title: "Pricing",               type: "string" }),
        defineField({
          name: "monetisationMethods", title: "Monetisation methods", type: "array",
          of: [defineArrayMember({ type: "string" })],
        }),
      ],
    }),

    // ── Revenue roadmap ────────────────────────────────────────────
    defineField({
      name: "revenueRoadmap", title: "Revenue roadmap", type: "array", group: "roadmap",
      of: [
        defineArrayMember({
          type: "object",
          name: "roadmapPhase",
          preview: { select: { title: "title", subtitle: "duration" } },
          fields: [
            defineField({ name: "phase",    title: "Phase label", type: "string" }),
            defineField({ name: "title",    title: "Title",       type: "string" }),
            defineField({ name: "duration", title: "Duration",    type: "string" }),
            defineField({
              name: "actions", title: "Actions", type: "array",
              of: [defineArrayMember({ type: "string" })],
            }),
          ],
        }),
      ],
    }),

    // ── Rejection (rejected only) ──────────────────────────────────
    defineField({
      name: "rejectionCategory", title: "Rejection category", type: "string", group: "rejection",
      options: {
        list: [
          { title: "Legal risk",           value: "legal_risk"          },
          { title: "Exploit / cheat tool", value: "exploit_tool"        },
          { title: "Hardware dependency",  value: "hardware_dependency" },
          { title: "Research only",        value: "research_only"       },
          { title: "Already exists",       value: "already_exists"      },
          { title: "Too niche",            value: "too_niche"           },
          { title: "No license",           value: "no_license"          },
          { title: "Complex setup",        value: "complex_setup"       },
        ],
        layout: "dropdown",
      },
    }),
    defineField({
      name: "rejectionReasons", title: "Rejection reasons", type: "array", group: "rejection",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({ name: "couldBeFixed", title: "Could this be fixed?", type: "boolean", group: "rejection" }),
    defineField({ name: "howToFix",     title: "How to fix",           type: "text", rows: 3, group: "rejection" }),
    defineField({
      name: "alternativeUses", title: "Alternative uses", type: "array", group: "rejection",
      of: [defineArrayMember({ type: "string" })],
    }),
  ],
});

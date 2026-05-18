import { createClient } from "@sanity/client";

const projectId  = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset    = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-01-01";
const readToken  = process.env.SANITY_API_READ_TOKEN;

/**
 * For localhost: perspective="previewDrafts" + token
 * so draft documents (created by the bot, not yet published in Studio) are visible.
 *
 * For production (Vercel): remove the token and switch to perspective="published"
 * so only human-curated, published content appears.
 */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "previewDrafts",
  token: readToken,
});

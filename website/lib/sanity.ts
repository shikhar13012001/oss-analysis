import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-01-01";
const readToken = process.env.SANITY_API_READ_TOKEN;

if (!projectId) {
  throw new Error(
    "Missing NEXT_PUBLIC_SANITY_PROJECT_ID. Copy website/.env.local.example to website/.env.local and fill in your Sanity project ID."
  );
}

/**
 * Reads with perspective="previewDrafts" + read token.
 *
 * The bot now writes analyses straight to the *published* document
 * (auto-approve) and deletes any shadowing draft, so new content shows here
 * immediately. We keep previewDrafts (rather than "published") so that any
 * legacy draft-only analyses from before auto-approve are still visible and
 * the total/qualified/rejected counts on the home page stay correct —
 * previewDrafts resolves each draft/published pair to a single document.
 *
 * If you later want to hide all drafts in production, switch to
 * perspective="published" and drop the token.
 */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "previewDrafts",
  token: readToken,
});
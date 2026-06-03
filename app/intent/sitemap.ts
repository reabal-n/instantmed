import type { MetadataRoute } from "next"

// /intent is wholesale-iceboxed (0 GSC impressions in 90d). Pages stay live as
// noindex,follow for users; the sitemap is emptied so crawl budget concentrates
// on the revenue pages. Re-index a page by moving it into a keep-set in
// lib/seo/index-policy.ts. See docs/audits/2026-06-03-3llm-brain-review.md.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return []
}

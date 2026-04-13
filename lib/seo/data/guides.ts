/**
 * Guide page data - single source of truth for sitemap, routing, and index
 *
 * Data is split into category files under ./guides/ for maintainability.
 * This file re-exports everything so existing consumers don't need to change.
 */

// ---------------------------------------------------------------------------
// Full guide data type (used by the [slug] page)
// ---------------------------------------------------------------------------

export interface GuideData {
  title: string
  slug: string
  description: string
  lastUpdated: string
  readTime: string
  heroImage?: string
  intro: string
  steps: Array<{
    title: string
    content: string
    tips?: string[]
  }>
  importantNotes: string[]
  faqs: Array<{ q: string; a: string }>
  cta: {
    text: string
    href: string
    subtext: string
  }
}

// ---------------------------------------------------------------------------
// Guide index (lightweight, for sitemap / listing pages)
// ---------------------------------------------------------------------------

export interface GuideIndexEntry {
  slug: string
  title: string
  description: string
  readTime: string
  category: string
}

// Re-export everything from the split category files
export {
  getAllGuideSlugs,
  getGuideIndex,
  GUIDE_INDEX,
  GUIDE_SLUGS,
  guides,
  medCertGuides,
  prescriptionGuides,
  telehealthGuides,
} from "./guides/index"

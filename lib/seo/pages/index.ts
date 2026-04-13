/**
 * SEO pages module - re-exports all public API for backwards compatibility.
 *
 * Consumers can import from "@/lib/seo/pages" as before.
 */

// Types
export type { BenefitPage, CertificatePage, ConditionPage, ResourcePage } from "./types"

// Page data arrays
export { benefitPages, certificatePages, conditionPages, resourcePages } from "./definitions"

// Query/lookup helpers
export { getAllPages, getAllSlugs, getPageBySlug, getPageCount } from "./helpers"

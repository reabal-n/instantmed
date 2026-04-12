/**
 * SEO pages module - re-exports all public API for backwards compatibility.
 *
 * Consumers can import from "@/lib/seo/pages" as before.
 */

// Types
export type { ConditionPage, CertificatePage, BenefitPage, ResourcePage } from "./types"

// Page data arrays
export { conditionPages, certificatePages, benefitPages, resourcePages } from "./definitions"

// Query/lookup helpers
export { getAllPages, getPageCount, getAllSlugs, getPageBySlug } from "./helpers"

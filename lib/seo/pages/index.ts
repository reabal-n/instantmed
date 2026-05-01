/**
 * SEO pages package barrel for public page data, types, and lookup helpers.
 *
 * Consumers should import from "@/lib/seo/pages" instead of deep files.
 */

// Types
export type { BenefitPage, CertificatePage, ConditionPage, ResourcePage } from "./types"

// Page data arrays
export { benefitPages, certificatePages, conditionPages, resourcePages } from "./definitions"

// Query/lookup helpers
export { getAllPages, getAllSlugs, getPageBySlug, getPageCount } from "./helpers"

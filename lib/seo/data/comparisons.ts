/**
 * Comparison page slugs - single source of truth for sitemap and routing
 */

export const COMPARISON_SLUGS = [
  "telehealth-vs-gp",
  "online-medical-certificate-options",
  "waiting-room-vs-telehealth",
  "bulk-billing-vs-private-telehealth",
  "e-prescriptions-vs-paper",
] as const

export function getAllComparisonSlugs(): string[] {
  return [...COMPARISON_SLUGS]
}

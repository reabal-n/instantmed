/**
 * Comparison page slugs - single source of truth for sitemap and routing.
 *
 * Two sources:
 * - Built-in general telehealth comparisons (listed below)
 * - Competitor-specific comparisons (defined in ./competitor-comparisons.ts)
 */

import { COMPETITOR_COMPARISON_SLUGS } from "./competitor-comparisons"

export const COMPARISON_SLUGS = [
  "telehealth-vs-gp",
  "online-medical-certificate-options",
  "waiting-room-vs-telehealth",
  "bulk-billing-vs-private-telehealth",
  "e-prescriptions-vs-paper",
] as const

export function getAllComparisonSlugs(): string[] {
  return [...COMPARISON_SLUGS, ...COMPETITOR_COMPARISON_SLUGS]
}

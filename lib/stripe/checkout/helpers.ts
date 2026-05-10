import type { RequestType } from "@/lib/audit/compliance-audit"
import { getAppUrl } from "@/lib/config/env"

export function getBaseUrl(): string {
  return getAppUrl()
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Map (category, subtype) to the audit-log RequestType used by
 * `lib/audit/compliance-audit`. Defaults to "intake" when the pair does not
 * match a recognised med-cert or repeat-rx variant.
 */
export function mapCategoryToRequestType(category: string, subtype: string): RequestType {
  if (category === "medical_certificate") return "med_cert"
  if (category === "prescription" && (subtype === "repeat" || subtype === "chronic_review")) return "repeat_rx"
  return "intake"
}

/**
 * Resolve the canonical service slug for a (category, subtype) pair.
 * Used both for the safety-rule lookup and the `services` table fetch.
 *
 * Order of precedence:
 *   1. Combined `${category}:${subtype}` exact match
 *   2. Category-level fallback
 *   3. "consult" as the universal default
 */
export function getServiceSlug(category: string, subtype: string): string {
  const slugMap: Record<string, string> = {
    "medical_certificate:work": "med-cert-sick",
    "medical_certificate:study": "med-cert-sick",
    "medical_certificate:carer": "med-cert-carer",
    "prescription:repeat": "common-scripts",
    "prescription:chronic_review": "common-scripts",
    "prescription:new": "consult",
    "consult:general": "consult",
  }

  const categoryFallback: Record<string, string> = {
    medical_certificate: "med-cert-sick",
    prescription: "common-scripts",
    consult: "consult",
  }

  return slugMap[`${category}:${subtype}`] || categoryFallback[category] || "consult"
}

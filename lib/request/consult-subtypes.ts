import type { ConsultSubtype } from "@/types/services"

/**
 * Canonical consult subtype launch state.
 *
 * Keep subtype availability here so the request hub, step registry, URL
 * normalization, and checkout validation cannot drift from each other.
 */
export const BLOCKED_CONSULT_SUBTYPES: ReadonlySet<ConsultSubtype> = new Set([
  "womens_health",
  "weight_loss",
])

export const CONSULT_SUBTYPE_LABELS: Record<ConsultSubtype, string> = {
  general: "General consultation",
  ed: "Erectile dysfunction",
  hair_loss: "Hair loss treatment",
  womens_health: "Women's health",
  weight_loss: "Weight management",
}

export function isConsultSubtypeKey(value: unknown): value is ConsultSubtype {
  return (
    value === "general" ||
    value === "ed" ||
    value === "hair_loss" ||
    value === "womens_health" ||
    value === "weight_loss"
  )
}

export function normalizeConsultSubtypeParam(value: unknown): ConsultSubtype | undefined {
  if (typeof value !== "string") return undefined

  const normalized = value.trim().toLowerCase().replaceAll("-", "_")
  return isConsultSubtypeKey(normalized) ? normalized : undefined
}

export function isConsultSubtypeAvailable(subtype: ConsultSubtype): boolean {
  return !BLOCKED_CONSULT_SUBTYPES.has(subtype)
}

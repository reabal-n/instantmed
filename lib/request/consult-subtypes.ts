import type { ConsultSubtype } from "@/types/services"

/**
 * Canonical consult subtype launch state.
 *
 * Keep subtype availability here so the request hub, step registry, URL
 * normalization, and checkout validation cannot drift from each other.
 */
export const BLOCKED_CONSULT_SUBTYPES: ReadonlySet<ConsultSubtype> = new Set([
  // womens_health launched 2026-06-15 (UTI + new/switch pill only, scoped by
  // LIVE_WOMENS_HEALTH_OPTIONS). weight_loss stays gated.
  "weight_loss",
])

/**
 * Within women's health, only these option screens are live. Flipping the
 * subtype gate alone would expose the whole type picker (morning-after,
 * period-pain, "other"); this keeps the launch scoped to UTI + new/switch pill.
 * `ocp_repeat` is deliberately absent — "continuing the same pill" is routed to
 * the cheaper repeat-script flow, not a parallel $49.95 path.
 */
const WOMENS_HEALTH_INTENT_VALUES = ["uti", "ocp_new"] as const
export type WomensHealthIntent = (typeof WOMENS_HEALTH_INTENT_VALUES)[number]

export const LIVE_WOMENS_HEALTH_OPTIONS: ReadonlySet<WomensHealthIntent> = new Set(
  WOMENS_HEALTH_INTENT_VALUES,
)

export function isWomensHealthOptionLive(option: unknown): option is WomensHealthIntent {
  return (
    typeof option === "string" &&
    LIVE_WOMENS_HEALTH_OPTIONS.has(option as WomensHealthIntent)
  )
}

/**
 * Accept only the two canonical child-page intent tokens. This is a UI seed
 * for the existing women's-health consult flow, never a service/subtype alias.
 */
export function normalizeWomensHealthIntentParam(value: unknown): WomensHealthIntent | undefined {
  return isWomensHealthOptionLive(value) ? value : undefined
}

export const CONSULT_SUBTYPE_LABELS: Record<ConsultSubtype, string> = {
  ed: "Erectile dysfunction",
  hair_loss: "Hair loss treatment",
  womens_health: "Women's health",
  weight_loss: "Weight management",
}

export function isConsultSubtypeKey(value: unknown): value is ConsultSubtype {
  return (
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

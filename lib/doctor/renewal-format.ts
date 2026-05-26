/**
 * Renewal chip presentation helpers. Kept client-safe (no "server-only"
 * import) so both the Supabase-side query layer and the React row
 * components can render the same tooltip string. Single source of truth
 * for what "Renewal of: <medicine>" reads as.
 */

export interface RenewalMatch {
  /** The matched prior prescription's canonical drug name. */
  medicationName: string
  /** Strength if the prior prescription recorded one (e.g. "40mg"). */
  strength: string | null
  /**
   * The matched prior prescription's `id`. Optional so batch callers that
   * only render the chip/tooltip can omit it; the slide review-data API
   * sets it so the doctor can deep-link to the prior script in the
   * patient timeline.
   */
  priorPrescriptionId?: string | null
}

/** Generic fallback when we know it's a renewal but lost the matched name. */
export const RENEWAL_FALLBACK_TITLE =
  "Renewal: patient already has this prescription on file"

/**
 * Render the renewal chip tooltip. Used by both the doctor queue row and
 * the operator case row so the copy stays in lockstep.
 *
 * Examples:
 *   { medicationName: "Atorvastatin", strength: "40mg" }
 *     -> "Renewal of: Atorvastatin 40mg"
 *   { medicationName: "Atorvastatin", strength: null }
 *     -> "Renewal of: Atorvastatin"
 */
export function formatRenewalMatchTitle(match: RenewalMatch): string {
  const strength = match.strength?.trim()
  if (strength) return `Renewal of: ${match.medicationName} ${strength}`
  return `Renewal of: ${match.medicationName}`
}

/**
 * Intake flags — the normalized "flag for the doctor" surface.
 *
 * The intake form collects; the doctor decides. When a soft boundary is hit
 * (e.g. the patient could not name their exact medication strength), the form
 * no longer dead-ends — it lets the patient through and records an `IntakeFlag`
 * that the doctor sees on the queue badge and the intake detail panel.
 *
 * Severity is load-bearing:
 *  - `attention` — the doctor must look. For med certs this maps to the
 *    auto-approval `disqualifyingFlags` path so a flagged cert is NEVER
 *    auto-issued (it routes to `needs_doctor`).
 *  - `info` — display/audit only. Maps to the engine `softFlags` lane and must
 *    NOT break the deliberately-tuned 1–2 day low-risk auto-approval fast path.
 *
 * Stored on `intakes.risk_flags` (JSONB). Read back with `parseIntakeFlags`,
 * which is defensive because the column is untrusted JSON.
 */

export type IntakeFlagSeverity = "attention" | "info"
export type IntakeFlagSource = "intake" | "auto_approval" | "clinical"

export interface IntakeFlag {
  code: string
  label: string
  detail?: string
  source: IntakeFlagSource
  severity: IntakeFlagSeverity
}

interface TaxonomyEntry {
  label: string
  severity: IntakeFlagSeverity
}

/**
 * Canonical codes the intake/clinical layers can raise. New-medication and
 * dose-change are deliberately NOT here — they stay server-blocked per
 * docs/CLINICAL.md and get a route/reprice/decline design, not a pass-through
 * flag.
 */
export const INTAKE_FLAG_TAXONOMY = {
  medication_needs_identification: { label: "Medication needs identification", severity: "attention" },
  medication_strength_missing: { label: "Strength not provided", severity: "attention" },
  medication_form_missing: { label: "Form not provided", severity: "attention" },
  dose_not_stated: { label: "Current dose not stated", severity: "attention" },
  medication_count_high: { label: "More than one medication requested", severity: "info" },
  // A medicine with a dedicated service (hair loss / women's health) was entered
  // into the generic repeat/prescription flow. The patient is steered in-form;
  // this flag is the doctor-side backstop so the routing is never client-only.
  dedicated_service_medication: { label: "Has a dedicated service pathway", severity: "attention" },
} as const satisfies Record<string, TaxonomyEntry>

export type IntakeFlagCode = keyof typeof INTAKE_FLAG_TAXONOMY

const SEVERITY_RANK: Record<IntakeFlagSeverity, number> = { attention: 2, info: 1 }
const VALID_SEVERITIES: readonly IntakeFlagSeverity[] = ["attention", "info"]
const VALID_SOURCES: readonly IntakeFlagSource[] = ["intake", "auto_approval", "clinical"]

/** Build a flag for a known taxonomy code; severity/label come from the taxonomy. */
export function makeIntakeFlag(
  code: IntakeFlagCode,
  opts: { detail?: string; source?: IntakeFlagSource } = {},
): IntakeFlag {
  const entry = INTAKE_FLAG_TAXONOMY[code]
  const flag: IntakeFlag = {
    code,
    label: entry.label,
    source: opts.source ?? "intake",
    severity: entry.severity,
  }
  if (opts.detail !== undefined) flag.detail = opts.detail
  return flag
}

/** Flags the doctor must act on (drives the queue badge + needs_doctor routing). */
export function attentionFlags(flags: IntakeFlag[]): IntakeFlag[] {
  return flags.filter((flag) => flag.severity === "attention")
}

/** Collapse duplicate codes, keeping the highest-severity instance per code. */
export function dedupeIntakeFlags(flags: IntakeFlag[]): IntakeFlag[] {
  const byCode = new Map<string, IntakeFlag>()
  for (const flag of flags) {
    const existing = byCode.get(flag.code)
    if (!existing || SEVERITY_RANK[flag.severity] > SEVERITY_RANK[existing.severity]) {
      byCode.set(flag.code, flag)
    }
  }
  return Array.from(byCode.values())
}

/** Defensive reader for the untrusted `intakes.risk_flags` JSONB column. */
export function parseIntakeFlags(raw: unknown): IntakeFlag[] {
  if (!Array.isArray(raw)) return []
  const out: IntakeFlag[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const candidate = entry as Record<string, unknown>
    if (typeof candidate.code !== "string" || typeof candidate.label !== "string") continue
    if (typeof candidate.source !== "string" || !VALID_SOURCES.includes(candidate.source as IntakeFlagSource)) continue
    if (typeof candidate.severity !== "string" || !VALID_SEVERITIES.includes(candidate.severity as IntakeFlagSeverity)) {
      continue
    }
    const flag: IntakeFlag = {
      code: candidate.code,
      label: candidate.label,
      source: candidate.source as IntakeFlagSource,
      severity: candidate.severity as IntakeFlagSeverity,
    }
    if (typeof candidate.detail === "string") flag.detail = candidate.detail
    out.push(flag)
  }
  return out
}

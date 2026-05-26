import "server-only"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import type { RenewalMatch } from "./renewal-format"

export {
  formatRenewalMatchTitle,
  RENEWAL_FALLBACK_TITLE,
  type RenewalMatch,
} from "./renewal-format"

const logger = createLogger("renewal-detection")

const PRESCRIPTION_CATEGORIES: ReadonlySet<string> = new Set([
  "prescription",
  "common_scripts",
])

const PRESCRIPTION_SERVICE_TYPES: ReadonlySet<string> = new Set([
  "prescription",
  "common_scripts",
  "repeat_rx",
  "repeat-script",
])

const RENEWAL_PRIOR_STATUSES = ["active", "completed"] as const

export interface IntakeRenewalProbe {
  intakeId: string
  patientId: string | null
  category: string | null
  serviceType?: string | null
  /**
   * The medicine name pulled from intake_answers.medicationName.
   * Pass the value the caller already has; this helper doesn't refetch answers.
   */
  medicationName: string | null
}

/**
 * Resolve which intakes are renewals (patient already has a row in
 * `prescriptions` with a matching medication_name). Returns a map keyed by
 * intakeId; missing entries default to "not a renewal" at the caller.
 *
 * Bulk-aware: one query for the whole batch, not one per intake. Fail-soft on
 * Supabase error so the queue/ledger never blanks because renewal detection
 * is informational only.
 */
export async function detectRenewalsForIntakes(
  probes: IntakeRenewalProbe[],
): Promise<Map<string, RenewalMatch>> {
  const result = new Map<string, RenewalMatch>()
  if (probes.length === 0) return result

  // Filter to prescription-shaped intakes with a real medicationName + patientId.
  const candidates = probes.filter((probe) => {
    if (!probe.patientId || !probe.medicationName) return false
    const med = probe.medicationName.trim()
    if (med.length === 0) return false
    const category = (probe.category ?? "").trim()
    const serviceType = (probe.serviceType ?? "").trim()
    return (
      PRESCRIPTION_CATEGORIES.has(category) ||
      PRESCRIPTION_SERVICE_TYPES.has(serviceType)
    )
  })
  if (candidates.length === 0) return result

  const patientIds = Array.from(
    new Set(candidates.map((c) => c.patientId!).filter(Boolean)),
  )
  if (patientIds.length === 0) return result

  const supabase = createServiceRoleClient()
  // Order newest first so when the first-hit-wins index below picks one
  // prior script for the deep link, it is deterministically the most recent
  // prior of that medication. Without the order, Postgres can return rows
  // in arbitrary physical order and the link target can drift between runs
  // for patients with multiple prior scripts of the same medication.
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id, patient_id, medication_name, medication_strength, created_at")
    .in("patient_id", patientIds)
    .in("status", RENEWAL_PRIOR_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })

  if (error || !data) {
    if (error) {
      logger.error(
        "Renewal detection query failed",
        { count: patientIds.length },
        error instanceof Error ? error : new Error(String(error)),
      )
    }
    return result
  }

  // Index by `${patient_id}::${normalized medication_name}` for O(1) lookup.
  // FIRST hit wins so retries don't churn the tooltip text on each render.
  const known = new Map<string, RenewalMatch>()
  for (const row of data) {
    const pid = (row.patient_id as string | null) ?? ""
    const rawName = (row.medication_name as string | null) ?? ""
    const med = rawName.trim().toLowerCase()
    if (!pid || !med) continue
    const key = `${pid}::${med}`
    if (known.has(key)) continue
    const strength = (row.medication_strength as string | null) ?? null
    const priorId = (row.id as string | null) ?? null
    known.set(key, {
      medicationName: rawName.trim(),
      strength: strength && strength.trim().length > 0 ? strength.trim() : null,
      priorPrescriptionId: priorId,
    })
  }

  for (const probe of candidates) {
    const med = (probe.medicationName ?? "").trim().toLowerCase()
    const key = `${probe.patientId}::${med}`
    const match = known.get(key)
    if (match) result.set(probe.intakeId, match)
  }
  return result
}

import "server-only"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

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
 * intakeId; missing entries default to false at the caller.
 *
 * Bulk-aware: one query for the whole batch, not one per intake. Fail-soft on
 * Supabase error so the queue/ledger never blanks because renewal detection
 * is informational only.
 */
export async function detectRenewalsForIntakes(
  probes: IntakeRenewalProbe[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>()
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
  const { data, error } = await supabase
    .from("prescriptions")
    .select("patient_id, medication_name")
    .in("patient_id", patientIds)
    .in("status", RENEWAL_PRIOR_STATUSES as unknown as string[])

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
  const known = new Set<string>()
  for (const row of data) {
    const pid = (row.patient_id as string | null) ?? ""
    const med = ((row.medication_name as string | null) ?? "")
      .trim()
      .toLowerCase()
    if (pid && med) known.add(`${pid}::${med}`)
  }

  for (const probe of candidates) {
    const med = (probe.medicationName ?? "").trim().toLowerCase()
    const key = `${probe.patientId}::${med}`
    if (known.has(key)) result.set(probe.intakeId, true)
  }
  return result
}

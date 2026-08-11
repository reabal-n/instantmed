import "server-only"

import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { extractMedicationFromAnswers } from "@/lib/validation/repeat-script-schema"

const logger = createLogger("intake-medication-label")

const FALLBACK_ANSWER_KEYS = [
  "medication_display",
  "medicationDisplay",
  "medication_name",
  "medicationName",
  "selected_medication_name",
] as const

/**
 * Doctor-context display label for the medicine a patient typed into a
 * prescription-shaped intake. Free text as the patient entered it — never
 * a MIMS/PBS identification and never shown on patient surfaces.
 */
function extractMedicationLabel(
  answers: Record<string, unknown> | null | undefined,
): string | null {
  if (!answers) return null
  const extracted = extractMedicationFromAnswers(answers)
  const candidates: Array<unknown> = [
    extracted?.medication_display,
    extracted?.medication_name,
    ...FALLBACK_ANSWER_KEYS.map((key) => answers[key]),
  ]
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
  }
  return null
}

/**
 * Batched medicine labels for a set of intakes: one `intake_answers` query,
 * keyed by intake id. Informational only, so any error fails soft to an
 * empty map — history rows simply render without a medicine.
 */
export async function getIntakeMedicationLabels(
  intakeIds: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>()
  if (intakeIds.length === 0) return labels

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intake_answers")
    .select("intake_id, answers")
    .in("intake_id", intakeIds)

  if (error) {
    logger.warn("Medication label lookup failed", { error: error.message })
    return labels
  }

  for (const row of data ?? []) {
    const intakeId = typeof row.intake_id === "string" ? row.intake_id : null
    if (!intakeId || labels.has(intakeId)) continue
    const label = extractMedicationLabel(
      (row.answers ?? null) as Record<string, unknown> | null,
    )
    if (label) labels.set(intakeId, label)
  }
  return labels
}

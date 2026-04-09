import { addMonths } from "date-fns"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("followups")

export type FollowupMilestone = "month_3" | "month_6" | "month_12"
export type FollowupSubtype = "ed" | "hair_loss"

export interface ComputedMilestone {
  milestone: FollowupMilestone
  dueAt: Date
}

/**
 * Compute the three follow-up milestone dates given an approval timestamp.
 * Order: month_3, month_6, month_12.
 */
export function computeFollowupMilestones(approvedAt: Date): ComputedMilestone[] {
  return [
    { milestone: "month_3", dueAt: addMonths(approvedAt, 3) },
    { milestone: "month_6", dueAt: addMonths(approvedAt, 6) },
    { milestone: "month_12", dueAt: addMonths(approvedAt, 12) },
  ]
}

/**
 * Insert three follow-up rows for an approved ED/hair-loss consult intake.
 * Idempotent via UNIQUE (intake_id, milestone) -- upsert on conflict do nothing.
 */
export async function createFollowupsForIntake(
  supabase: SupabaseClient,
  params: {
    intakeId: string
    patientId: string
    subtype: FollowupSubtype
    approvedAt?: Date
  }
): Promise<{ success: boolean; inserted: number }> {
  const approvedAt = params.approvedAt ?? new Date()
  const milestones = computeFollowupMilestones(approvedAt)

  const rows = milestones.map((m) => ({
    intake_id: params.intakeId,
    patient_id: params.patientId,
    subtype: params.subtype,
    milestone: m.milestone,
    due_at: m.dueAt.toISOString(),
  }))

  const { error, count } = await supabase
    .from("intake_followups")
    .upsert(rows, { onConflict: "intake_id,milestone", ignoreDuplicates: true, count: "exact" })

  if (error) {
    log.error("Failed to create followups", {
      intakeId: params.intakeId,
      subtype: params.subtype,
      error: error.message,
    })
    return { success: false, inserted: 0 }
  }

  log.info("Followups created", {
    intakeId: params.intakeId,
    subtype: params.subtype,
    inserted: count ?? 0,
  })

  return { success: true, inserted: count ?? rows.length }
}

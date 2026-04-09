"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import * as Sentry from "@sentry/nextjs"
import { requireRoleOrNull } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("followups-actions")

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const submitFollowupSchema = z
  .object({
    followupId: z.string().regex(UUID_REGEX, "Invalid followup ID"),
    effectivenessRating: z.number().int().min(1).max(5),
    sideEffectsReported: z.boolean(),
    sideEffectsNotes: z.string().max(2000),
    adherenceDaysPerWeek: z.number().int().min(0).max(7),
    patientNotes: z.string().max(2000),
  })
  .superRefine((data, ctx) => {
    if (data.sideEffectsReported && data.sideEffectsNotes.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sideEffectsNotes"],
        message: "Please describe the side effects.",
      })
    }
  })

export type SubmitFollowupInput = z.infer<typeof submitFollowupSchema>

interface ActionResult {
  success: boolean
  error?: string
}

export async function getFollowup(followupId: string) {
  if (!UUID_REGEX.test(followupId)) return null
  const auth = await requireRoleOrNull(["patient", "doctor", "admin"])
  if (!auth) return null

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("intake_followups")
    .select(
      "id, intake_id, patient_id, subtype, milestone, due_at, completed_at, skipped, effectiveness_rating, side_effects_reported, side_effects_notes, adherence_days_per_week, patient_notes",
    )
    .eq("id", followupId)
    .single()

  if (error || !data) return null

  // Patient can only see their own
  if (auth.profile.role === "patient" && data.patient_id !== auth.profile.id) {
    return null
  }

  return data
}

export async function submitFollowup(
  input: SubmitFollowupInput,
): Promise<ActionResult> {
  const parsed = submitFollowupSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    }
  }

  const auth = await requireRoleOrNull(["patient"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from("intake_followups")
    .select("id, patient_id, completed_at, intake_id")
    .eq("id", parsed.data.followupId)
    .single()

  if (!existing || existing.patient_id !== auth.profile.id) {
    return { success: false, error: "Not found" }
  }
  if (existing.completed_at) {
    return { success: false, error: "Already submitted" }
  }

  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from("intake_followups")
    .update({
      completed_at: now,
      effectiveness_rating: parsed.data.effectivenessRating,
      side_effects_reported: parsed.data.sideEffectsReported,
      side_effects_notes: parsed.data.sideEffectsNotes || null,
      adherence_days_per_week: parsed.data.adherenceDaysPerWeek,
      patient_notes: parsed.data.patientNotes || null,
    })
    .eq("id", parsed.data.followupId)

  if (updateErr) {
    log.error("Failed to submit followup", { error: updateErr.message })
    Sentry.captureException(updateErr, {
      tags: { action: "submit_followup" },
    })
    return { success: false, error: "Failed to save response" }
  }

  // Flag intake for doctor review if side effects or low rating
  if (
    parsed.data.sideEffectsReported ||
    parsed.data.effectivenessRating <= 2
  ) {
    try {
      await supabase
        .from("intakes")
        .update({
          needs_followup_review: true,
          updated_at: now,
        })
        .eq("id", existing.intake_id)
    } catch {
      // Non-critical -- do not block the submission
      log.warn("Failed to flag intake for review", {
        intakeId: existing.intake_id,
      })
    }
  }

  revalidatePath("/patient")
  revalidatePath(`/patient/followups/${parsed.data.followupId}`)
  return { success: true }
}

export async function skipFollowup(
  followupId: string,
): Promise<ActionResult> {
  if (!UUID_REGEX.test(followupId)) {
    return { success: false, error: "Invalid followup ID" }
  }
  const auth = await requireRoleOrNull(["patient"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()
  const { data: existing } = await supabase
    .from("intake_followups")
    .select("id, patient_id")
    .eq("id", followupId)
    .single()

  if (!existing || existing.patient_id !== auth.profile.id) {
    return { success: false, error: "Not found" }
  }

  const { error } = await supabase
    .from("intake_followups")
    .update({ skipped: true, completed_at: new Date().toISOString() })
    .eq("id", followupId)

  if (error) {
    log.error("Failed to skip followup", { error: error.message })
    return { success: false, error: "Failed to update" }
  }

  revalidatePath("/patient")
  return { success: true }
}

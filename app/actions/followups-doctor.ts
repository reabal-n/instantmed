"use server"

import { revalidatePath } from "next/cache"

import { withServerAction } from "@/lib/actions/with-server-action"
import type { ActionResult } from "@/types/shared"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const markFollowupReviewed = withServerAction<string>(
  { roles: ["doctor", "admin"], name: "mark-followup-reviewed" },
  async (followupId, { supabase, profile, log }): Promise<ActionResult> => {
    if (!UUID_REGEX.test(followupId))
      return { success: false, error: "Invalid ID" }

    const { data: row, error: fetchErr } = await supabase
      .from("intake_followups")
      .select("id, intake_id")
      .eq("id", followupId)
      .single()

    if (fetchErr || !row) return { success: false, error: "Not found" }

    const { error } = await supabase
      .from("intake_followups")
      .update({
        doctor_reviewed_at: new Date().toISOString(),
        doctor_id: profile.id,
      })
      .eq("id", followupId)

    if (error) {
      log.error("Failed to mark reviewed", { error: error.message })
      return { success: false, error: "Failed to update" }
    }

    revalidatePath(`/doctor/intakes/${row.intake_id}`)
    return { success: true }
  }
)

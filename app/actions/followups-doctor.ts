"use server"

import { revalidatePath } from "next/cache"
import { requireRoleOrNull } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("followups-doctor")
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function markFollowupReviewed(
  followupId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!UUID_REGEX.test(followupId))
    return { success: false, error: "Invalid ID" }

  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()
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
      doctor_id: auth.profile.id,
    })
    .eq("id", followupId)

  if (error) {
    log.error("Failed to mark reviewed", { error: error.message })
    return { success: false, error: "Failed to update" }
  }

  revalidatePath(`/doctor/intakes/${row.intake_id}`)
  return { success: true }
}

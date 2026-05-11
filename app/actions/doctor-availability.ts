"use server"

import { withServerAction } from "@/lib/actions/with-server-action"
import { requireRole } from "@/lib/auth/helpers"
import { revalidateStaff } from "@/lib/dashboard/revalidate-staff"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ActionResult } from "@/types/shared"

export const setDoctorAvailabilityAction = withServerAction<boolean>(
  { roles: ["doctor", "admin"], name: "set-doctor-availability" },
  async (available, { supabase, profile }): Promise<ActionResult> => {
    const { error } = await supabase
      .from("profiles")
      .update({ doctor_available: available })
      .eq("id", profile.id)

    if (error) return { success: false, error: error.message }
    revalidateStaff({ identity: true })
    return { success: true }
  }
)

export async function getDoctorAvailabilityAction(): Promise<{ available: boolean }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) return { available: true }

  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("profiles")
    .select("doctor_available")
    .eq("id", profile.id)
    .single()

  return { available: data?.doctor_available !== false }
}

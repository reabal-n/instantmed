"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function setDoctorAvailabilityAction(available: boolean): Promise<{ success: boolean; error?: string }> {
  const { profile } = await requireRole(["doctor", "admin"])
  if (!profile) return { success: false, error: "Unauthorized" }

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from("profiles")
    .update({ doctor_available: available })
    .eq("id", profile.id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/doctor")
  revalidatePath("/doctor/queue")
  revalidatePath("/doctor/settings")
  return { success: true }
}

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

"use server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("create-profile")

/**
 * Finds or creates a patient profile by Supabase auth user ID.
 * Used by consult and intake flows that use Supabase auth directly.
 */
export async function createOrGetProfile(
  userId: string,
  fullName: string,
  dateOfBirth: string
): Promise<{ profileId: string | null; error?: string }> {
  try {
    const supabase = createServiceRoleClient()

    // Try to find existing profile
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", userId)
      .maybeSingle()

    if (existing) {
      return { profileId: existing.id }
    }

    // Create new profile
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({
        clerk_user_id: userId,
        full_name: fullName || "Patient",
        role: "patient",
        ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
      })
      .select("id")
      .single()

    if (error) {
      log.error("Failed to create profile", { userId, error: error.message })
      return { profileId: null, error: error.message }
    }

    return { profileId: created.id }
  } catch (err) {
    log.error("createOrGetProfile error", { userId }, err)
    return { profileId: null, error: "Failed to create profile" }
  }
}

"use server"

import { requireAuth } from "@/lib/auth"
import { 
  updateFeatureFlag, 
  getFeatureFlags, 
  FLAG_KEYS,
  type FlagKey 
} from "@/lib/feature-flags"

export async function getFeatureFlagsAction() {
  // Ensure user is admin/doctor
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const flags = await getFeatureFlags()
  return { success: true, flags }
}

export async function updateFeatureFlagAction(
  key: FlagKey,
  value: boolean | string[]
): Promise<{ success: boolean; error?: string }> {
  // Ensure user is admin/doctor
  const { profile, user } = await requireAuth("doctor")
  if (!profile) {
    return { success: false, error: "Unauthorized" }
  }

  const result = await updateFeatureFlag(key, value, user.id)

  return result
}

export { FLAG_KEYS }

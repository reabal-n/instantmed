"use server"

import { requireRole } from "@/lib/auth"
import { 
  updateFeatureFlag, 
  getFeatureFlags, 
  FLAG_KEYS,
  type FlagKey 
} from "@/lib/feature-flags"

export async function getFeatureFlagsAction() {
  // Ensure user is admin
  await requireRole(["admin"])

  const flags = await getFeatureFlags()
  return { success: true, flags }
}

export async function updateFeatureFlagAction(
  key: FlagKey,
  value: boolean | string[]
): Promise<{ success: boolean; error?: string }> {
  // Ensure user is admin only - feature flags are admin-controlled
  const { user } = await requireRole(["admin"])

  const result = await updateFeatureFlag(key, value, user.id)

  return result
}

export { FLAG_KEYS }

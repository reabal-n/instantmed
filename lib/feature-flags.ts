import "server-only"
import { createClient } from "@supabase/supabase-js"
import { unstable_cache } from "next/cache"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createLogger } from "@/lib/observability/logger"
const logger = createLogger("feature-flags")

// Feature flag keys
export const FLAG_KEYS = {
  DISABLE_MED_CERT: "disable_med_cert",
  DISABLE_REPEAT_SCRIPTS: "disable_repeat_scripts",
  DISABLE_CONSULTS: "disable_consults",
  BLOCKED_MEDICATION_TERMS: "blocked_medication_terms",
} as const

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS]

export interface FeatureFlags {
  disable_med_cert: boolean
  disable_repeat_scripts: boolean
  disable_consults: boolean
  blocked_medication_terms: string[]
}

// Default values (fallback if DB unavailable)
const DEFAULT_FLAGS: FeatureFlags = {
  disable_med_cert: false,
  disable_repeat_scripts: false,
  disable_consults: false,
  blocked_medication_terms: [],
}

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    logger.warn("Missing Supabase credentials")
    return null
  }
  return createClient(url, key)
}

/**
 * Fetch feature flags from database (uncached - internal use)
 */
async function fetchFlagsFromDB(): Promise<FeatureFlags> {
  const supabase = getServiceClient()
  if (!supabase) {
    logger.warn("No service client, using defaults")
    return DEFAULT_FLAGS
  }

  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("key, value")

    if (error) {
      logger.error("DB error", {}, new Error(error.message))
      return DEFAULT_FLAGS
    }

    if (!data || data.length === 0) {
      return DEFAULT_FLAGS
    }

    // Build flags object from DB rows
    const flags: FeatureFlags = { ...DEFAULT_FLAGS }
    for (const row of data) {
      if (row.key === FLAG_KEYS.DISABLE_MED_CERT) {
        flags.disable_med_cert = row.value === true
      } else if (row.key === FLAG_KEYS.DISABLE_REPEAT_SCRIPTS) {
        flags.disable_repeat_scripts = row.value === true
      } else if (row.key === FLAG_KEYS.DISABLE_CONSULTS) {
        flags.disable_consults = row.value === true
      } else if (row.key === FLAG_KEYS.BLOCKED_MEDICATION_TERMS) {
        flags.blocked_medication_terms = Array.isArray(row.value) ? row.value : []
      }
    }

    return flags
  } catch (error) {
    logger.error("Unexpected error", {}, error instanceof Error ? error : new Error(String(error)))
    return DEFAULT_FLAGS
  }
}

/**
 * Get feature flags with aggressive caching (30s TTL)
 * Safe for Vercel - uses Next.js unstable_cache with revalidation
 */
export const getFeatureFlags = unstable_cache(
  async (): Promise<FeatureFlags> => {
    return fetchFlagsFromDB()
  },
  ["feature-flags"],
  {
    revalidate: 30, // 30 second TTL
    tags: ["feature-flags"],
  }
)

/**
 * Force refresh feature flags (bypass cache)
 * Use after admin updates a flag
 */
export async function refreshFeatureFlags(): Promise<FeatureFlags> {
  return fetchFlagsFromDB()
}

/**
 * Check if a service category is disabled
 */
export async function isServiceDisabled(
  category: "medical_certificate" | "prescription" | "other"
): Promise<boolean> {
  const flags = await getFeatureFlags()

  switch (category) {
    case "medical_certificate":
      return flags.disable_med_cert
    case "prescription":
      return flags.disable_repeat_scripts
    case "other":
      return flags.disable_consults
    default:
      return false
  }
}

/**
 * Check if a medication name contains blocked terms
 */
export async function isMedicationBlocked(
  medicationName: string | null | undefined
): Promise<{ blocked: boolean; matchedTerm?: string }> {
  if (!medicationName) {
    return { blocked: false }
  }

  const flags = await getFeatureFlags()
  const terms = flags.blocked_medication_terms

  if (!terms || terms.length === 0) {
    return { blocked: false }
  }

  const lowerName = medicationName.toLowerCase()
  for (const term of terms) {
    if (term && lowerName.includes(term.toLowerCase())) {
      return { blocked: true, matchedTerm: term }
    }
  }

  return { blocked: false }
}

/**
 * Update a feature flag (admin only)
 */
export async function updateFeatureFlag(
  key: FlagKey,
  value: boolean | string[],
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient()
  if (!supabase) {
    return { success: false, error: "Database unavailable" }
  }

  try {
    // Get old value for audit log
    const { data: oldData } = await supabase
      .from("feature_flags")
      .select("value")
      .eq("key", key)
      .single()

    const oldValue = oldData?.value

    // Update the flag
    const { error } = await supabase
      .from("feature_flags")
      .update({
        value: value,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq("key", key)

    if (error) {
      logger.error("Update error", {}, error instanceof Error ? error : new Error(String(error)))
      return { success: false, error: error.message }
    }

    // Log the change
    await logAuditEvent({
      action: "settings_changed",
      actorId: updatedBy,
      actorType: "admin",
      metadata: {
        flag_key: key,
        old_value: oldValue,
        new_value: value,
        action_type: "feature_flag_updated",
      },
    })

    logger.info("[FeatureFlags] Flag updated", { key, value, updatedBy })

    return { success: true }
  } catch (error) {
    logger.error("Unexpected error", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "Unexpected error" }
  }
}

/**
 * Error codes for disabled services
 */
export const SERVICE_DISABLED_ERRORS = {
  MED_CERT_DISABLED: "SERVICE_MED_CERT_DISABLED",
  REPEAT_SCRIPTS_DISABLED: "SERVICE_REPEAT_SCRIPTS_DISABLED",
  CONSULTS_DISABLED: "SERVICE_CONSULTS_DISABLED",
  MEDICATION_BLOCKED: "MEDICATION_BLOCKED",
} as const

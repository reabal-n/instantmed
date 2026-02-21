import "server-only"
import { createClient } from "@supabase/supabase-js"
import { unstable_cache, revalidateTag } from "next/cache"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createLogger } from "@/lib/observability/logger"

// Re-export types and constants from shared module (for backward compatibility)
export type { FlagKey, FeatureFlags } from "@/lib/data/types/feature-flags"
export {
  FLAG_KEYS,
  DEFAULT_FLAGS,
  DEFAULT_SAFETY_SYMPTOMS,
  getFlagInfo,
  isServiceKillSwitch,
  isArrayFlag,
  isStringFlag,
} from "@/lib/data/types/feature-flags"

import type { FeatureFlags, FlagKey } from "@/lib/data/types/feature-flags"
import { FLAG_KEYS, DEFAULT_FLAGS, DEFAULT_SAFETY_SYMPTOMS } from "@/lib/data/types/feature-flags"

const logger = createLogger("feature-flags")

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
      if (row.key === FLAG_KEYS.MAINTENANCE_MODE) {
        flags.maintenance_mode = row.value === true
      } else if (row.key === FLAG_KEYS.MAINTENANCE_MESSAGE) {
        flags.maintenance_message = typeof row.value === "string" ? row.value : DEFAULT_FLAGS.maintenance_message
      } else if (row.key === FLAG_KEYS.DISABLE_MED_CERT) {
        flags.disable_med_cert = row.value === true
      } else if (row.key === FLAG_KEYS.DISABLE_REPEAT_SCRIPTS) {
        flags.disable_repeat_scripts = row.value === true
      } else if (row.key === FLAG_KEYS.DISABLE_CONSULTS) {
        flags.disable_consults = row.value === true
      } else if (row.key === FLAG_KEYS.BLOCKED_MEDICATION_TERMS) {
        flags.blocked_medication_terms = Array.isArray(row.value) ? row.value : []
      } else if (row.key === FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS) {
        flags.safety_screening_symptoms = Array.isArray(row.value) ? row.value : DEFAULT_SAFETY_SYMPTOMS
      } else if (row.key === FLAG_KEYS.SCRIPT_TODO_ENABLED) {
        flags.script_todo_enabled = row.value === true
      } else if (row.key === FLAG_KEYS.BATCH_APPROVE_ENABLED) {
        flags.batch_approve_enabled = row.value === true
      } else if (row.key === FLAG_KEYS.CONSENT_VERSIONING_ENABLED) {
        flags.consent_versioning_enabled = row.value === true
      } else if (row.key === FLAG_KEYS.HEALTH_PROFILE_ENABLED) {
        flags.health_profile_enabled = row.value === true
      } else if (row.key === FLAG_KEYS.REALTIME_QUEUE_ENABLED) {
        flags.realtime_queue_enabled = row.value === true
      } else if (row.key === FLAG_KEYS.AB_TESTING_ENABLED) {
        flags.ab_testing_enabled = row.value === true
      } else if (row.key === FLAG_KEYS.SUPPORT_TICKETS_ENABLED) {
        flags.support_tickets_enabled = row.value === true
      } else if (row.key === FLAG_KEYS.CLINICAL_DECISION_SUPPORT_ENABLED) {
        flags.clinical_decision_support_enabled = row.value === true
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
 * Check if the platform is in maintenance mode
 */
export async function isMaintenanceMode(): Promise<{ enabled: boolean; message: string }> {
  const flags = await getFeatureFlags()
  return {
    enabled: flags.maintenance_mode,
    message: flags.maintenance_message || DEFAULT_FLAGS.maintenance_message,
  }
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
  value: boolean | string | string[],
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

    // Immediately invalidate cache so kill switches take effect
    revalidateTag("feature-flags")

    return { success: true }
  } catch (error) {
    logger.error("Unexpected error", {}, error instanceof Error ? error : new Error(String(error)))
    return { success: false, error: "Unexpected error" }
  }
}

/**
 * Get safety screening symptoms from feature flags
 * Falls back to DEFAULT_SAFETY_SYMPTOMS if unavailable
 */
export async function getSafetyScreeningSymptoms(): Promise<string[]> {
  const flags = await getFeatureFlags()
  return flags.safety_screening_symptoms.length > 0 
    ? flags.safety_screening_symptoms 
    : DEFAULT_SAFETY_SYMPTOMS
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

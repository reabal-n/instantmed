/**
 * Feature Flags - Shared Types & Constants (Client-Safe)
 * 
 * These types and constants can be imported in both client and server components.
 * Server-only database operations remain in lib/feature-flags.ts
 */

// ============================================================================
// CONSTANTS
// ============================================================================

export const FLAG_KEYS = {
  DISABLE_MED_CERT: "disable_med_cert",
  DISABLE_REPEAT_SCRIPTS: "disable_repeat_scripts",
  DISABLE_CONSULTS: "disable_consults",
  BLOCKED_MEDICATION_TERMS: "blocked_medication_terms",
  SAFETY_SCREENING_SYMPTOMS: "safety_screening_symptoms",
  SCRIPT_TODO_ENABLED: "script_todo_enabled",
  BATCH_APPROVE_ENABLED: "batch_approve_enabled",
  CONSENT_VERSIONING_ENABLED: "consent_versioning_enabled",
  HEALTH_PROFILE_ENABLED: "health_profile_enabled",
  REALTIME_QUEUE_ENABLED: "realtime_queue_enabled",
  AB_TESTING_ENABLED: "ab_testing_enabled",
  SUPPORT_TICKETS_ENABLED: "support_tickets_enabled",
  CLINICAL_DECISION_SUPPORT_ENABLED: "clinical_decision_support_enabled",
} as const

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS]

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureFlags {
  disable_med_cert: boolean
  disable_repeat_scripts: boolean
  disable_consults: boolean
  blocked_medication_terms: string[]
  safety_screening_symptoms: string[]
  script_todo_enabled: boolean
  batch_approve_enabled: boolean
  consent_versioning_enabled: boolean
  health_profile_enabled: boolean
  realtime_queue_enabled: boolean
  ab_testing_enabled: boolean
  support_tickets_enabled: boolean
  clinical_decision_support_enabled: boolean
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_SAFETY_SYMPTOMS = [
  'Chest pain or pressure',
  'Severe difficulty breathing',
  'Sudden weakness on one side (stroke signs)',
  'Severe allergic reaction (swelling, can\'t breathe)',
  'Thoughts of self-harm or suicide',
]

export const DEFAULT_FLAGS: FeatureFlags = {
  disable_med_cert: false,
  disable_repeat_scripts: false,
  disable_consults: false,
  blocked_medication_terms: [],
  safety_screening_symptoms: DEFAULT_SAFETY_SYMPTOMS,
  script_todo_enabled: true,
  batch_approve_enabled: false,
  consent_versioning_enabled: false,
  health_profile_enabled: false,
  realtime_queue_enabled: false,
  ab_testing_enabled: false,
  support_tickets_enabled: false,
  clinical_decision_support_enabled: false,
}

// ============================================================================
// HELPERS (Client-Safe)
// ============================================================================

/**
 * Get flag display info
 */
export function getFlagInfo(key: FlagKey): { label: string; description: string } {
  const info: Record<FlagKey, { label: string; description: string }> = {
    disable_med_cert: {
      label: "Disable Medical Certificates",
      description: "Temporarily disable the medical certificate service",
    },
    disable_repeat_scripts: {
      label: "Disable Repeat Scripts",
      description: "Temporarily disable the repeat prescription service",
    },
    disable_consults: {
      label: "Disable Consultations",
      description: "Temporarily disable the consultation service",
    },
    blocked_medication_terms: {
      label: "Blocked Medication Terms",
      description: "Terms that will block medication requests",
    },
    safety_screening_symptoms: {
      label: "Safety Screening Symptoms",
      description: "Symptoms that trigger safety screening warnings",
    },
    script_todo_enabled: {
      label: "Script To-Do List",
      description: "Enable the Script To-Do list for tracking Parchment prescriptions",
    },
    batch_approve_enabled: {
      label: "Batch Approve",
      description: "Enable batch approval of intakes",
    },
    consent_versioning_enabled: {
      label: "Consent Versioning",
      description: "Enable versioned consent tracking with content hashing",
    },
    health_profile_enabled: {
      label: "Health Profiles",
      description: "Enable patient health profile management",
    },
    realtime_queue_enabled: {
      label: "Realtime Queue",
      description: "Enable real-time updates for the doctor review queue",
    },
    ab_testing_enabled: {
      label: "A/B Testing",
      description: "Enable A/B testing experiment infrastructure",
    },
    support_tickets_enabled: {
      label: "Support Tickets",
      description: "Enable the patient support ticket system",
    },
    clinical_decision_support_enabled: {
      label: "Clinical Decision Support",
      description: "Enable clinical decision support alerts for doctors",
    },
  }
  return info[key]
}

/**
 * Check if a flag is a service kill switch
 */
export function isServiceKillSwitch(key: FlagKey): boolean {
  const killSwitches: FlagKey[] = [
    FLAG_KEYS.DISABLE_MED_CERT,
    FLAG_KEYS.DISABLE_REPEAT_SCRIPTS,
    FLAG_KEYS.DISABLE_CONSULTS,
  ]
  return killSwitches.includes(key)
}

/**
 * Check if a flag is an array type
 */
export function isArrayFlag(key: FlagKey): boolean {
  const arrayFlags: FlagKey[] = [
    FLAG_KEYS.BLOCKED_MEDICATION_TERMS,
    FLAG_KEYS.SAFETY_SCREENING_SYMPTOMS,
  ]
  return arrayFlags.includes(key)
}

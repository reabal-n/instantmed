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

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
  MAINTENANCE_MODE: "maintenance_mode",
  MAINTENANCE_MESSAGE: "maintenance_message",
  // Operational config
  BUSINESS_HOURS_ENABLED: "business_hours_enabled",
  BUSINESS_HOURS_OPEN: "business_hours_open",
  BUSINESS_HOURS_CLOSE: "business_hours_close",
  BUSINESS_HOURS_TIMEZONE: "business_hours_timezone",
  CAPACITY_LIMIT_ENABLED: "capacity_limit_enabled",
  CAPACITY_LIMIT_MAX: "capacity_limit_max",
  URGENT_NOTICE_ENABLED: "urgent_notice_enabled",
  URGENT_NOTICE_MESSAGE: "urgent_notice_message",
  MAINTENANCE_SCHEDULED_START: "maintenance_scheduled_start",
  MAINTENANCE_SCHEDULED_END: "maintenance_scheduled_end",
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
  AI_AUTO_APPROVE_ENABLED: "ai_auto_approve_enabled",
  AUTO_APPROVE_DELAY_MINUTES: "auto_approve_delay_minutes",
  AUTO_APPROVE_RATE_LIMIT_5MIN: "auto_approve_rate_limit_5min",
  AUTO_APPROVE_DAILY_CAP: "auto_approve_daily_cap",
  AUTO_APPROVE_MAX_DURATION_DAYS: "auto_approve_max_duration_days",
} as const

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS]

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureFlags {
  maintenance_mode: boolean
  maintenance_message: string
  disable_med_cert: boolean
  // Operational config
  business_hours_enabled: boolean
  business_hours_open: number
  business_hours_close: number
  business_hours_timezone: string
  capacity_limit_enabled: boolean
  capacity_limit_max: number
  urgent_notice_enabled: boolean
  urgent_notice_message: string
  maintenance_scheduled_start: string | null
  maintenance_scheduled_end: string | null
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
  ai_auto_approve_enabled: boolean
  auto_approve_delay_minutes: number
  auto_approve_rate_limit_5min: number
  auto_approve_daily_cap: number
  auto_approve_max_duration_days: number
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
  maintenance_mode: false,
  maintenance_message: "We're currently performing scheduled maintenance. Please check back shortly — we'll be back online soon.",
  disable_med_cert: false,
  business_hours_enabled: true,
  business_hours_open: 8,
  business_hours_close: 22,
  business_hours_timezone: "Australia/Sydney",
  capacity_limit_enabled: false,
  capacity_limit_max: 100,
  urgent_notice_enabled: false,
  urgent_notice_message: "",
  maintenance_scheduled_start: null,
  maintenance_scheduled_end: null,
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
  ai_auto_approve_enabled: false,
  auto_approve_delay_minutes: 2,
  auto_approve_rate_limit_5min: 10,
  auto_approve_daily_cap: 50,
  auto_approve_max_duration_days: 3,
}

// ============================================================================
// HELPERS (Client-Safe)
// ============================================================================

/**
 * Get flag display info
 */
export function getFlagInfo(key: FlagKey): { label: string; description: string } {
  const info: Record<FlagKey, { label: string; description: string }> = {
    maintenance_mode: {
      label: "Maintenance Mode",
      description: "Close the entire intake form — prevents all new submissions and payments",
    },
    maintenance_message: {
      label: "Maintenance Message",
      description: "Custom message shown to patients when maintenance mode is active",
    },
    business_hours_enabled: {
      label: "Enforce Business Hours",
      description: "Block new requests outside configured hours",
    },
    business_hours_open: {
      label: "Open Hour",
      description: "Opening hour (0-23)",
    },
    business_hours_close: {
      label: "Close Hour",
      description: "Closing hour (0-23)",
    },
    business_hours_timezone: {
      label: "Timezone",
      description: "Timezone for business hours (e.g. Australia/Sydney)",
    },
    capacity_limit_enabled: {
      label: "Capacity Limit",
      description: "Block new requests when daily limit is reached",
    },
    capacity_limit_max: {
      label: "Max Intakes Per Day",
      description: "Maximum intakes per day when limit is enabled",
    },
    urgent_notice_enabled: {
      label: "Urgent Notice",
      description: "Show site-wide notice banner",
    },
    urgent_notice_message: {
      label: "Urgent Notice Message",
      description: "Message shown in the urgent notice banner",
    },
    maintenance_scheduled_start: {
      label: "Scheduled Maintenance Start",
      description: "ISO datetime when maintenance starts",
    },
    maintenance_scheduled_end: {
      label: "Scheduled Maintenance End",
      description: "ISO datetime when maintenance ends",
    },
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
    ai_auto_approve_enabled: {
      label: "AI Auto-Approve Med Certs",
      description: "Automatically approve eligible medical certificates (1-3 day, no flags) within minutes of payment. Doctor batch review still applies.",
    },
    auto_approve_delay_minutes: {
      label: "Auto-Approve Delay (minutes)",
      description: "Minimum wait time after payment before auto-approval triggers. 0 = immediate (in webhook), >0 = handled by retry cron.",
    },
    auto_approve_rate_limit_5min: {
      label: "Auto-Approve Rate Limit (per 5 min)",
      description: "Maximum number of auto-approvals allowed per 5-minute window.",
    },
    auto_approve_daily_cap: {
      label: "Auto-Approve Daily Cap",
      description: "Maximum number of auto-approvals per 24-hour period.",
    },
    auto_approve_max_duration_days: {
      label: "Auto-Approve Max Duration (days)",
      description: "Maximum certificate duration (in days) eligible for auto-approval. Certs longer than this require doctor review.",
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

/**
 * Check if a flag is a string type (not boolean, not array)
 */
export function isStringFlag(key: FlagKey): boolean {
  const stringFlags: FlagKey[] = [
    FLAG_KEYS.MAINTENANCE_MESSAGE,
    FLAG_KEYS.BUSINESS_HOURS_TIMEZONE,
    FLAG_KEYS.URGENT_NOTICE_MESSAGE,
    FLAG_KEYS.MAINTENANCE_SCHEDULED_START,
    FLAG_KEYS.MAINTENANCE_SCHEDULED_END,
  ]
  return stringFlags.includes(key)
}

/**
 * Check if a flag is a number type
 */
export function isNumberFlag(key: FlagKey): boolean {
  const numberFlags: FlagKey[] = [
    FLAG_KEYS.BUSINESS_HOURS_OPEN,
    FLAG_KEYS.BUSINESS_HOURS_CLOSE,
    FLAG_KEYS.CAPACITY_LIMIT_MAX,
    FLAG_KEYS.AUTO_APPROVE_DELAY_MINUTES,
    FLAG_KEYS.AUTO_APPROVE_RATE_LIMIT_5MIN,
    FLAG_KEYS.AUTO_APPROVE_DAILY_CAP,
    FLAG_KEYS.AUTO_APPROVE_MAX_DURATION_DAYS,
  ]
  return numberFlags.includes(key)
}

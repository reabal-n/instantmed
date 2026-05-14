import { revalidatePath } from "next/cache"

import {
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_RECONCILIATION_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"

/**
 * Central staff revalidation helper (Phase 1 of dashboard remaster, 2026-05-11).
 *
 * Server actions used to scatter hardcoded revalidatePath calls across 147
 * sites, each invalidating its own subset of /admin/* and /doctor/* paths.
 * Renaming the surfaces required touching every one of them.
 *
 * This helper is the single chokepoint. All server actions that mutate staff-
 * visible state should call revalidateStaff() instead of revalidatePath
 * directly. Keep this list limited to real staff routes; stale future aliases
 * just add noise.
 */
export interface RevalidateStaffOptions {
  /** Specific intake/case to invalidate. */
  intakeId?: string
  /** Specific patient profile to invalidate. */
  patientId?: string
  /** Also bust the script-writing queue. */
  scripts?: boolean
  /** Also bust the ops/recovery surfaces. */
  ops?: boolean
  /** Also bust the doctor identity surfaces. */
  identity?: boolean
  /**
   * Also bust the admin settings surfaces (clinic, doctors, services,
   * features, settings landing). Use for clinic identity, doctor profile, or
   * feature-flag mutations.
   */
  settings?: boolean
  /**
   * Also bust the email console surfaces (templates, hub, suppression). Use
   * for template edits or email-outbox actions.
   */
  emails?: boolean
  /** Also bust refund/audit admin surfaces. */
  content?: boolean
  /**
   * Bypass: invalidate a specific set of additional paths. Useful when the
   * mutation touches a surface that isn't covered by the named buckets above.
   * Avoid where possible — prefer a named option so the helper keeps the
   * single-source-of-truth property.
   */
  paths?: readonly string[]
}

const STAFF_LANDING_PATHS = [
  "/dashboard",
] as const

const STAFF_PATIENT_LIST_PATHS = [
  "/admin/patients",
  "/doctor/patients",
] as const

const STAFF_OPS_PATHS = [
  STAFF_OPS_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_RECONCILIATION_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
] as const

const STAFF_IDENTITY_PATHS = [
  "/doctor/settings/identity",
  "/doctor/settings",
] as const

const STAFF_SETTINGS_PATHS = [
  "/admin/settings",
  "/admin/clinic",
  "/admin/doctors",
  "/admin/services",
  "/admin/features",
] as const

const STAFF_EMAILS_PATHS = [
  "/admin/emails/hub",
  "/admin/emails/templates",
  "/admin/emails/suppression",
  "/admin/settings/templates",
] as const

const STAFF_CONTENT_PATHS = [
  "/admin/refunds",
  "/admin/audit",
] as const

const STAFF_SCRIPTS_PATHS = [
  "/doctor/scripts",
] as const

export function revalidateStaff(options: RevalidateStaffOptions = {}): void {
  for (const path of STAFF_LANDING_PATHS) {
    revalidatePath(path)
  }

  if (options.intakeId) {
    const id = options.intakeId
    revalidatePath(`/admin/intakes/${id}`)
    revalidatePath(`/doctor/intakes/${id}`)
  }

  if (options.patientId) {
    for (const path of STAFF_PATIENT_LIST_PATHS) {
      revalidatePath(path)
    }
    const id = options.patientId
    revalidatePath(`/admin/patients/${id}`)
    revalidatePath(`/doctor/patients/${id}`)
  }

  if (options.ops) {
    for (const path of STAFF_OPS_PATHS) {
      revalidatePath(path)
    }
  }

  if (options.identity) {
    for (const path of STAFF_IDENTITY_PATHS) {
      revalidatePath(path)
    }
  }

  if (options.settings) {
    for (const path of STAFF_SETTINGS_PATHS) {
      revalidatePath(path)
    }
  }

  if (options.emails) {
    for (const path of STAFF_EMAILS_PATHS) {
      revalidatePath(path)
    }
  }

  if (options.content) {
    for (const path of STAFF_CONTENT_PATHS) {
      revalidatePath(path)
    }
  }

  if (options.scripts) {
    for (const path of STAFF_SCRIPTS_PATHS) {
      revalidatePath(path)
    }
  }

  if (options.paths) {
    for (const path of options.paths) {
      revalidatePath(path)
    }
  }
}

/**
 * Patient-side revalidation. Kept here so action sites don't need a second
 * import to invalidate both a staff surface and the patient's own view.
 */
export interface RevalidatePatientOptions {
  patientId?: string
  intakeId?: string
  /** Bust /patient/settings. */
  settings?: boolean
  /** Bust /patient/documents. */
  documents?: boolean
  /** Bust /patient/followups/{id}. */
  followupId?: string
  /** Bust /account (auth-state-aware landing). */
  account?: boolean
}

export function revalidatePatient(options: RevalidatePatientOptions = {}): void {
  revalidatePath("/patient")
  if (options.intakeId) {
    revalidatePath(`/patient/intakes/${options.intakeId}`)
  }
  if (options.patientId) {
    revalidatePath(`/patient/profile`)
  }
  if (options.settings) {
    revalidatePath("/patient/settings")
  }
  if (options.documents) {
    revalidatePath("/patient/documents")
  }
  if (options.followupId) {
    revalidatePath(`/patient/followups/${options.followupId}`)
  }
  if (options.account) {
    revalidatePath("/account")
  }
}

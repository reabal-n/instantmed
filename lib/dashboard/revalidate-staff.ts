import { revalidatePath, revalidateTag } from "next/cache"

import {
  ADMIN_AUDIT_HREF,
  ADMIN_CERTIFICATE_DETAILS_HREF,
  ADMIN_CLINIC_HREF,
  ADMIN_DOCTORS_HREF,
  ADMIN_EMAIL_SUPPRESSION_HREF,
  ADMIN_EMAIL_TEMPLATE_EDITOR_HREF,
  ADMIN_FEATURES_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_RECONCILIATION_HREF,
  ADMIN_REFUNDS_HREF,
  ADMIN_SERVICES_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildAdminIntakeHref,
  buildDoctorIntakeHref,
  buildPatientIntakeHref,
  buildStaffPatientHref,
  PATIENT_DASHBOARD_HREF,
  PATIENT_DOCUMENTS_HREF,
  PATIENT_MESSAGES_HREF,
  PATIENT_SETTINGS_HREF,
  STAFF_DASHBOARD_HREF,
  STAFF_DOCTOR_PATIENTS_HREF,
  STAFF_DOCTOR_SETTINGS_HREF,
  STAFF_EMAILS_HREF,
  STAFF_IDENTITY_HREF,
  STAFF_OPS_HREF,
  STAFF_PATIENTS_HREF,
  STAFF_SETTINGS_HREF,
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
   * Also bust the email delivery surfaces (templates, queue, suppression). Use
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
  STAFF_DASHBOARD_HREF,
] as const

const STAFF_PATIENT_LIST_PATHS = [
  STAFF_PATIENTS_HREF,
  STAFF_DOCTOR_PATIENTS_HREF,
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
  STAFF_IDENTITY_HREF,
  STAFF_DOCTOR_SETTINGS_HREF,
] as const

const STAFF_SETTINGS_PATHS = [
  STAFF_SETTINGS_HREF,
  ADMIN_CLINIC_HREF,
  ADMIN_DOCTORS_HREF,
  ADMIN_SERVICES_HREF,
  ADMIN_FEATURES_HREF,
  ADMIN_CERTIFICATE_DETAILS_HREF,
] as const

const STAFF_EMAILS_PATHS = [
  STAFF_EMAILS_HREF,
  ADMIN_EMAIL_TEMPLATE_EDITOR_HREF,
  ADMIN_EMAIL_SUPPRESSION_HREF,
] as const

const STAFF_CONTENT_PATHS = [
  ADMIN_REFUNDS_HREF,
  ADMIN_AUDIT_HREF,
] as const

const STAFF_SCRIPTS_PATHS = [
  STAFF_DASHBOARD_HREF,
] as const

export function revalidateStaff(options: RevalidateStaffOptions = {}): void {
  for (const path of STAFF_LANDING_PATHS) {
    revalidatePath(path)
  }

  if (options.intakeId) {
    const id = options.intakeId
    revalidatePath(buildAdminIntakeHref(id))
    revalidatePath(buildDoctorIntakeHref(id))
  }

  if (options.patientId) {
    for (const path of STAFF_PATIENT_LIST_PATHS) {
      revalidatePath(path)
    }
    const id = options.patientId
    revalidatePath(buildStaffPatientHref(id))
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
  /** Bust /patient/messages. */
  messages?: boolean
  /** Bust /account (auth-state-aware landing). */
  account?: boolean
}

export function revalidatePatient(options: RevalidatePatientOptions = {}): void {
  revalidateTag("patient-dashboard")
  revalidateTag("patient-intakes")
  if (options.patientId) {
    revalidateTag(`patient-dashboard-${options.patientId}`)
    revalidateTag(`patient-intakes-${options.patientId}`)
  }

  revalidatePath(PATIENT_DASHBOARD_HREF)
  if (options.intakeId) {
    revalidatePath(buildPatientIntakeHref(options.intakeId))
  }
  if (options.settings) {
    revalidatePath(PATIENT_SETTINGS_HREF)
  }
  if (options.documents) {
    revalidatePath(PATIENT_DOCUMENTS_HREF)
  }
  if (options.messages) {
    revalidatePath(PATIENT_MESSAGES_HREF)
  }
  if (options.account) {
    revalidatePath("/account")
  }
}

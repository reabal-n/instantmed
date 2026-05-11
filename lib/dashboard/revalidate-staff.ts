import { revalidatePath } from "next/cache"

/**
 * Central staff revalidation helper (Phase 1 of dashboard remaster, 2026-05-11).
 *
 * Server actions used to scatter hardcoded revalidatePath calls across 147
 * sites, each invalidating its own subset of /admin/* and /doctor/* paths.
 * Renaming the surfaces required touching every one of them.
 *
 * This helper is the single chokepoint. All server actions that mutate staff-
 * visible state should call revalidateStaff() instead of revalidatePath
 * directly. As surfaces consolidate (Phase 2+), the legacy paths drop out and
 * only the canonical /dashboard, /patients, /cases entries remain.
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
}

const STAFF_LANDING_PATHS = [
  "/dashboard",
  "/admin",
  "/doctor",
  "/doctor/dashboard",
  "/doctor/queue",
] as const

const STAFF_PATIENT_LIST_PATHS = [
  "/patients",
  "/admin/patients",
  "/doctor/patients",
] as const

const STAFF_OPS_PATHS = [
  "/ops",
  "/admin/ops",
  "/admin/ops/intakes-stuck",
  "/admin/ops/parchment",
  "/admin/ops/reconciliation",
  "/admin/ops/sla",
  "/admin/webhook-dlq",
] as const

const STAFF_IDENTITY_PATHS = [
  "/settings/identity",
  "/admin/settings/doctor-identity",
  "/doctor/settings/identity",
] as const

export function revalidateStaff(options: RevalidateStaffOptions = {}): void {
  for (const path of STAFF_LANDING_PATHS) {
    revalidatePath(path)
  }

  if (options.intakeId) {
    const id = options.intakeId
    revalidatePath(`/cases/${id}`)
    revalidatePath(`/admin/intakes/${id}`)
    revalidatePath(`/doctor/intakes/${id}`)
  }

  if (options.patientId) {
    for (const path of STAFF_PATIENT_LIST_PATHS) {
      revalidatePath(path)
    }
    const id = options.patientId
    revalidatePath(`/patients/${id}`)
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
}

/**
 * Patient-side revalidation. Kept here so action sites don't need a second
 * import to invalidate both a staff surface and the patient's own view.
 */
export function revalidatePatient(options: { patientId?: string; intakeId?: string } = {}): void {
  revalidatePath("/patient")
  if (options.intakeId) {
    revalidatePath(`/patient/intakes/${options.intakeId}`)
  }
  if (options.patientId) {
    revalidatePath(`/patient/profile`)
  }
}

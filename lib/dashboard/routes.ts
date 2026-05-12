// ── Canonical staff routes (Phase 1 of dashboard remaster, 2026-05-11) ──────
// These are the source of truth going forward. Legacy ADMIN_*/DOCTOR_* aliases
// are kept below until Phase 2 finishes the surface consolidation.

export const STAFF_DASHBOARD_HREF = "/dashboard" as const
export const STAFF_LEDGER_HREF = "/dashboard/ledger" as const
export const STAFF_PATIENTS_HREF = "/patients" as const
export const STAFF_SCRIPTS_HREF = "/dashboard?status=scripts" as const
export const STAFF_QUEUE_HREF = "/dashboard?status=review" as const
export const STAFF_OPS_HREF = "/ops" as const
export const STAFF_ANALYTICS_HREF = "/analytics" as const
export const STAFF_FINANCE_HREF = "/finance" as const
export const STAFF_EMAILS_HREF = "/emails" as const
export const STAFF_SETTINGS_HREF = "/settings" as const
export const STAFF_IDENTITY_HREF = "/settings/identity" as const

export function buildStaffCaseHref(intakeId: string): string {
  return `/cases/${encodeURIComponent(intakeId)}`
}

export function buildStaffPatientHref(patientId: string): string {
  return `/patients/${encodeURIComponent(patientId)}`
}

// ── Legacy aliases (kept until Phase 2 swaps the actual page locations) ─────
// New callers should use the STAFF_* names above.

export const PATIENT_DASHBOARD_HREF = "/patient" as const
export const DOCTOR_DASHBOARD_HREF = "/doctor/dashboard" as const
export const ADMIN_DASHBOARD_HREF = "/admin" as const
export const ADMIN_INTAKE_LEDGER_HREF = "/admin/intakes" as const
export const ADMIN_DOCTOR_QUEUE_HREF = "/admin?status=review#doctor-queue" as const
export const ADMIN_SCRIPTS_HREF = "/admin?status=scripts#doctor-queue" as const
export const ADMIN_PATIENTS_HREF = "/admin/patients" as const
export const ADMIN_ANALYTICS_HREF = "/admin/analytics" as const
export const ADMIN_FINANCE_HREF = "/admin/finance" as const
export const ADMIN_OPS_HREF = "/admin/ops" as const
export const ADMIN_SETTINGS_HREF = "/admin/settings" as const
export const ADMIN_DOCTOR_IDENTITY_HREF = "/admin/settings/doctor-identity" as const
export const ADMIN_AUDIT_HREF = "/admin/audit" as const
export const ADMIN_EMAIL_HUB_HREF = "/admin/emails/hub" as const
export const ADMIN_REFUNDS_HREF = "/admin/refunds" as const
export const ADMIN_WEBHOOK_DLQ_HREF = "/admin/webhook-dlq" as const
export const ADMIN_PARCHMENT_OPS_HREF = "/admin/ops/parchment" as const
export const ADMIN_STALE_INTAKES_HREF = "/admin/ops/intakes-stuck" as const
export const ADMIN_PATIENT_MERGE_AUDIT_HREF = "/admin/ops/patient-merge-audit" as const
export const ADMIN_PRESCRIBING_IDENTITY_HREF = "/admin/ops/prescribing-identity" as const

export function buildAdminIntakeHref(intakeId: string): string {
  return `/admin/intakes/${encodeURIComponent(intakeId)}`
}

export const QUEUE_STATUS_FILTERS = ["all", "review", "pending_info", "scripts"] as const
export type QueueStatusFilter = (typeof QUEUE_STATUS_FILTERS)[number]

export function parseQueueStatusFilter(
  value: string | string[] | null | undefined,
): QueueStatusFilter {
  const candidate = Array.isArray(value) ? value[0] : value
  return QUEUE_STATUS_FILTERS.includes(candidate as QueueStatusFilter)
    ? (candidate as QueueStatusFilter)
    : "all"
}

function getFirstParam(value: string | string[] | number | undefined): string | undefined {
  if (typeof value === "number") return String(value)
  return Array.isArray(value) ? value[0] : value
}

function getPositiveIntegerParam(value: string | string[] | number | undefined): string | null {
  const candidate = getFirstParam(value)
  if (!candidate) return null

  const parsed = Number(candidate)
  if (!Number.isInteger(parsed) || parsed < 1) return null
  return String(parsed)
}

function getPageSizeParam(value: string | string[] | number | undefined): string | null {
  const candidate = getPositiveIntegerParam(value)
  if (!candidate) return null

  const parsed = Number(candidate)
  return parsed >= 10 && parsed <= 100 ? candidate : null
}

export function buildDoctorDashboardHref(options: {
  status?: string | string[] | QueueStatusFilter | null
  page?: string | string[] | number
  pageSize?: string | string[] | number
} = {}): string {
  const params = new URLSearchParams()
  const status = parseQueueStatusFilter(options.status)
  const page = getPositiveIntegerParam(options.page)
  const pageSize = getPageSizeParam(options.pageSize)

  if (status !== "all") params.set("status", status)
  if (page) params.set("page", page)
  if (pageSize) params.set("pageSize", pageSize)

  const query = params.toString()
  return query ? `${DOCTOR_DASHBOARD_HREF}?${query}` : DOCTOR_DASHBOARD_HREF
}

export const DOCTOR_QUEUE_REVIEW_HREF = buildDoctorDashboardHref({ status: "review" })

export function buildAdminDashboardHref(options: {
  status?: string | string[] | QueueStatusFilter | null
  page?: string | string[] | number
  pageSize?: string | string[] | number
  anchor?: string
} = {}): string {
  const params = new URLSearchParams()
  const status = parseQueueStatusFilter(options.status)
  const page = getPositiveIntegerParam(options.page)
  const pageSize = getPageSizeParam(options.pageSize)

  if (status !== "all") params.set("status", status)
  if (page) params.set("page", page)
  if (pageSize) params.set("pageSize", pageSize)

  const query = params.toString()
  const hash = options.anchor ? `#${options.anchor}` : ""
  return `${ADMIN_DASHBOARD_HREF}${query ? `?${query}` : ""}${hash}`
}

/**
 * Canonical staff dashboard href builder (Phase 2 of dashboard remaster).
 * New code should call this; the admin alias above remains for back-compat
 * until every consumer migrates.
 */
export function buildStaffDashboardHref(options: {
  status?: string | string[] | QueueStatusFilter | null
  page?: string | string[] | number
  pageSize?: string | string[] | number
  anchor?: string
} = {}): string {
  const params = new URLSearchParams()
  const status = parseQueueStatusFilter(options.status)
  const page = getPositiveIntegerParam(options.page)
  const pageSize = getPageSizeParam(options.pageSize)

  if (status !== "all") params.set("status", status)
  if (page) params.set("page", page)
  if (pageSize) params.set("pageSize", pageSize)

  const query = params.toString()
  const hash = options.anchor ? `#${options.anchor}` : ""
  return `${STAFF_DASHBOARD_HREF}${query ? `?${query}` : ""}${hash}`
}

export function buildDoctorQueueRedirectHref(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  return buildDoctorDashboardHref({
    status: searchParams.status,
    page: searchParams.page,
    pageSize: searchParams.pageSize,
  })
}

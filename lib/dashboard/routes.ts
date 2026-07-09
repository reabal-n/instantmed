// ── Canonical staff routes ──────────────────────────────────────────────────
// Shared staff navigation uses STAFF_* routes. Keep ADMIN_* constants only for
// admin pages that still own a real operational surface.

export const STAFF_DASHBOARD_HREF = "/dashboard" as const
export const STAFF_LEDGER_HREF = "/admin/intakes" as const
export const STAFF_PATIENTS_HREF = "/admin/patients" as const
export const STAFF_SCRIPTS_HREF = "/dashboard?status=scripts#doctor-queue" as const
export const STAFF_QUEUE_HREF = "/dashboard?status=review#doctor-queue" as const
export const STAFF_OPS_HREF = "/admin/ops" as const
export const STAFF_ANALYTICS_HREF = "/admin/analytics" as const
export const STAFF_EMAILS_HREF = "/admin/emails/hub" as const
export const STAFF_SETTINGS_HREF = "/admin/settings" as const
export const STAFF_IDENTITY_HREF = "/doctor/settings/identity" as const
export const STAFF_DOCTOR_SETTINGS_HREF = "/doctor/settings" as const
export const STAFF_DOCTOR_SCRIPTS_HREF = STAFF_SCRIPTS_HREF
export const STAFF_DOCTOR_PATIENTS_HREF = "/doctor/patients" as const
export const STAFF_PATIENT_DETAIL_BASE_HREF = "/doctor/patients" as const

export function buildStaffPatientHref(patientId: string): string {
  return `${STAFF_PATIENT_DETAIL_BASE_HREF}/${encodeURIComponent(patientId)}`
}

// ── Public and patient route constants ──────────────────────────────────────

export const REQUEST_HREF = "/request" as const
export const REQUEST_REPEAT_SCRIPT_HREF = "/request?service=repeat-script" as const
export const REQUEST_MED_CERT_HREF = "/request?service=med-cert" as const
export const REQUEST_CONSULT_HREF = "/consult" as const

export function buildRequestServiceHref(options: { service: string; subtype?: string | null }): string {
  if (options.service === "consult" && !options.subtype) {
    return REQUEST_CONSULT_HREF
  }

  const params = new URLSearchParams({ service: options.service })
  if (options.subtype) params.set("subtype", options.subtype)
  return `${REQUEST_HREF}?${params.toString()}`
}

export const PATIENT_DASHBOARD_HREF = "/patient" as const
export const PATIENT_INTAKES_HREF = "/patient/intakes" as const
export const PATIENT_INTAKE_SUCCESS_HREF = "/patient/intakes/success" as const
export const PATIENT_PRESCRIPTIONS_HREF = "/patient/prescriptions" as const
export const PATIENT_DOCUMENTS_HREF = "/patient/documents" as const
export const PATIENT_MESSAGES_HREF = "/patient/messages" as const
export const PATIENT_PAYMENT_HISTORY_HREF = "/patient/payment-history" as const
export const PATIENT_SETTINGS_HREF = "/patient/settings" as const
export const PATIENT_HEALTH_PROFILE_HREF = "/patient/health-profile" as const
export const PATIENT_ONBOARDING_HREF = "/patient/onboarding" as const

export function buildPatientIntakeHref(intakeId: string): string {
  return `${PATIENT_INTAKES_HREF}/${encodeURIComponent(intakeId)}`
}

export function buildPatientIntakeSuccessHref(options: {
  intakeId?: string | null
  paymentRetry?: boolean
} = {}): string {
  const params = new URLSearchParams()
  if (options.intakeId) params.set("intake_id", options.intakeId)
  if (options.paymentRetry) params.set("payment_retry", "1")
  const query = params.toString()
  return query ? `${PATIENT_INTAKE_SUCCESS_HREF}?${query}` : PATIENT_INTAKE_SUCCESS_HREF
}

export function buildPatientMessagesHref(options: { intakeId?: string | null } = {}): string {
  if (!options.intakeId) return PATIENT_MESSAGES_HREF
  const params = new URLSearchParams({ intakeId: options.intakeId })
  return `${PATIENT_MESSAGES_HREF}?${params.toString()}`
}

export function buildPatientSettingsHref(options: { tab?: string | null; anchor?: string | null } = {}): string {
  const params = new URLSearchParams()
  if (options.tab) params.set("tab", options.tab)
  const query = params.toString()
  const hash = options.anchor ? `#${options.anchor}` : ""
  return `${PATIENT_SETTINGS_HREF}${query ? `?${query}` : ""}${hash}`
}

// ── Admin-only route constants ──────────────────────────────────────────────
// Keep constants only for admin pages that still own real operational surfaces.

export const ADMIN_CLINIC_HREF = "/admin/clinic" as const
export const ADMIN_DOCTORS_HREF = "/admin/doctors" as const
export const ADMIN_SERVICES_HREF = "/admin/services" as const
export const ADMIN_FEATURES_HREF = "/admin/features" as const
export const ADMIN_CERTIFICATE_DETAILS_HREF = "/admin/settings/templates" as const
export const ADMIN_AUDIT_HREF = "/admin/audit" as const
export const ADMIN_EMAIL_TEMPLATE_EDITOR_HREF = "/admin/emails/templates" as const
export const ADMIN_EMAIL_SUPPRESSION_HREF = "/admin/emails/suppression" as const
export const ADMIN_REFUNDS_HREF = "/admin/refunds" as const
export const ADMIN_WEBHOOK_DLQ_HREF = "/admin/webhook-dlq" as const
export const ADMIN_PARCHMENT_OPS_HREF = "/admin/ops/parchment" as const
export const ADMIN_STALE_INTAKES_HREF = "/admin/ops/intakes-stuck" as const
export const ADMIN_RECONCILIATION_HREF = "/admin/ops/reconciliation" as const
export const ADMIN_PATIENT_MERGE_AUDIT_HREF = "/admin/ops/patient-merge-audit" as const
export const ADMIN_PRESCRIBING_IDENTITY_HREF = "/admin/ops/prescribing-identity" as const

export function buildStaffLedgerHref(options: {
  q?: string | null
  service?: string | null
  status?: string | null
  workLane?: string | null
  chips?: string[] | null
} = {}): string {
  const params = new URLSearchParams()
  if (options.status) params.set("status", options.status)
  if (options.service) params.set("service", options.service)
  if (options.workLane) params.set("workLane", options.workLane)
  if (options.q) params.set("q", options.q)
  if (options.chips && options.chips.length > 0) {
    params.set("chips", options.chips.join(","))
  }
  const query = params.toString()
  return query ? `${STAFF_LEDGER_HREF}?${query}` : STAFF_LEDGER_HREF
}

export function buildAdminIntakeHref(intakeId: string): string {
  return `/admin/intakes/${encodeURIComponent(intakeId)}`
}

export function buildStaffEmailHubHref(options: {
  tab?: "queue" | null
  intakeId?: string | null
} = {}): string {
  const params = new URLSearchParams()
  if (options.tab) params.set("tab", options.tab)
  if (options.intakeId) params.set("intake_id", options.intakeId)
  const query = params.toString()
  return query ? `${STAFF_EMAILS_HREF}?${query}` : STAFF_EMAILS_HREF
}

export function buildAdminAuditHref(options: { search?: string | null } = {}): string {
  const params = new URLSearchParams()
  if (options.search) params.set("search", options.search)
  const query = params.toString()
  return query ? `${ADMIN_AUDIT_HREF}?${query}` : ADMIN_AUDIT_HREF
}

export const DOCTOR_INTAKE_DETAIL_BASE_HREF = "/doctor/intakes" as const

export function buildDoctorIntakeHref(intakeId: string): string {
  return `${DOCTOR_INTAKE_DETAIL_BASE_HREF}/${encodeURIComponent(intakeId)}`
}

export function buildDoctorDocumentBuilderHref(intakeId: string): string {
  return `${buildDoctorIntakeHref(intakeId)}/document`
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

/**
 * Canonical staff dashboard href builder (Phase 2 of dashboard remaster).
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
  // Resolve directly to the unified `STAFF_DASHBOARD_HREF` instead of the
  // legacy `DOCTOR_DASHBOARD_HREF` alias so `/doctor/queue` bookmarks do not
  // chain through another staff alias. Bare queue aliases retain queue intent
  // by opening the review-filtered cockpit rather than the all-work dashboard.
  const status = parseQueueStatusFilter(searchParams.status)
  return buildStaffDashboardHref({
    status: status === "all" ? "review" : status,
    page: searchParams.page,
    pageSize: searchParams.pageSize,
    anchor: "doctor-queue",
  })
}

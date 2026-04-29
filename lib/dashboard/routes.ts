export const PATIENT_DASHBOARD_HREF = "/patient" as const
export const DOCTOR_DASHBOARD_HREF = "/doctor/dashboard" as const

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

export function buildDoctorQueueRedirectHref(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  return buildDoctorDashboardHref({
    status: searchParams.status,
    page: searchParams.page,
    pageSize: searchParams.pageSize,
  })
}

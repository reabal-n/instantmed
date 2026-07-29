"use server"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import {
  parseQueueStatusFilter,
  type QueueStatusFilter,
  sanitizeQueueSearchQuery,
} from "@/lib/dashboard/routes"
import {
  type DoctorQueueResult,
  getDoctorQueue,
} from "@/lib/data/intakes"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"

interface SearchDoctorQueueInput {
  query: string
  statusFilter: QueueStatusFilter
  page?: number
  pageSize?: number
  allowSeeded?: boolean
  onlySeeded?: boolean
}

export type SearchDoctorQueueResult =
  | { success: true; data: DoctorQueueResult }
  | { success: false; error: string }

/**
 * Search the clinical queue without putting patient identifiers in a URL.
 *
 * The client supplies only search/view preferences. Identity, doctor scope,
 * and seeded-data permission are all derived again inside the trusted server
 * boundary; none of those authority decisions are accepted from the browser.
 */
export async function searchDoctorQueueAction(
  input: SearchDoctorQueueInput,
): Promise<SearchDoctorQueueResult> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const { profile } = auth
  const query = sanitizeQueueSearchQuery(
    input && typeof input.query === "string" ? input.query : "",
  )

  if (!query) {
    return { success: false, error: "Enter a patient name, email, or request reference." }
  }

  const rateLimit = await checkServerActionRateLimit(
    `doctor:queue-search:${profile.id}`,
    "standard",
  )
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error ?? "Too many searches. Please wait and try again." }
  }

  const page = Number.isInteger(input?.page)
    ? Math.min(Math.max(input.page ?? 1, 1), 1000)
    : 1
  const pageSize = Number.isInteger(input?.pageSize)
    ? Math.min(Math.max(input.pageSize ?? 50, 10), 100)
    : 50
  const allowSeeded = hasAdminAccess(profile) && input?.allowSeeded === true
  const onlySeeded = allowSeeded
    && input?.onlySeeded === true
    && process.env.PLAYWRIGHT === "1"

  try {
    const data = await getDoctorQueue({
      page,
      pageSize,
      doctorId: profile.id,
      allowSeeded,
      onlySeeded,
      statusFilter: parseQueueStatusFilter(
        typeof input?.statusFilter === "string" ? input.statusFilter : null,
      ),
      q: query,
    })

    return { success: true, data }
  } catch {
    // Never echo the query or a provider error: PostgREST parse errors can
    // include the raw filter value, which may be a patient name or email.
    return { success: false, error: "The active-request lookup could not be completed." }
  }
}

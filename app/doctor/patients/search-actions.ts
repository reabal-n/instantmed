"use server"

import { requireRoleOrNull } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import {
  getPatientDirectoryPage,
  parsePatientDirectorySearch,
  type PatientDirectoryPage,
} from "@/lib/data/patient-directory"
import {
  parsePatientDirectorySort,
  type PatientDirectorySort,
} from "@/lib/data/patient-directory-sort"
import { checkServerActionRateLimit } from "@/lib/rate-limit/redis"

interface SearchPatientDirectoryInput {
  query: string
  page?: number
  pageSize?: number
  sort?: PatientDirectorySort | string
}

export interface PatientDirectorySearchData extends PatientDirectoryPage {
  page: number
  pageSize: number
}

export type SearchPatientDirectoryResult =
  | { success: true; data: PatientDirectorySearchData }
  | { success: false; error: string }

/**
 * Search the patient directory without placing identity data in a GET URL.
 * Admin-wide versus doctor-touched scope is always derived inside this server
 * boundary and cannot be expanded by a browser-supplied field.
 */
export async function searchPatientDirectoryAction(
  input: SearchPatientDirectoryInput,
): Promise<SearchPatientDirectoryResult> {
  const auth = await requireRoleOrNull(["doctor", "admin"])
  if (!auth) return { success: false, error: "Unauthorized" }

  const query = parsePatientDirectorySearch(
    input && typeof input.query === "string" ? input.query : "",
  )
  if (!query) return { success: false, error: "Enter a patient name, email, or suburb." }

  const rateLimit = await checkServerActionRateLimit(
    `staff:patient-search:${auth.profile.id}`,
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
  const sort = parsePatientDirectorySort(input?.sort)

  try {
    const result = await getPatientDirectoryPage({
      doctorId: hasAdminAccess(auth.profile) ? undefined : auth.profile.id,
      page,
      pageSize,
      search: query,
      sort,
    })

    return { success: true, data: { ...result, page, pageSize } }
  } catch {
    return { success: false, error: "The patient-directory lookup could not be completed." }
  }
}

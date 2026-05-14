import { requireRole } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import {
  getPatientDirectoryPage,
  parsePatientDirectorySearch,
  parsePatientDirectorySort,
} from "@/lib/data/patient-directory"

import { PatientsListClient } from "./patients-list-client"

const PAGE_SIZE = 50

export const metadata = { title: "Patients" }

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string | string[]; sort?: string | string[] }>
}) {
  const auth = await requireRole(["doctor", "admin"])

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1)
  const sort = parsePatientDirectorySort(params.sort)
  const search = parsePatientDirectorySearch(params.q)
  const { patients, total, collapsedCount } = await getPatientDirectoryPage({
    doctorId: hasAdminAccess(auth.profile) ? undefined : auth.profile.id,
    page,
    pageSize: PAGE_SIZE,
    sort,
    search,
  })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <PatientsListClient
      patients={patients}
      currentPage={page}
      totalPages={totalPages}
      totalPatients={total}
      collapsedDuplicateProfiles={collapsedCount}
      currentSort={sort}
      initialSearchQuery={search}
    />
  )
}

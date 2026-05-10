import { requireRole } from "@/lib/auth/helpers"
import { getPatientDirectoryPage, parsePatientDirectorySort } from "@/lib/data/patient-directory"

import { PatientsListClient } from "./patients-list-client"

const PAGE_SIZE = 50

export const metadata = { title: "Patients" }

// Prevent static generation for dynamic auth
export const dynamic = "force-dynamic"

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string | string[] }>
}) {
  await requireRole(["doctor", "admin"])

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1)
  const sort = parsePatientDirectorySort(params.sort)
  const { patients, total, rawTotal, collapsedCount } = await getPatientDirectoryPage({
    page,
    pageSize: PAGE_SIZE,
    sort,
  })
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <PatientsListClient
      patients={patients}
      currentPage={page}
      totalPages={totalPages}
      totalPatients={total}
      rawPatientProfiles={rawTotal}
      collapsedDuplicateProfiles={collapsedCount}
      currentSort={sort}
    />
  )
}

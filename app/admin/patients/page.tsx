import { PatientsListClient } from "@/components/admin/patient-directory-client"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { ADMIN_PATIENTS_HREF, STAFF_PATIENT_DETAIL_BASE_HREF } from "@/lib/dashboard/routes"
import { getPatientDirectoryPage, parsePatientDirectorySort } from "@/lib/data/patient-directory"

const PAGE_SIZE = 50

export const metadata = { title: "Patients" }

export const dynamic = "force-dynamic"

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string | string[] }>
}) {
  await requireRole(["admin"], { redirectTo: "/admin" })

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
    <OperatorPage>
      <OperatorPageHeader
        title="Patients"
        description="Find a patient profile, prescribing identity, and request history."
        backHref="/admin"
        backLabel="Staff cockpit"
      />

      <OperatorScrollArea>
        <div className="min-h-[520px]">
          <PatientsListClient
            patients={patients}
            currentPage={page}
            totalPages={totalPages}
            totalPatients={total}
            rawPatientProfiles={rawTotal}
            collapsedDuplicateProfiles={collapsedCount}
            currentSort={sort}
            baseHref={ADMIN_PATIENTS_HREF}
            patientHrefBase={STAFF_PATIENT_DETAIL_BASE_HREF}
            showHeader={false}
            showAddPatientAction={false}
          />
        </div>
      </OperatorScrollArea>
    </OperatorPage>
  )
}

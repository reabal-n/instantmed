import { PatientsListClient } from "@/components/admin/patient-directory-client"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"
import {
  ADMIN_PATIENT_MERGE_AUDIT_HREF,
  STAFF_DASHBOARD_HREF,
  STAFF_PATIENT_DETAIL_BASE_HREF,
  STAFF_PATIENTS_HREF,
} from "@/lib/dashboard/routes"
import {
  getPatientDirectoryPage,
  parsePatientDirectorySearch,
  parsePatientDirectorySort,
} from "@/lib/data/patient-directory"

import { AddPatientDialog } from "../../doctor/patients/add-patient-dialog"

const PAGE_SIZE = 50

export const metadata = { title: "Patients" }

export const dynamic = "force-dynamic"

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string | string[]; sort?: string | string[] }>
}) {
  // Both roles can land here without 403. Non-admin doctors are scoped
  // to patients they've touched via the doctorId param (same pattern the
  // doctor-portal patient list uses). Admin owner-operators see everything.
  const auth = await requireRole(["admin", "doctor"])

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
    <OperatorPage>
      <OperatorPageHeader
        title="Patients"
        description="Find a patient profile, prescribing identity, and request history."
        backHref={STAFF_DASHBOARD_HREF}
        backLabel="Staff cockpit"
        actions={<AddPatientDialog />}
      />

      <OperatorScrollArea>
        <div className="min-h-[520px]">
          <PatientsListClient
            patients={patients}
            currentPage={page}
            totalPages={totalPages}
            totalPatients={total}
            collapsedDuplicateProfiles={collapsedCount}
            currentSort={sort}
            initialSearchQuery={search}
            baseHref={STAFF_PATIENTS_HREF}
            patientHrefBase={STAFF_PATIENT_DETAIL_BASE_HREF}
            mergeAuditHref={ADMIN_PATIENT_MERGE_AUDIT_HREF}
            showHeader={false}
            showAddPatientAction={false}
          />
        </div>
      </OperatorScrollArea>
    </OperatorPage>
  )
}

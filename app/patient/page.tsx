import type { Metadata } from "next"
import { Suspense } from "react"

import { PanelDashboard } from "@/components/patient/panel-dashboard"
import type { ProfileData } from "@/components/patient/profile-todo-card"
import { Skeleton } from "@/components/ui/skeleton"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getPatientDashboardData } from "@/lib/data/intakes"
import { getPatientUndeliveredCertificates } from "@/lib/data/issued-certificates"
import {
  computePatientProfileCompleteness,
  type PatientProfileCompleteness,
} from "@/lib/data/patient-completeness"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your requests, prescriptions, and account overview.",
}

/** Skeleton matching the patient dashboard layout */
function DashboardSkeleton() {
  return (
    <div className="space-y-12">
      {/* Welcome header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Recent Requests section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Prescriptions section */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-44" />
        <div className="rounded-xl border border-border p-5 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Async server component that fetches dashboard data and renders PanelDashboard */
async function PatientDashboardContent({
  patientId,
  fullName,
  profileData,
  completeness,
}: {
  patientId: string
  fullName: string
  profileData: ProfileData
  completeness: PatientProfileCompleteness
}) {
  const [{ intakes, prescriptions, error }, undeliveredCerts] = await Promise.all([
    getPatientDashboardData(patientId),
    getPatientUndeliveredCertificates(patientId),
  ])

  return (
    <PanelDashboard
      fullName={fullName}
      patientId={patientId}
      intakes={intakes}
      prescriptions={prescriptions}
      error={error}
      profileData={profileData}
      undeliveredCerts={undeliveredCerts}
      completeness={completeness}
    />
  )
}

export default async function PatientDashboard() {
  const authUser = (await getAuthenticatedUserWithProfile())!
  const patientId = authUser.profile.id

  const profileData: ProfileData = {
    profileId: patientId,
    phone: authUser.profile.phone,
    addressLine1: authUser.profile.address_line1,
    suburb: authUser.profile.suburb,
    state: authUser.profile.state,
    postcode: authUser.profile.postcode,
    medicareNumber: authUser.profile.medicare_number,
    medicareIrn: authUser.profile.medicare_irn,
    medicareExpiry: authUser.profile.medicare_expiry,
    consentMyhr: authUser.profile.consent_myhr,
  }

  const completeness = computePatientProfileCompleteness({
    full_name: authUser.profile.full_name,
    date_of_birth: authUser.profile.date_of_birth,
    email: authUser.profile.email,
    phone: authUser.profile.phone,
    sex: authUser.profile.sex,
    address_line1: authUser.profile.address_line1,
    suburb: authUser.profile.suburb,
    state: authUser.profile.state,
    postcode: authUser.profile.postcode,
    medicare_number: authUser.profile.medicare_number,
  })

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PatientDashboardContent
        patientId={patientId}
        fullName={authUser.profile.full_name || "Patient"}
        profileData={profileData}
        completeness={completeness}
      />
    </Suspense>
  )
}

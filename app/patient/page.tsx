import { Suspense } from "react"
import type { Metadata } from "next"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { PanelDashboard } from "@/components/patient/panel-dashboard"
import { type ProfileData } from "@/components/patient/profile-todo-card"
import { getPatientDashboardData } from "@/lib/data/intakes"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { Skeleton } from "@/components/ui/skeleton"

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
}: {
  patientId: string
  fullName: string
  profileData: ProfileData
}) {
  const [dashboardData, subscriptionData, followupData] = await Promise.all([
    getPatientDashboardData(patientId),
    (async () => {
      try {
        const { data } = await createServiceRoleClient()
          .from("subscriptions")
          .select("id, status, credits_remaining, current_period_end")
          .eq("profile_id", patientId)
          .eq("status", "active")
          .single()
        return data
      } catch {
        return null
      }
    })(),
    (async () => {
      try {
        const { data } = await createServiceRoleClient()
          .from("intake_followups")
          .select("id, subtype, milestone, due_at, completed_at, skipped")
          .eq("patient_id", patientId)
          .eq("skipped", false)
          .order("due_at", { ascending: true })
        return data ?? []
      } catch {
        return []
      }
    })(),
  ])

  const { intakes, prescriptions, error } = dashboardData

  return (
    <PanelDashboard
      fullName={fullName}
      patientId={patientId}
      intakes={intakes}
      prescriptions={prescriptions}
      error={error}
      profileData={profileData}
      subscription={subscriptionData}
      followups={followupData}
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

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <PatientDashboardContent
        patientId={patientId}
        fullName={authUser.profile.full_name || "Patient"}
        profileData={profileData}
      />
    </Suspense>
  )
}

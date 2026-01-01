import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getPatientRequests, getPatientRequestStats, formatRequestType, formatCategory } from "@/lib/data/requests"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/patient/dashboard-content"

export default async function PatientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string; paid?: string }>
}) {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const params = await searchParams
  const showOnboardedSuccess = params.onboarded === "true"
  const justPaid = params.onboarded === "payment_success"

  const firstName = authUser.profile.full_name?.split(" ")[0] || "there"
  const stats = await getPatientRequestStats(authUser.profile.id)
  const recentRequests = await getPatientRequests(authUser.profile.id)

  return (
    <DashboardContent
      firstName={firstName}
      stats={stats}
      requests={recentRequests}
      showOnboardedSuccess={showOnboardedSuccess}
      justPaid={justPaid}
      formatRequestType={formatRequestType}
      formatCategory={formatCategory}
    />
  )
}

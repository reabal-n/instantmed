import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getPatientHealthSummary } from "@/lib/data/health-summary"
import { HealthSummaryClient } from "./client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Health Summary",
  description: "View your complete health history and medical records on InstantMed.",
}

export const dynamic = "force-dynamic"

export default async function HealthSummaryPage() {
  // Layout enforces patient role - use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!

  const healthSummary = await getPatientHealthSummary(authUser.profile.id)

  return (
    <HealthSummaryClient
      summary={healthSummary}
    />
  )
}

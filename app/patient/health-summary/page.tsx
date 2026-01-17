import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getPatientHealthSummary } from "@/lib/data/health-summary"
import { HealthSummaryClient } from "./client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Health Summary | InstantMed",
  description: "View your complete health history and medical records on InstantMed.",
}

export const dynamic = "force-dynamic"

export default async function HealthSummaryPage() {
  const authUser = await getAuthenticatedUserWithProfile()
  
  if (!authUser) {
    redirect("/auth/login")
  }
  
  const healthSummary = await getPatientHealthSummary(authUser.profile.id)
  
  return (
    <HealthSummaryClient 
      profile={authUser.profile}
      summary={healthSummary}
    />
  )
}

import type { Metadata } from "next"
import { getCurrentUser, getUserProfile } from "@/lib/auth"
import PathologyFlowClient from "./pathology-flow-client"

export const metadata: Metadata = {
  title: "Request Pathology Referral | Blood Tests Online | InstantMed",
  description: "Request blood tests online. A GP will review and issue your pathology referral same day.",
}

export default async function PathologyRequestPage() {
  const user = await getCurrentUser()
  const profile = user ? await getUserProfile(user.id) : null

  return (
    <PathologyFlowClient
      patientId={user?.id || null}
      isAuthenticated={!!user}
      needsOnboarding={!!user && !profile?.medicare_number}
      userEmail={user?.email}
      userName={profile?.full_name || ""}
    />
  )
}

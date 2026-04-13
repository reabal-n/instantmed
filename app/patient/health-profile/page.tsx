import type { Metadata } from "next"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getHealthProfile } from "@/lib/data/health-profile"

import { HealthProfileClient } from "./health-profile-client"

export const metadata: Metadata = {
  title: "Health Profile",
  description: "Manage your allergies, conditions, medications, and emergency contacts.",
}

export const dynamic = "force-dynamic"

export default async function HealthProfilePage() {
  // Layout enforces patient role - use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!

  const profile = await getHealthProfile(authUser.profile.id)

  return <HealthProfileClient initialProfile={profile} patientId={authUser.profile.id} />
}

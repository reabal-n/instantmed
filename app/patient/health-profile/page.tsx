import { requireRole } from "@/lib/auth"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getHealthProfile } from "@/lib/data/health-profile"
import { HealthProfileClient } from "./health-profile-client"

export const dynamic = "force-dynamic"

export default async function HealthProfilePage() {
  const _authUser = await requireRole(["patient"])
  const user = await getAuthenticatedUserWithProfile()

  if (!user) return null

  const profile = await getHealthProfile(user.profile.id)

  return <HealthProfileClient initialProfile={profile} patientId={user.profile.id} />
}

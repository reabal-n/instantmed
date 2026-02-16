import { requireRole } from "@/lib/auth"
import { getHealthProfile } from "@/lib/data/health-profile"
import { HealthProfileClient } from "./health-profile-client"

export const dynamic = "force-dynamic"

export default async function HealthProfilePage() {
  const authUser = await requireRole(["patient"])

  const profile = await getHealthProfile(authUser.profile.id)

  return <HealthProfileClient initialProfile={profile} patientId={authUser.profile.id} />
}

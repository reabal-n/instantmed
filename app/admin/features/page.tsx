import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { FeatureFlagsClient } from "./features-client"
import { getFeatureFlagsAction } from "@/app/actions/admin-config"

export const dynamic = "force-dynamic"

export default async function FeatureFlagsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (authUser.profile.role !== "admin") {
    redirect("/")
  }

  const flags = await getFeatureFlagsAction()

  return <FeatureFlagsClient initialFlags={flags} />
}

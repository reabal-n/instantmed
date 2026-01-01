import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { NewRequestFlow } from "./new-request-flow"

export default async function NewRequestPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  return <NewRequestFlow patientId={authUser.profile.id} />
}

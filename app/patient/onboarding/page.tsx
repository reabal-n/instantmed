import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OnboardingFlow } from "./onboarding-flow"

export default async function PatientOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const authUser = await getAuthenticatedUserWithProfile()
  const { redirect: redirectTo } = await searchParams

  if (!authUser) {
    redirect("/auth/login")
  }

  if (authUser.profile.role !== "patient") {
    redirect("/doctor")
  }

  // If already completed onboarding, redirect to intended destination or dashboard
  if (authUser.profile.onboarding_completed) {
    redirect(redirectTo || "/patient")
  }

  return (
    <OnboardingFlow profileId={authUser.profile.id} fullName={authUser.profile.full_name} redirectTo={redirectTo} />
  )
}

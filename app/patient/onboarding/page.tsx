import { getOrCreateAuthenticatedUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { OnboardingFlow } from "./onboarding-flow"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export default async function PatientOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const authUser = await getOrCreateAuthenticatedUser()
  const { redirect: redirectTo } = await searchParams

  if (!authUser) {
    redirect("/sign-in?redirect=/patient/onboarding")
  }

  if (authUser.profile.role !== "patient") {
    redirect("/doctor/dashboard")
  }

  // If already completed onboarding, redirect to intended destination or dashboard
  if (authUser.profile.onboarding_completed) {
    redirect(redirectTo || "/patient")
  }

  return (
    <OnboardingFlow profileId={authUser.profile.id} fullName={authUser.profile.full_name} redirectTo={redirectTo} />
  )
}

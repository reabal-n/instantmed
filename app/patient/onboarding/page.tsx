import { redirect } from "next/navigation"

import { getOrCreateAuthenticatedUser } from "@/lib/auth/helpers"
import { normalizePostAuthRedirect } from "@/lib/auth/redirects"

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
  const safeRedirectTo = normalizePostAuthRedirect(redirectTo, "")

  if (!authUser) {
    const target = safeRedirectTo
      ? `/patient/onboarding?redirect=${encodeURIComponent(safeRedirectTo)}`
      : "/patient/onboarding"
    redirect(`/sign-in?redirect=${encodeURIComponent(target)}`)
  }

  if (authUser.profile.role !== "patient") {
    redirect("/doctor/dashboard")
  }

  // If already completed onboarding, redirect to intended destination or dashboard
  if (authUser.profile.onboarding_completed) {
    redirect(safeRedirectTo || "/patient")
  }

  return (
    <OnboardingFlow profileId={authUser.profile.id} fullName={authUser.profile.full_name} redirectTo={safeRedirectTo} />
  )
}

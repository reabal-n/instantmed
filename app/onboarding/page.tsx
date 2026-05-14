import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { PATIENT_ONBOARDING_HREF } from "@/lib/dashboard/routes"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function OnboardingRedirect() {
  redirect(PATIENT_ONBOARDING_HREF)
}

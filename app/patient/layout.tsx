import type React from "react"
import type { Metadata } from "next"
import { requireRole } from "@/lib/auth"
import { PatientShell } from "./patient-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // allowIncompleteOnboarding: true so the /patient/onboarding page can render.
  // Individual child pages (e.g. /patient/page.tsx) enforce onboarding themselves.
  const authUser = await requireRole(["patient"], { allowIncompleteOnboarding: true })

  return (
    <PatientShell
      user={{
        id: authUser.profile.id,
        name: authUser.profile.full_name,
        email: authUser.user.email ?? '',
        // Avatar can be added later if needed
        avatar: undefined,
      }}
    >
      {children}
    </PatientShell>
  )
}

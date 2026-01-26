import type React from "react"
import { requireRole } from "@/lib/auth"
import { PatientShell } from "./patient-shell"

/**
 * Patient Layout - Now uses panel-based AuthenticatedShell
 * 
 * Uses requireRole(["patient"]) which handles:
 * - Authentication (redirects to /sign-in if not logged in)
 * - Role check (redirects doctors/admins to /doctor)
 * - Onboarding check (redirects to /patient/onboarding if incomplete)
 */

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireRole handles auth, role check, and onboarding enforcement
  const authUser = await requireRole(["patient"])

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

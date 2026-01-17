import type React from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { PatientShell } from "./patient-shell"

/**
 * Patient Layout - Now uses panel-based AuthenticatedShell
 * 
 * Changes:
 * - Replaced Navbar + DashboardSidebar + PatientDock
 * - Now uses AuthenticatedShell with LeftRail
 * - "New Request" button opens ServiceSelector panel
 */

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (authUser.profile.role !== "patient") {
    if (authUser.profile.role === "doctor") {
      redirect("/doctor")
    }
    redirect("/auth/login")
  }

  // Check onboarding status
  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

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

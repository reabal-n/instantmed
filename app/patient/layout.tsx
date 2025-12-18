import type React from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { Navbar } from "@/components/shared/navbar"
import { PatientDock } from "@/components/shared/patient-dock"

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

  return (
    <div className="flex min-h-screen flex-col bg-premium-mesh">
      <Navbar variant="patient" userName={authUser.profile.full_name} />
      <div className="flex-1 pt-24 pb-24">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <main className="min-w-0">{children}</main>
        </div>
      </div>
      <PatientDock />
    </div>
  )
}

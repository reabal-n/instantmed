import type React from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { PatientSidebar } from "@/components/shared/patient-sidebar"

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
    <div className="flex min-h-screen flex-col bg-gradient-subtle">
      <Navbar variant="patient" userName={authUser.profile.full_name} />
      <div className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <PatientSidebar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

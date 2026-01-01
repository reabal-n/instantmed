import type React from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { Navbar } from "@/components/shared/navbar"
import { PatientDock } from "@/components/shared/patient-dock"
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar"
import { getPatientRequests } from "@/lib/data/requests"

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "patient") {
    if (authUser.profile.role === "doctor") {
      redirect("/doctor")
    }
    redirect("/sign-in")
  }

  const requests = await getPatientRequests(authUser.user.id)
  const requestCount = requests.length

  return (
    <div className="flex min-h-screen flex-col bg-premium-mesh">
      <Navbar variant="patient" userName={authUser.profile.full_name} />
      <div className="flex-1 pt-24 pb-24">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <DashboardSidebar 
              variant="patient" 
              userName={authUser.profile.full_name}
              userRole="Patient"
              requestCount={requestCount}
            />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
      <PatientDock />
    </div>
  )
}

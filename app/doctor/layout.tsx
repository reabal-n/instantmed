import type React from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { Navbar } from "@/components/shared/navbar"
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar"
import { DoctorDock } from "@/components/shared/doctor-dock"
import { getDoctorDashboardStats } from "@/lib/data/intakes"

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  const isDoctor = authUser.profile.role === "doctor"
  const isAdmin = authUser.profile.role === "admin"

  if (!isDoctor && !isAdmin) {
    if (authUser.profile.role === "patient") {
      redirect("/patient")
    }
    redirect("/sign-in")
  }

  const stats = await getDoctorDashboardStats()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="doctor" userName={authUser.profile.full_name} />
      <div className="flex-1 pb-24">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <DashboardSidebar 
              variant="doctor" 
              userName={authUser.profile.full_name}
              userRole={isAdmin ? "Admin" : "Doctor"}
              pendingCount={stats.in_queue}
            />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
      <DoctorDock pendingCount={stats.in_queue} />
    </div>
  )
}

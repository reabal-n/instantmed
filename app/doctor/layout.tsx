import type React from "react"
import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar"
import { getDoctorDashboardStats } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("doctor-layout")

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    log.warn("No authenticated user in doctor layout - redirecting to login")
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
    <div className="flex min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <DashboardSidebar 
        variant="doctor" 
        userName={authUser.profile.full_name}
        userRole={isAdmin ? "Admin" : "Doctor"}
        isAdmin={isAdmin}
        pendingCount={stats.in_queue}
      />
      <main className="flex-1 min-w-0 lg:ml-0 pt-6 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}

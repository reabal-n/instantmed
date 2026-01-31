import type React from "react"
import { requireRole } from "@/lib/auth"
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar"
import { getDoctorDashboardStats } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { DoctorShell } from "./doctor-shell"

const log = createLogger("doctor-layout")

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require doctor or admin role for all doctor routes
  const authUser = await requireRole(["doctor", "admin"])

  const isAdmin = authUser.profile.role === "admin"

  let stats = { in_queue: 0, total: 0, approved: 0, declined: 0, pending_info: 0, scripts_pending: 0 }
  try {
    stats = await getDoctorDashboardStats()
  } catch (error) {
    log.error("Failed to load dashboard stats for sidebar", {}, error instanceof Error ? error : new Error(String(error)))
  }

  return (
    <DoctorShell>
      <div className="flex min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <DashboardSidebar 
          variant="doctor" 
          userName={authUser.profile.full_name}
          userRole={isAdmin ? "Admin" : "Doctor"}
          isAdmin={isAdmin}
          pendingCount={stats.in_queue}
        />
        <main className="flex-1 min-w-0 lg:ml-0 py-6 px-4 sm:px-6 lg:px-8" data-testid="doctor-main">
          <div className="mx-auto max-w-6xl" data-testid="dashboard-container">
            {children}
          </div>
        </main>
      </div>
    </DoctorShell>
  )
}

import type React from "react"
import type { Metadata } from "next"
import { requireRole } from "@/lib/auth"
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar"
import { getDoctorDashboardStats } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { DoctorShell } from "./doctor-shell"
import { DoctorOnboardingBanner } from "@/components/doctor/onboarding-banner"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

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
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar 
          variant="doctor" 
          userName={authUser.profile.full_name}
          userRole={isAdmin ? "Admin" : "Doctor"}
          isAdmin={isAdmin}
          pendingCount={stats.in_queue}
        />
        <main className="flex-1 min-w-0 lg:border-l border-border/40 py-6 px-4 sm:px-6 lg:px-8" data-testid="doctor-main">
          <div className="mx-auto max-w-5xl" data-testid="dashboard-container">
            <DoctorOnboardingBanner />
            {children}
          </div>
        </main>
      </div>
    </DoctorShell>
  )
}

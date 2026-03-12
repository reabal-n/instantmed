import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { requireRole } from "@/lib/auth"
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar"
import { getDoctorDashboardStats } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { DoctorShell } from "./doctor-shell"
import { DoctorOnboardingBanner } from "@/components/doctor/onboarding-banner"
import { toError } from "@/lib/errors"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const log = createLogger("doctor-layout")

/** AUDIT FIX: Async sidebar wrapper to prevent blocking layout render */
async function DoctorSidebarWithStats({
  userName,
  userRole,
  isAdmin,
}: {
  userName: string
  userRole: string
  isAdmin: boolean
}) {
  let stats = { in_queue: 0, total: 0, approved: 0, declined: 0, pending_info: 0, scripts_pending: 0 }
  try {
    stats = await getDoctorDashboardStats()
  } catch (error) {
    log.error("Failed to load dashboard stats for sidebar", {}, toError(error))
  }

  return (
    <DashboardSidebar
      variant="doctor"
      userName={userName}
      userRole={userRole}
      isAdmin={isAdmin}
      pendingCount={stats.in_queue}
    />
  )
}

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require doctor or admin role for all doctor routes
  const authUser = await requireRole(["doctor", "admin"])

  const isAdmin = authUser.profile.role === "admin"

  return (
    <DoctorShell>
      <div className="flex min-h-screen bg-background">
        {/* Suspense for async stats — invisible fallback preserves layout width without skeleton flash */}
        <Suspense fallback={<div className="hidden lg:block w-[260px] shrink-0" />}>
          <DoctorSidebarWithStats
            userName={authUser.profile.full_name}
            userRole={isAdmin ? "Admin" : "Doctor"}
            isAdmin={isAdmin}
          />
        </Suspense>
        <main className="flex-1 min-w-0 lg:border-l border-border/40 py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6" data-testid="doctor-main">
          <div className="mx-auto max-w-5xl" data-testid="dashboard-container">
            <DoctorOnboardingBanner />
            {children}
          </div>
        </main>
      </div>
    </DoctorShell>
  )
}

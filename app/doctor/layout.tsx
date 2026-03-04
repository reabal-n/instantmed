import type React from "react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { requireRole } from "@/lib/auth"
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar"
import { getDoctorDashboardStats } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import { DoctorShell } from "./doctor-shell"
import { DoctorOnboardingBanner } from "@/components/doctor/onboarding-banner"
import { Skeleton } from "@/components/ui/skeleton"

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
    log.error("Failed to load dashboard stats for sidebar", {}, error instanceof Error ? error : new Error(String(error)))
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
        {/* AUDIT FIX: Wrap async stats fetch in Suspense to prevent blocking page render */}
        <Suspense fallback={<div className="hidden lg:flex w-64 flex-col gap-4 p-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4" /></div>}>
          <DoctorSidebarWithStats
            userName={authUser.profile.full_name}
            userRole={isAdmin ? "Admin" : "Doctor"}
            isAdmin={isAdmin}
          />
        </Suspense>
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

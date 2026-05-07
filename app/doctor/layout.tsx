import type { Metadata } from "next"
import type React from "react"
import { Suspense } from "react"

import { DoctorOnboardingBanner } from "@/components/doctor"
import { DashboardSidebar } from "@/components/shared"
import { resolveProfileAvatarUrl } from "@/lib/account/avatar-storage"
import { requireRole } from "@/lib/auth/helpers"
import { getStaffDisplayRole, hasAdminAccess } from "@/lib/auth/staff-capabilities"
import { getDoctorDashboardStats } from "@/lib/data/intakes"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"

import { DoctorShell } from "./doctor-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const log = createLogger("doctor-layout")

/** AUDIT FIX: Async sidebar wrapper to prevent blocking layout render */
async function DoctorSidebarWithStats({
  userName,
  userRole,
  userAvatar,
  isAdmin,
}: {
  userName: string
  userRole: string
  userAvatar?: string
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
      userAvatar={userAvatar}
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

  const isAdmin = hasAdminAccess(authUser.profile)
  const staffRoleLabel = getStaffDisplayRole(authUser.profile)
  const avatarUrl = await resolveProfileAvatarUrl(authUser.profile.avatar_url)

  return (
    <DoctorShell isAdmin={isAdmin}>
      <div className="flex min-h-screen bg-background">
        {/* Suspense for async stats - invisible fallback preserves layout width without skeleton flash */}
        <Suspense fallback={<div className="hidden lg:block w-[260px] shrink-0" />}>
          <DoctorSidebarWithStats
            userName={authUser.profile.full_name}
            userRole={staffRoleLabel}
            userAvatar={avatarUrl ?? undefined}
            isAdmin={isAdmin}
          />
        </Suspense>
        <main className="flex-1 min-w-0 lg:border-l border-border/40 py-6 px-4 sm:px-6 lg:px-8 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-6" data-testid="doctor-main">
          <div className="mx-auto max-w-5xl" data-testid="dashboard-container">
            <DoctorOnboardingBanner />
            {children}
          </div>
        </main>
      </div>
    </DoctorShell>
  )
}

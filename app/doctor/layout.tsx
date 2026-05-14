import type { Metadata } from "next"
import type React from "react"

import { DoctorOnboardingBanner } from "@/components/doctor"
import { OperatorShell } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { getStaffDisplayRole, hasAdminAccess } from "@/lib/auth/staff-capabilities"
import { EMPTY_STAFF_NAV_COUNTS, getStaffNav } from "@/lib/dashboard/staff-navigation"
import { getStaffNavCounts } from "@/lib/data/staff-nav-counts"
import { getDoctorOnboardingStatus } from "@/lib/doctor/onboarding-status"
import { createLogger } from "@/lib/observability/logger"

import { DoctorShell } from "./doctor-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const log = createLogger("doctor-layout")

/**
 * Phase 1.2 of dashboard remaster (2026-05-11): doctor portal now renders
 * through the unified `OperatorShell` with role-aware nav via `getStaffNav`.
 * `DashboardSidebar variant="doctor"` was retired; `DoctorShell` continues to
 * supply the panel provider, intake notification listener, and bottom-tab
 * mobile nav. The OperatorShell's hamburger mobile nav is suppressed because
 * `DoctorMobileNav` (inside `DoctorShell`) already covers mobile clinical use.
 */
export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require doctor or admin role for all doctor routes.
  const authUser = await requireRole(["doctor", "admin"])

  const isAdmin = hasAdminAccess(authUser.profile)
  const staffRoleLabel = getStaffDisplayRole(authUser.profile)
  const navSections = getStaffNav(authUser.profile)
  const [navCounts, onboardingStatus] = await Promise.all([
    getStaffNavCounts().catch((error) => {
      log.error("Failed to load nav counts for doctor layout", {}, error)
      return EMPTY_STAFF_NAV_COUNTS
    }),
    getDoctorOnboardingStatus(authUser.profile.id).catch((error) => {
      log.error("Failed to load doctor onboarding status", {}, error)
      return null
    }),
  ])

  return (
    <OperatorShell
      userName={authUser.profile.full_name}
      userRole={staffRoleLabel}
      navCounts={navCounts}
      navSections={navSections}
      brandLabel={staffRoleLabel}
      hideMobileHamburger
      mainClassName="lg:border-l border-border/40 py-5 lg:py-5 pb-[calc(7rem+env(safe-area-inset-bottom))]"
      contentMaxWidth="wide"
    >
      <DoctorShell isAdmin={isAdmin}>
        <div className="mx-auto max-w-5xl" data-testid="dashboard-container">
          <DoctorOnboardingBanner data={onboardingStatus} />
          <div data-testid="doctor-main">{children}</div>
        </div>
      </DoctorShell>
    </OperatorShell>
  )
}

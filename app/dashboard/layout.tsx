import "../staff.css"

import type { Metadata } from "next"

import { DoctorShell } from "@/app/doctor/doctor-shell"
import { OperatorShell } from "@/components/operator/operator-shell"
import { requireRole } from "@/lib/auth/helpers"
import {
  getStaffDisplayRole,
  hasAdminAccess,
  hasDoctorAccess,
  hasSupportAccess,
} from "@/lib/auth/staff-capabilities"
import { EMPTY_STAFF_NAV_COUNTS, getStaffNav } from "@/lib/dashboard/staff-navigation"
import { getStaffNavCounts } from "@/lib/data/staff-nav-counts"

export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: { index: false, follow: false },
}

// Match the page's dynamic mode so the layout doesn't try to statically
// render while the page is forced dynamic.
export const dynamic = "force-dynamic"

/**
 * `/dashboard` layout wrap.
 *
 * Missing from Phase 2 of the dashboard remaster: without this file, the
 * page rendered without sidebar, padding, or any of the operator chrome.
 *
 * Auth: page.tsx will also call requireRole, which is intentional (defence
 * in depth). The layout's call is the one that gates sidebar rendering.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await requireRole(["admin", "doctor", "support"])

  const navSections = getStaffNav(authUser.profile)
  const hasClinicalAccess = hasDoctorAccess(authUser.profile)
  const isAdmin = hasAdminAccess(authUser.profile)
  const staffRoleLabel = getStaffDisplayRole(authUser.profile)
  const brandLabel = hasDoctorAccess(authUser.profile)
    ? "Doctor console"
    : hasSupportAccess(authUser.profile)
      ? "Support console"
      : "Staff console"
  const navCounts = await getStaffNavCounts().catch(() => EMPTY_STAFF_NAV_COUNTS)

  return (
    <OperatorShell
      userName={authUser.profile.full_name ?? "Staff"}
      userRole={staffRoleLabel}
      navCounts={navCounts}
      navSections={navSections}
      brandLabel={brandLabel}
      hideMobileHamburger={hasClinicalAccess && !isAdmin}
      mainClassName={hasClinicalAccess
        ? "py-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:border-l lg:border-border/40 lg:py-5 lg:pb-5"
        : undefined}
      contentMaxWidth="wide"
    >
      {hasClinicalAccess ? (
        <DoctorShell isAdmin={isAdmin}>{children}</DoctorShell>
      ) : children}
    </OperatorShell>
  )
}

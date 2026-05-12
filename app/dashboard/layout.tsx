import type { Metadata } from "next"

import { OperatorShell } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { getStaffDisplayRole } from "@/lib/auth/staff-capabilities"
import { EMPTY_STAFF_NAV_COUNTS, getStaffNav } from "@/lib/dashboard/staff-navigation"
import { getStaffNavCounts } from "@/lib/data/staff-nav-counts"

export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: { index: false, follow: false },
}

/**
 * `/dashboard` layout wrap.
 *
 * Missing from Phase 2 of the dashboard remaster: without this file, the
 * page rendered without sidebar, padding, or any of the operator chrome.
 * Mirrors `app/doctor/layout.tsx` and `app/admin/layout.tsx`: role-aware
 * nav via `getStaffNav(profile)`, shared `OperatorShell`, sidebar visible
 * on every staff session.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await requireRole(["admin", "doctor", "support"], { redirectTo: "/sign-in" })

  const navSections = getStaffNav(authUser.profile)
  const staffRoleLabel = getStaffDisplayRole(authUser.profile)
  const navCounts = await getStaffNavCounts().catch(() => EMPTY_STAFF_NAV_COUNTS)

  return (
    <OperatorShell
      userName={authUser.profile.full_name}
      userRole={staffRoleLabel}
      navCounts={navCounts}
      navSections={navSections}
      brandLabel={staffRoleLabel}
    >
      {children}
    </OperatorShell>
  )
}

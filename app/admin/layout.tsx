import "../staff.css"

import type { Metadata } from "next"

import { OperatorShell } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { getStaffDisplayRole } from "@/lib/auth/staff-capabilities"
import { EMPTY_STAFF_NAV_COUNTS, getStaffNav } from "@/lib/dashboard/staff-navigation"
import { getStaffNavCounts } from "@/lib/data/staff-nav-counts"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("admin-layout")

export const metadata: Metadata = {
  title: "Operator Dashboard",
  description: "InstantMed operator dashboard.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Admin shell now also hosts the bounded support ops cockpit. Individual
  // admin data pages remain admin-gated at page level; only explicit ops pages
  // opt support in.
  const authUser = await requireRole(["admin", "support"])
  const staffRoleLabel = getStaffDisplayRole(authUser.profile)
  const navSections = getStaffNav(authUser.profile)
  // Nav badges render nothing for zero AND for unknown, so the empty fallback
  // is visually honest — but the failure itself must reach Sentry (error level
  // with an Error; warn-level logs are never forwarded).
  const navCounts = await getStaffNavCounts().catch((error) => {
    log.error(
      "Failed to load nav counts for admin layout",
      {},
      error instanceof Error ? error : new Error(`nav counts read failed: ${String(error)}`),
    )
    return EMPTY_STAFF_NAV_COUNTS
  })

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

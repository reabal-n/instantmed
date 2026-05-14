import type { Metadata } from "next"

import { OperatorShell } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { getStaffDisplayRole } from "@/lib/auth/staff-capabilities"
import { EMPTY_STAFF_NAV_COUNTS, getStaffNav } from "@/lib/dashboard/staff-navigation"
import { getStaffNavCounts } from "@/lib/data/staff-nav-counts"

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

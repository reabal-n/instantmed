import type { Metadata } from "next"

import { OperatorShell } from "@/components/operator"
import { requireRole } from "@/lib/auth/helpers"
import { getStaffDisplayRole } from "@/lib/auth/staff-capabilities"

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
  // Admin-only. Doctors previously had access to revenue and exception data via
  // createServiceRoleClient-backed widgets. Clinical users stay in the doctor
  // portal; delivery and recovery surfaces are admin-owned under /admin.
  const authUser = await requireRole(["admin"], { redirectTo: "/" })

  return (
    <OperatorShell
      userName={authUser.profile.full_name}
      userRole={getStaffDisplayRole(authUser.profile)}
    >
      {children}
    </OperatorShell>
  )
}

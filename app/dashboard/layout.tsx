import "../staff.css"

import type { Metadata } from "next"

import { StaffLayout } from "@/components/operator/staff-layout"
import { requireRole } from "@/lib/auth/helpers"

export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authUser = await requireRole(["admin", "doctor", "support"])
  return <StaffLayout profile={authUser.profile}>{children}</StaffLayout>
}

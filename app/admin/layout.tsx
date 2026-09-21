import "../staff.css"

import type { Metadata } from "next"

import { StaffLayout } from "@/components/operator/staff-layout"
import { requireRole } from "@/lib/auth/helpers"

export const metadata: Metadata = {
  title: "Operator Dashboard",
  description: "InstantMed operator dashboard.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authUser = await requireRole(["admin", "support"])
  return <StaffLayout profile={authUser.profile}>{children}</StaffLayout>
}

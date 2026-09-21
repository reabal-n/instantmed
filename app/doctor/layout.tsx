import "../staff.css"

import type { Metadata } from "next"

import { StaffLayout } from "@/components/operator/staff-layout"
import { requireRole } from "@/lib/auth/helpers"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const authUser = await requireRole(["doctor", "admin"])
  return <StaffLayout profile={authUser.profile}>{children}</StaffLayout>
}

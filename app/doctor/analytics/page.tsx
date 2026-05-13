import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"

export const dynamic = "force-dynamic"

export default async function DoctorAnalyticsRedirectPage() {
  const { profile } = await requireRole(["doctor", "admin"])

  if (hasAdminAccess(profile)) {
    redirect("/admin/analytics")
  }

  redirect("/dashboard")
}

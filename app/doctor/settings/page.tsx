import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/helpers"
import { hasAdminAccess } from "@/lib/auth/staff-capabilities"

export default async function DoctorSettingsPage() {
  const { profile } = await requireRole(["doctor", "admin"])
  if (hasAdminAccess(profile)) {
    redirect("/admin/settings/doctor-identity")
  }

  redirect("/doctor/settings/identity")
}

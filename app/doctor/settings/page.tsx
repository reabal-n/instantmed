import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/helpers"

export default async function DoctorSettingsPage() {
  const { profile } = await requireRole(["doctor", "admin"])
  if (profile.role === "admin") {
    redirect("/admin/settings/doctor-identity")
  }

  redirect("/doctor/settings/identity")
}

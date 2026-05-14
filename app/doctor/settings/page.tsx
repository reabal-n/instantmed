import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/helpers"
import { STAFF_IDENTITY_HREF } from "@/lib/dashboard/routes"

export default async function DoctorSettingsPage() {
  await requireRole(["doctor", "admin"])

  redirect(STAFF_IDENTITY_HREF)
}

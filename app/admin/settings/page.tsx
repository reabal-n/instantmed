import { redirect } from "next/navigation"

import { requireRole } from "@/lib/auth/helpers"

// Consolidated: feature flag management lives at /admin/features
export default async function AdminSettingsRedirect() {
  await requireRole(["admin"], { redirectTo: "/doctor/dashboard" })

  redirect("/admin/features")
}

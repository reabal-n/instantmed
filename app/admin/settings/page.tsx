import { requireRole } from "@/lib/auth"
import { redirect } from "next/navigation"

// Consolidated: feature flag management lives at /admin/features
export default async function AdminSettingsRedirect() {
  await requireRole(["admin"], { redirectTo: "/doctor/dashboard" })

  redirect("/admin/features")
}

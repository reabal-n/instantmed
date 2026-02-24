import { redirect } from "next/navigation"

// Consolidated: feature flag management lives at /admin/features
export default function AdminSettingsRedirect() {
  redirect("/admin/features")
}

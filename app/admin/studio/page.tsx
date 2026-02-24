import { redirect } from "next/navigation"

// Consolidated: template studio lives at /admin/settings/templates
export default function StudioRedirect() {
  redirect("/admin/settings/templates")
}

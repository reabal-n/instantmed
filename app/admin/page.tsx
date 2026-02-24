import { redirect } from "next/navigation"

// Consolidated: admin dashboard lives at /doctor/admin (accessible by both doctor and admin roles)
export default function AdminRootRedirect() {
  redirect("/doctor/admin")
}

import { redirect } from "next/navigation"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export default async function AdminDashboardPage() {
  // Redirect /admin to /doctor dashboard
  redirect("/doctor")
}

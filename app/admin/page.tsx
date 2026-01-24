import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export default async function AdminDashboardPage() {
  // Require admin role before redirect
  const authUser = await getAuthenticatedUserWithProfile()
  if (!authUser) {
    redirect("/sign-in")
  }
  
  if (authUser.profile.role !== "admin") {
    redirect("/")
  }
  
  // Redirect /admin to /doctor dashboard
  redirect("/doctor")
}

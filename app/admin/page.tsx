import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { getAllRequestsForAdmin, getDoctorDashboardStats } from "@/lib/data/requests"
import { getDashboardAnalytics } from "@/lib/data/analytics"
import { AdminClient } from "./admin-client"
import { isAdminEmail } from "@/lib/env"

export default async function AdminDashboardPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login?redirect=/admin")
  }

  // Get user email from auth user
  const userEmail = authUser.user.email?.toLowerCase() || ""
  
  // Check if user is admin by email or role
  const isAdmin = 
    isAdminEmail(userEmail) ||
    authUser.profile.role === "admin" ||
    authUser.profile.role === "doctor"

  if (!isAdmin) {
    redirect("/patient")
  }

  // Fetch all data
  const [allRequests, stats, analytics] = await Promise.all([
    getAllRequestsForAdmin().catch(() => []),
    getDoctorDashboardStats().catch(() => ({ total: 0, pending: 0, approved: 0, declined: 0, needs_follow_up: 0 })),
    getDashboardAnalytics().catch(() => null),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-premium-mesh">
      <Navbar variant="doctor" userName={authUser.profile.full_name} />
      
      <main className="flex-1 pt-20">
        <AdminClient
          allRequests={allRequests}
          stats={stats}
          analytics={analytics}
          doctorName={authUser.profile.full_name}
        />
      </main>

      <Footer />
    </div>
  )
}

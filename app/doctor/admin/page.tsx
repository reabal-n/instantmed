import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getAllRequestsForAdmin, getDoctorDashboardStats } from "@/lib/data/requests"
import { AdminDashboardClient } from "./admin-dashboard-client"

export default async function AdminDashboardPage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  const [allRequests, stats] = await Promise.all([getAllRequestsForAdmin(), getDoctorDashboardStats()])

  return (
    <AdminDashboardClient
      allRequests={allRequests}
      stats={stats}
      doctorName={profile.full_name}
    />
  )
}

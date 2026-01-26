import { requireRole } from "@/lib/auth"
import { getAllIntakesForAdmin, getDoctorDashboardStats } from "@/lib/data/intakes"
import { AdminDashboardClient } from "./admin-dashboard-client"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  // Layout enforces doctor/admin role
  const { profile } = await requireRole(["doctor", "admin"])

  const results = await Promise.allSettled([
    getAllIntakesForAdmin({ page: 1, pageSize: 50 }),
    getDoctorDashboardStats(),
  ])

  const intakesResult = results[0].status === "fulfilled" 
    ? results[0].value 
    : { data: [] as Awaited<ReturnType<typeof getAllIntakesForAdmin>>["data"], total: 0, page: 1, pageSize: 50 }
  const stats = results[1].status === "fulfilled" 
    ? results[1].value 
    : { total: 0, in_queue: 0, approved: 0, declined: 0, pending_info: 0, scripts_pending: 0 }

  return (
    <AdminDashboardClient
      allIntakes={intakesResult.data || []}
      totalIntakes={intakesResult.total || 0}
      stats={stats}
      doctorName={profile.full_name}
    />
  )
}

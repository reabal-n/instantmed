import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getAllIntakesForAdmin, getDoctorDashboardStats } from "@/lib/data/intakes"
import { AdminDashboardClient } from "./admin-dashboard-client"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  const [intakesResult, stats] = await Promise.all([
    getAllIntakesForAdmin({ page: 1, pageSize: 50 }),
    getDoctorDashboardStats(),
  ])

  return (
    <AdminDashboardClient
      allIntakes={intakesResult.data}
      totalIntakes={intakesResult.total}
      stats={stats}
      doctorName={profile.full_name}
    />
  )
}

import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getAllIntakesForAdmin, getDoctorDashboardStats } from "@/lib/data/intakes"
import { AdminDashboardClient } from "./admin-dashboard-client"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/auth/login")
  }

  const [allIntakes, stats] = await Promise.all([
    getAllIntakesForAdmin(),
    getDoctorDashboardStats(),
  ])

  return (
    <AdminDashboardClient
      allIntakes={allIntakes}
      stats={stats}
      doctorName={profile.full_name}
    />
  )
}

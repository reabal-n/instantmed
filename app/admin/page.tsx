import { AdminDashboardClient } from "@/app/admin/admin-dashboard-client"
import { AdminPulse } from "@/components/admin/admin-pulse"
import { DashboardPageHeader } from "@/components/dashboard"
import { requireRole } from "@/lib/auth/helpers"
import { getAdminPulseData, getAdminPulseFallback } from "@/lib/data/admin-pulse"
import { getAllIntakesForAdmin, getDoctorDashboardStats } from "@/lib/data/intakes"
import type { IntakeWithPatient } from "@/types/db"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  await requireRole(["admin"], { redirectTo: "/" })

  const results = await Promise.allSettled([
    getAllIntakesForAdmin({ page: 1, pageSize: 50 }),
    getDoctorDashboardStats(),
    getAdminPulseData(),
  ])

  const intakesResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: [] as IntakeWithPatient[], total: 0, page: 1, pageSize: 50 }
  const stats = results[1].status === "fulfilled"
    ? results[1].value
    : { total: 0, in_queue: 0, approved: 0, declined: 0, pending_info: 0, scripts_pending: 0 }
  const pulse = results[2].status === "fulfilled"
    ? results[2].value
    : getAdminPulseFallback()

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Admin Dashboard"
        description="Requests first. The pulse is there when you need it, but the queue gets the first screen."
        className="mb-0"
      />

      <div id="intakes">
        <AdminDashboardClient
          allIntakes={intakesResult.data || []}
          totalIntakes={intakesResult.total || 0}
          stats={stats}
        />
      </div>

      <AdminPulse pulse={pulse} />
    </div>
  )
}

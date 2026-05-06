import { Suspense } from "react"

import { AdminDashboardClient } from "@/app/admin/admin-dashboard-client"
import { AdminHubZones } from "@/components/admin/admin-hub-zones"
import { AdminPulse } from "@/components/admin/admin-pulse"
import { YesterdayWidget } from "@/components/admin/yesterday-widget"
import { DashboardPageHeader } from "@/components/dashboard"
import { Card, CardContent } from "@/components/ui/card"
import { requireRole } from "@/lib/auth/helpers"
import { getAdminPulseData, getAdminPulseFallback } from "@/lib/data/admin-pulse"
import { getAllIntakesForAdmin, getDoctorDashboardStats } from "@/lib/data/intakes"
import type { IntakeWithPatient } from "@/types/db"

export const dynamic = "force-dynamic"

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ window?: string }>
}) {
  await requireRole(["admin"], { redirectTo: "/" })
  const params = (await searchParams) ?? {}
  const digestWindow = params.window === "today" ? "today" : "yesterday"

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
        description="A light founder/doctor control room for the queue, patient progress, and the few loose ends worth your focus."
        className="mb-0"
      />

      <AdminPulse pulse={pulse} />

      <AdminHubZones
        inQueue={stats.in_queue}
        scriptsPending={stats.scripts_pending}
        totalIntakes={stats.total}
        pendingInfo={stats.pending_info}
      />

      {/* Mirrors the 8am AEST digest email as a secondary detail view, not
          the primary dashboard story. Streamed so the page paints first. */}
      <Suspense fallback={
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-6 h-48 animate-pulse" />
        </Card>
      }>
        <YesterdayWidget window={digestWindow} />
      </Suspense>

      <div id="intakes">
        <AdminDashboardClient
          allIntakes={intakesResult.data || []}
          totalIntakes={intakesResult.total || 0}
          stats={stats}
        />
      </div>
    </div>
  )
}

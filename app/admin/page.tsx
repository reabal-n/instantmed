import { Suspense } from "react"

import { AdminDashboardClient } from "@/app/admin/admin-dashboard-client"
import { YesterdayWidget } from "@/components/admin/yesterday-widget"
import { Card, CardContent } from "@/components/ui/card"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getAllIntakesForAdmin, getDoctorDashboardStats } from "@/lib/data/intakes"
import type { IntakeWithPatient } from "@/types/db"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const { profile } = (await getAuthenticatedUserWithProfile())!

  const results = await Promise.allSettled([
    getAllIntakesForAdmin({ page: 1, pageSize: 50 }),
    getDoctorDashboardStats(),
  ])

  const intakesResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: [] as IntakeWithPatient[], total: 0, page: 1, pageSize: 50 }
  const stats = results[1].status === "fulfilled"
    ? results[1].value
    : { total: 0, in_queue: 0, approved: 0, declined: 0, pending_info: 0, scripts_pending: 0 }

  return (
    <div className="space-y-8">
      {/* Mirrors the 8am AEST digest email — so the admin view is never
          out of sync with the inbox summary. Streamed via Suspense so the
          rest of the dashboard paints before Stripe/Supabase complete. */}
      <Suspense fallback={
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-6 h-48 animate-pulse" />
        </Card>
      }>
        <YesterdayWidget />
      </Suspense>
      <AdminDashboardClient
        allIntakes={intakesResult.data || []}
        totalIntakes={intakesResult.total || 0}
        stats={stats}
        doctorName={profile.full_name}
      />
    </div>
  )
}

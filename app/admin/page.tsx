import { QueueClient } from "@/app/doctor/queue/queue-client"
import { AdminHubZones } from "@/components/admin/admin-hub-zones"
import { DoctorAvailabilityToggle } from "@/components/doctor/doctor-availability-toggle"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { PanelProvider } from "@/components/panels/panel-provider"
import { requireRole } from "@/lib/auth/helpers"
import { ADMIN_DASHBOARD_HREF, parseQueueStatusFilter, type QueueStatusFilter } from "@/lib/dashboard/routes"
import { type DoctorIdentity, getDoctorIdentity, isDoctorIdentityComplete } from "@/lib/data/doctor-identity"
import {
  getAIApprovedIntakes,
  getDoctorDashboardStats,
  getDoctorQueue,
  getRecentlyCompletedIntakes,
  getTodayEarnings,
} from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"
import type { IntakeWithPatient } from "@/types/db"

const log = createLogger("admin-staff-cockpit")

export const dynamic = "force-dynamic"

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string; status?: string | string[] }>
}) {
  const auth = await requireRole(["admin"], { redirectTo: "/" })
  const { profile } = auth

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || "50", 10)))
  const initialStatusFilter: QueueStatusFilter = parseQueueStatusFilter(params.status)
  const hasExplicitStatusFilter = typeof params.status !== "undefined"

  const results = await Promise.allSettled([
    getDoctorDashboardStats(),
    getDoctorQueue({ page, pageSize, doctorId: profile.id }),
    getAIApprovedIntakes({ limit: 20 }),
    getRecentlyCompletedIntakes({ limit: 8 }),
    getDoctorIdentity(profile.id),
    getTodayEarnings(),
    import("@/app/actions/doctor-availability").then((m) => m.getDoctorAvailabilityAction()),
  ])

  const stats = results[0].status === "fulfilled"
    ? results[0].value
    : { total: 0, in_queue: 0, approved: 0, declined: 0, pending_info: 0, scripts_pending: 0 }
  const queueResult = results[1].status === "fulfilled"
    ? results[1].value
    : { data: [] as IntakeWithPatient[], total: 0, page: 1, pageSize, degraded: true }
  const aiApprovedIntakes = results[2].status === "fulfilled" ? results[2].value : []
  const recentlyCompleted = results[3].status === "fulfilled" ? results[3].value : []
  const doctorIdentity: DoctorIdentity | null = results[4].status === "fulfilled" ? results[4].value : null
  const todayEarnings = results[5].status === "fulfilled" ? results[5].value : 0
  const doctorAvailable = results[6].status === "fulfilled" ? results[6].value.available : true

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const names = ["stats", "queue", "ai-approved", "recently-completed", "identity", "earnings", "availability"]
      log.error(`Failed to fetch staff cockpit ${names[index]}`, { profileId: profile.id }, result.reason)
    }
  })

  return (
    <PanelProvider>
      <OperatorPage>
        <OperatorPageHeader
          title="Staff cockpit"
          description="Admin blockers on top. Clinical queue directly below."
          actions={<DoctorAvailabilityToggle initialAvailable={doctorAvailable} compact />}
        />

        <OperatorScrollArea className="flex flex-col gap-3 space-y-0">
          <AdminHubZones
            compact
            inQueue={stats.in_queue}
            scriptsPending={stats.scripts_pending}
            totalIntakes={stats.total}
            pendingInfo={stats.pending_info}
          />

          <section id="doctor-queue" className="min-h-0 flex-1">
            <QueueClient
              intakes={queueResult.data}
              doctorId={profile.id}
              identityComplete={isDoctorIdentityComplete(doctorIdentity)}
              queueDegraded={queueResult.degraded}
              pagination={{
                page: queueResult.page,
                pageSize: queueResult.pageSize,
                total: queueResult.total,
              }}
              aiApprovedIntakes={aiApprovedIntakes}
              recentlyCompleted={recentlyCompleted}
              todayEarnings={todayEarnings}
              initialStatusFilter={initialStatusFilter}
              hasExplicitStatusFilter={hasExplicitStatusFilter}
              baseHref={ADMIN_DASHBOARD_HREF}
              compactShell
            />
          </section>
        </OperatorScrollArea>
      </OperatorPage>
    </PanelProvider>
  )
}

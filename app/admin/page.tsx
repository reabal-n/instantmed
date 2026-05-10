import { QueueClient } from "@/app/doctor/queue/queue-client"
import { AdminHubZones } from "@/components/admin/admin-hub-zones"
import { OwnerOperatorSetupCard } from "@/components/admin/owner-operator-setup-card"
import { DoctorAvailabilityToggle } from "@/components/doctor/doctor-availability-toggle"
import { OperatorPage, OperatorPageHeader, OperatorScrollArea } from "@/components/operator"
import { StaffCommandPalette } from "@/components/operator/staff-command-palette"
import { PanelProvider } from "@/components/panels/panel-provider"
import { requireRole } from "@/lib/auth/helpers"
import { ADMIN_DASHBOARD_HREF, buildAdminDashboardHref, parseQueueStatusFilter, type QueueStatusFilter } from "@/lib/dashboard/routes"
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
  const parchmentUserId = typeof profile.parchment_user_id === "string" && profile.parchment_user_id.trim()
    ? profile.parchment_user_id.trim()
    : null
  const resumeReviewHref = buildAdminDashboardHref({ status: "review", anchor: "doctor-queue" })

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
          description="Approve requests, write scripts, and open patient profiles from one place."
          actions={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <StaffCommandPalette
                buttonLabel="Staff palette"
                placeholder="Resume reviewing, scripts, patient, case..."
                items={[
                  {
                    id: "resume-reviewing",
                    title: "Resume reviewing",
                    detail: stats.in_queue > 0
                      ? `${stats.in_queue} review case${stats.in_queue === 1 ? "" : "s"} waiting in this cockpit`
                      : "Open the clinical review queue in this cockpit",
                    href: resumeReviewHref,
                    keywords: "resume reviewing continue doctor queue clinical review next case",
                    tone: stats.in_queue > 0 ? "warning" : "neutral",
                    label: "Queue",
                  },
                  {
                    id: "scripts",
                    title: "Open scripts",
                    detail: `${stats.scripts_pending} script${stats.scripts_pending === 1 ? "" : "s"} waiting for send confirmation`,
                    href: buildAdminDashboardHref({ status: "scripts", anchor: "doctor-queue" }),
                    keywords: "script eScript prescribing Parchment awaiting_script",
                    tone: stats.scripts_pending > 0 ? "warning" : "neutral",
                    label: "Scripts",
                  },
                ]}
              />
              <DoctorAvailabilityToggle initialAvailable={doctorAvailable} compact />
            </div>
          )}
        />

        <OperatorScrollArea className="flex flex-col gap-3 space-y-0">
          <AdminHubZones
            compact
            inQueue={stats.in_queue}
            scriptsPending={stats.scripts_pending}
            totalIntakes={stats.total}
            pendingInfo={stats.pending_info}
          />

          <OwnerOperatorSetupCard
            doctorIdentity={doctorIdentity}
            doctorAvailable={doctorAvailable}
            parchmentUserId={parchmentUserId}
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
              doctorAvailable={doctorAvailable}
              compactShell
            />
          </section>
        </OperatorScrollArea>
      </OperatorPage>
    </PanelProvider>
  )
}

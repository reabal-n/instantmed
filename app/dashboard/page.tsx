import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { QueueClient } from "@/app/doctor/queue/queue-client"
import { AdminHubZones } from "@/components/admin/admin-hub-zones"
import { OwnerOperatorSetupCard } from "@/components/admin/owner-operator-setup-card"
import { DoctorAvailabilityToggle } from "@/components/doctor/doctor-availability-toggle"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
  StaffCommandPalette,
  SystemHealthPill,
  TestDataBanner,
  TestDataToggleButton,
} from "@/components/operator"
import { PanelProvider } from "@/components/panels/panel-provider"
import { requireRole } from "@/lib/auth/helpers"
import {
  hasAdminAccess,
  hasDoctorAccess,
  hasSupportAccess,
} from "@/lib/auth/staff-capabilities"
import {
  parseQueueStatusFilter,
  type QueueStatusFilter,
  STAFF_DASHBOARD_HREF,
} from "@/lib/dashboard/routes"
import {
  type DoctorIdentity,
  getDoctorIdentity,
  isDoctorIdentityComplete,
} from "@/lib/data/doctor-identity"
import {
  getAIApprovedIntakes,
  getDoctorDashboardStats,
  getDoctorQueue,
  getRecentlyCompletedIntakes,
  getTodayEarnings,
} from "@/lib/data/intakes"
import { EMPTY_SYSTEM_HEALTH, getSystemHealth } from "@/lib/data/system-health"
import { createLogger } from "@/lib/observability/logger"
import type { IntakeWithPatient } from "@/types/db"

const log = createLogger("staff-dashboard")

export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

/**
 * Canonical staff dashboard.
 *
 * Phase 2 of dashboard remaster (2026-05-12). Renders one role-aware surface
 * for admin, doctor, and support roles. Old `/admin` and `/doctor/dashboard`
 * URLs 307 here.
 *
 * Layout (admin or doctor):
 *   - Header: title + system health pill + command palette + availability toggle
 *   - Compact 3-zone KPI strip (review queue, scripts, recovery) for admin
 *     only; doctor sees the queue header directly.
 *   - Owner-operator setup card if admin and setup is incomplete.
 *   - Queue list (the same `QueueClient` as before).
 *
 * Support role gets redirected to /admin/ops (no clinical surface yet).
 * Future Phase 7 builds a dedicated support cockpit here.
 */
export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    status?: string | string[]
    showTestData?: string
  }>
}) {
  const auth = await requireRole(["admin", "doctor", "support"], { redirectTo: "/sign-in" })
  const { profile } = auth

  // Support role has no clinical surface yet; forward to recovery.
  if (hasSupportAccess(profile) && !hasDoctorAccess(profile) && !hasAdminAccess(profile)) {
    redirect("/admin/ops")
  }

  const isAdmin = hasAdminAccess(profile)
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || "50", 10)))
  const initialStatusFilter: QueueStatusFilter = parseQueueStatusFilter(params.status)
  const hasExplicitStatusFilter = typeof params.status !== "undefined"
  // Test-data toggle (admin-only). `?showTestData=1` opts this page in to
  // seeing the seeded E2E patient in the queue. Gated on `hasAdminAccess`
  // so a doctor with a copy-pasted URL cannot flip the visibility. Banner
  // renders below the header when active so the operator never forgets
  // they're looking at mixed data.
  const showTestData = isAdmin && params.showTestData === "1"

  const results = await Promise.allSettled([
    getDoctorDashboardStats(),
    getDoctorQueue({ page, pageSize, doctorId: profile.id, allowSeeded: showTestData }),
    getAIApprovedIntakes({ limit: 20 }),
    getRecentlyCompletedIntakes({ limit: 8 }),
    getDoctorIdentity(profile.id),
    getTodayEarnings(),
    import("@/app/actions/doctor-availability").then((m) => m.getDoctorAvailabilityAction()),
    getSystemHealth(),
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
  const systemHealth = results[7].status === "fulfilled" ? results[7].value : EMPTY_SYSTEM_HEALTH

  const parchmentUserId = typeof profile.parchment_user_id === "string" && profile.parchment_user_id.trim()
    ? profile.parchment_user_id.trim()
    : null

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const names = [
        "stats",
        "queue",
        "ai-approved",
        "recently-completed",
        "identity",
        "earnings",
        "availability",
        "system-health",
      ]
      log.error(`Failed to fetch staff dashboard ${names[index]}`, { profileId: profile.id }, result.reason)
    }
  })

  const buildStatusHref = (status: QueueStatusFilter) => {
    const search = new URLSearchParams()
    if (status !== "all") search.set("status", status)
    const qs = search.toString()
    return qs ? `${STAFF_DASHBOARD_HREF}?${qs}#doctor-queue` : `${STAFF_DASHBOARD_HREF}#doctor-queue`
  }

  return (
    <PanelProvider>
      <OperatorPage>
        <OperatorPageHeader
          title="Dashboard"
          description="Approve requests, write scripts, and open patient profiles from one place."
          actions={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isAdmin && <TestDataToggleButton active={showTestData} />}
              <SystemHealthPill initial={systemHealth} />
              <StaffCommandPalette
                buttonLabel="Staff palette"
                placeholder="Resume reviewing, scripts, patient, case..."
                items={[
                  {
                    id: "resume-reviewing",
                    title: "Resume reviewing",
                    detail: stats.in_queue > 0
                      ? `${stats.in_queue} review case${stats.in_queue === 1 ? "" : "s"} waiting`
                      : "Open the clinical review queue",
                    href: buildStatusHref("review"),
                    keywords: "resume reviewing continue doctor queue clinical review next case",
                    tone: stats.in_queue > 0 ? "warning" : "neutral",
                    label: "Queue",
                  },
                  {
                    id: "scripts",
                    title: "Open scripts",
                    detail: `${stats.scripts_pending} script${stats.scripts_pending === 1 ? "" : "s"} waiting for send confirmation`,
                    href: buildStatusHref("scripts"),
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
          {showTestData && <TestDataBanner />}
          {isAdmin ? (
            <>
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
            </>
          ) : null}

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
              baseHref={STAFF_DASHBOARD_HREF}
              doctorAvailable={doctorAvailable}
              compactShell
            />
          </section>
        </OperatorScrollArea>
      </OperatorPage>
    </PanelProvider>
  )
}

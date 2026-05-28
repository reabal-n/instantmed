import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { QueueClient } from "@/app/doctor/queue/queue-client"
import { OwnerOperatorSetupCard } from "@/components/admin/owner-operator-setup-card"
import { DoctorAvailabilityToggle } from "@/components/doctor/doctor-availability-toggle"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
  QueuePressureSignal,
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
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"
import {
  type DoctorIdentity,
  getDoctorIdentity,
  isDoctorIdentityComplete,
} from "@/lib/data/doctor-identity"
import {
  getAIApprovedIntakes,
  getDoctorQueue,
  getFormToInboxStats,
  getRecentlyCompletedIntakes,
  getTodayEarnings,
} from "@/lib/data/intakes"
import { EMPTY_SYSTEM_HEALTH, getSystemHealth } from "@/lib/data/system-health"
import { getQueueEnteredAt } from "@/lib/doctor/queue-utils"
import { formatMinutes } from "@/lib/format/dates"
import { createLogger } from "@/lib/observability/logger"
import { cn } from "@/lib/utils"
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
 * for admin, doctor, and support roles. Old `/admin` and doctor entrypoints
 * redirect here from next.config.mjs.
 *
 * Layout (admin or doctor):
 *   - Header: title + system health pill + availability toggle.
 *   - Owner-operator setup/readiness cards when admin setup needs attention.
 *   - Queue list (the same `QueueClient` as before).
 *
 * Support role gets redirected to STAFF_OPS_HREF.
 */
export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    status?: string | string[]
    showTestData?: string
    onlyTestData?: string
  }>
}) {
  const auth = await requireRole(["admin", "doctor", "support"], { redirectTo: "/sign-in" })
  const { profile } = auth

  // Support role has no clinical surface yet; forward to recovery.
  if (hasSupportAccess(profile) && !hasDoctorAccess(profile) && !hasAdminAccess(profile)) {
    redirect(STAFF_OPS_HREF)
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
  // Video-review captures must not blend real queue state with the seeded
  // fixture. Keep this narrower than the admin toggle: local test mode only,
  // and only after the admin-gated test-data opt-in is already active.
  const onlyTestData = showTestData && params.onlyTestData === "1" && process.env.PLAYWRIGHT === "1"

  const results = await Promise.allSettled([
    getDoctorQueue({ page, pageSize, doctorId: profile.id, allowSeeded: showTestData, onlySeeded: onlyTestData }),
    isAdmin ? getAIApprovedIntakes({ limit: 20 }) : Promise.resolve([]),
    isAdmin ? getRecentlyCompletedIntakes({ limit: 8 }) : Promise.resolve([]),
    getDoctorIdentity(profile.id),
    isAdmin ? getTodayEarnings() : Promise.resolve(0),
    getFormToInboxStats(),
    import("@/app/actions/doctor-availability").then((m) => m.getDoctorAvailabilityAction()),
    isAdmin ? getSystemHealth() : Promise.resolve(EMPTY_SYSTEM_HEALTH),
  ])

  const queueResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: [] as IntakeWithPatient[], total: 0, page: 1, pageSize, degraded: true }
  const aiApprovedIntakes = results[1].status === "fulfilled" ? results[1].value : []
  const recentlyCompleted = results[2].status === "fulfilled" ? results[2].value : []
  const doctorIdentity: DoctorIdentity | null = results[3].status === "fulfilled" ? results[3].value : null
  const todayEarnings = results[4].status === "fulfilled" ? results[4].value : 0
  const formToInboxStats = !onlyTestData && results[5].status === "fulfilled" ? results[5].value : null
  const doctorAvailable = results[6].status === "fulfilled" ? results[6].value?.available !== false : true
  const systemHealth = results[7].status === "fulfilled" ? results[7].value : EMPTY_SYSTEM_HEALTH
  const nowMs = Date.now()
  const oldestWaitingEnteredAt = queueResult.data.reduce<string | null>((oldest, intake) => {
    const enteredAt = new Date(getQueueEnteredAt(intake)).getTime()
    if (!Number.isFinite(enteredAt)) return oldest
    if (oldest == null) return getQueueEnteredAt(intake)
    const currentOldest = new Date(oldest).getTime()
    return enteredAt < currentOldest ? getQueueEnteredAt(intake) : oldest
  }, null)
  const oldestWaitingMinutes = oldestWaitingEnteredAt
    ? Math.max(0, Math.floor((nowMs - new Date(oldestWaitingEnteredAt).getTime()) / 60000))
    : null
  const parchmentUserId = typeof profile.parchment_user_id === "string" && profile.parchment_user_id.trim()
    ? profile.parchment_user_id.trim()
    : null
  const formToInboxLabel = formToInboxStats
    ? formToInboxStats.medianMinutes <= 0
      ? "Under 1m"
      : formatMinutes(formToInboxStats.medianMinutes)
    : null

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const names = [
        "queue",
        "ai-approved",
        "recently-completed",
        "identity",
        "earnings",
        "form-to-inbox",
        "availability",
        "system-health",
      ]
      log.error(`Failed to fetch staff dashboard ${names[index]}`, { profileId: profile.id }, result.reason)
    }
  })

  return (
    <PanelProvider>
      <OperatorPage>
        <OperatorPageHeader
          title="Dashboard"
          actions={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex flex-wrap items-center gap-2 border-r border-border/60 pr-2">
                <div
                  data-dashboard-wait-strip
                  className={cn(
                    "hidden flex-none items-center gap-2 lg:flex",
                    formToInboxLabel ? "min-w-[420px]" : "min-w-[220px]",
                  )}
                >
                  {formToInboxLabel ? (
                    <div
                      data-dashboard-median-tile
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/60 bg-white px-3 text-xs font-medium text-muted-foreground shadow-sm shadow-primary/[0.03] dark:bg-card"
                    >
                      <span>Median time to inbox</span>
                      <span className="text-base font-semibold tabular-nums text-foreground">{formToInboxLabel}</span>
                      <span className="rounded-full border border-success-border bg-success-light px-1.5 py-0.5 text-[10px] font-semibold leading-none text-success">
                        target &lt;2h
                      </span>
                    </div>
                  ) : null}
                  <QueuePressureSignal
                    oldestWaitingMinutes={oldestWaitingMinutes}
                    oldestWaitingEnteredAt={oldestWaitingEnteredAt}
                    waitingCaseCount={queueResult.total}
                    showIcon={false}
                    jumpToOldestOnClick
                    className="bg-white shadow-sm shadow-primary/[0.03]"
                  />
                </div>
                {isAdmin && !onlyTestData ? <SystemHealthPill initial={systemHealth} /> : null}
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && !onlyTestData ? <TestDataToggleButton active={showTestData} /> : null}
                <DoctorAvailabilityToggle initialAvailable={doctorAvailable} compact />
              </div>
            </div>
          )}
        />

        <OperatorScrollArea className="flex flex-col gap-3 space-y-0">
          {showTestData ? <TestDataBanner /> : null}

          {/* Owner setup card self-hides when complete (no blocking items). */}
          {isAdmin ? (
            <OwnerOperatorSetupCard
              doctorIdentity={doctorIdentity}
              doctorAvailable={doctorAvailable}
              parchmentUserId={parchmentUserId}
            />
          ) : null}

          {/*
            StaffReadinessPanel, AttributionSourcesCard, and DeclineReasonsCard
            were removed from the dashboard on 2026-05-25. Acquisition + decline
            analytics belong on /admin/analytics, not in the operator's primary
            triage surface; readiness onboarding belongs in /admin/clinic. The
            dashboard's job is one thing: scan → claim → review → next.
          */}

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

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

  const results = await Promise.allSettled([
    getDoctorQueue({ page, pageSize, doctorId: profile.id, allowSeeded: showTestData }),
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
  const formToInboxStats = results[5].status === "fulfilled" ? results[5].value : null
  const doctorAvailable = results[6].status === "fulfilled" ? results[6].value?.available !== false : true
  const systemHealth = results[7].status === "fulfilled" ? results[7].value : EMPTY_SYSTEM_HEALTH
  const oldestWaitingMinutes = queueResult.data.reduce<number | null>((oldest, intake) => {
    const enteredAt = new Date(getQueueEnteredAt(intake)).getTime()
    if (!Number.isFinite(enteredAt)) return oldest
    const minutes = Math.max(0, Math.floor((Date.now() - enteredAt) / 60000))
    return oldest == null ? minutes : Math.max(oldest, minutes)
  }, null)
  const parchmentUserId = typeof profile.parchment_user_id === "string" && profile.parchment_user_id.trim()
    ? profile.parchment_user_id.trim()
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
                <QueuePressureSignal oldestWaitingMinutes={oldestWaitingMinutes} showIcon={false} />
                {isAdmin && <SystemHealthPill initial={systemHealth} />}
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && <TestDataToggleButton active={showTestData} />}
                <DoctorAvailabilityToggle initialAvailable={doctorAvailable} compact />
              </div>
            </div>
          )}
        />

        <OperatorScrollArea className="flex flex-col gap-3 space-y-0">
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
              formToInboxStats={formToInboxStats}
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

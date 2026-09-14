import { Activity } from "lucide-react"
import type { Metadata } from "next"
import nextDynamic from "next/dynamic"
import { redirect } from "next/navigation"

import { QueueClient } from "@/app/doctor/queue/queue-client"
import { OwnerOperatorSetupCard } from "@/components/admin/owner-operator-setup-card"
import { DoctorAvailabilityToggle } from "@/components/doctor/doctor-availability-toggle"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
} from "@/components/operator/operator-page"
import { QueuePressureSignal } from "@/components/operator/queue-pressure-signal"
import {
  TestDataAdminMenu,
  TestDataBanner,
} from "@/components/operator/test-data-banner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { requireRole } from "@/lib/auth/helpers"
import {
  doctorHasCapability,
  hasAdminAccess,
  hasDoctorAccess,
  hasSupportAccess,
} from "@/lib/auth/staff-capabilities"
import {
  buildStaffDashboardHref,
  getCanonicalQueuePage,
  parseQueuePaginationParams,
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
  getDoctorQueue,
  getFormToInboxStats,
  getRecentlyCompletedIntakes,
} from "@/lib/data/intakes"
import { EMPTY_SYSTEM_HEALTH, getSystemHealth, UNKNOWN_SYSTEM_HEALTH } from "@/lib/data/system-health"
import { formatMinutes } from "@/lib/format/dates"
import { createLogger } from "@/lib/observability/logger"
import type { IntakeWithPatient } from "@/types/db"

const log = createLogger("staff-dashboard")

const SystemHealthPill = nextDynamic(() =>
  import("@/components/operator/system-health-pill").then((mod) => mod.SystemHealthPill),
)

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
    q?: string | string[]
    showTestData?: string
    onlyTestData?: string
  }>
}) {
  const auth = await requireRole(["admin", "doctor", "support"])
  const { profile } = auth

  // Support role has no clinical surface yet; forward to recovery.
  if (hasSupportAccess(profile) && !hasDoctorAccess(profile) && !hasAdminAccess(profile)) {
    redirect(STAFF_OPS_HREF)
  }

  const isAdmin = hasAdminAccess(profile)
  const canReviewMedicalCertificates = doctorHasCapability(profile, "review_med_certs")
  const params = await searchParams
  const { page, pageSize } = parseQueuePaginationParams(params)
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

  // Queue searches are intentionally memory-only and travel through an
  // authenticated POST action. Strip legacy q URLs before rendering so a
  // copied/history URL cannot keep patient identifiers in the address bar.
  if (typeof params.q !== "undefined") {
    redirect(buildStaffDashboardHref({
      status: initialStatusFilter,
      page: params.page,
      pageSize: params.pageSize,
      showTestData,
      onlyTestData,
      anchor: "doctor-queue",
    }))
  }

  const results = await Promise.allSettled([
    getDoctorQueue({
      page,
      pageSize,
      doctorId: profile.id,
      allowSeeded: showTestData,
      onlySeeded: onlyTestData,
      statusFilter: initialStatusFilter,
    }),
    // Auto-issued certificates have no reviewing doctor, so they sit outside
    // the per-doctor patient-access boundary: only show them to admins.
    getRecentlyCompletedIntakes({
      limit: 50,
      reviewerId: profile.id,
      includeAutoIssued: isAdmin && canReviewMedicalCertificates,
      allowSeeded: showTestData,
      onlySeeded: onlyTestData,
    }),
    getDoctorIdentity(profile.id),
    getFormToInboxStats(),
    import("@/app/actions/doctor-availability").then((m) => m.getDoctorAvailabilityAction()),
    isAdmin ? getSystemHealth() : Promise.resolve(EMPTY_SYSTEM_HEALTH),
  ])

  const queueResult = results[0].status === "fulfilled"
    ? results[0].value
    : {
        data: [] as IntakeWithPatient[],
        total: 0,
        page: 1,
        pageSize,
        degraded: true,
        statusCounts: null,
        globalStatusCounts: null,
        searchMatchCount: null,
        searchState: "idle" as const,
        oldestWaitingEnteredAt: null,
        oldestWaitingIntakeId: null,
      }
  const canonicalQueuePage = getCanonicalQueuePage({
    page: queueResult.page,
    pageSize: queueResult.pageSize,
    total: queueResult.total,
    visibleCount: queueResult.data.length,
    degraded: Boolean(queueResult.degraded),
  })
  if (canonicalQueuePage !== null) {
    redirect(buildStaffDashboardHref({
      status: initialStatusFilter,
      page: canonicalQueuePage,
      pageSize: params.pageSize,
      showTestData,
      onlyTestData,
      anchor: "doctor-queue",
    }))
  }
  const recentlyCompletedResult = results[1].status === "fulfilled"
    ? results[1].value
    : { data: [], degraded: true, truncated: false }
  const doctorIdentity: DoctorIdentity | null = results[2].status === "fulfilled" ? results[2].value : null
  const formToInboxStats = !onlyTestData && results[3].status === "fulfilled" ? results[3].value : null
  const doctorAvailable = results[4].status === "fulfilled" ? results[4].value?.available !== false : true
  // A failed health read renders as degraded/unknown, never as an all-zero
  // all-clear (the pill would self-hide exactly when the platform is blind).
  const systemHealth = results[5].status === "fulfilled" ? results[5].value : UNKNOWN_SYSTEM_HEALTH
  const nowMs = Date.now()
  const oldestWaitingEnteredAt = queueResult.oldestWaitingEnteredAt
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
  const globalWaitingCaseCount = queueResult.globalStatusCounts?.all ?? null

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      // Must stay index-aligned with the Promise.allSettled array above.
      // `pending-batch-reviews` was removed with the attestation (#428) but
      // left in this list, shifting every later name by one — so a failed
      // system-health load logged as "availability" and nothing ever logged
      // as "system-health".
      const names = [
        "queue",
        "recently-completed",
        "identity",
        "form-to-inbox",
        "availability",
        "system-health",
      ]
      log.error(
        `Failed to fetch staff dashboard ${names[index] ?? `unknown-query-${index}`}`,
        { profileId: profile.id },
        result.reason,
      )
    }
  })

  return (
      <OperatorPage>
        <OperatorPageHeader title="Dashboard" />

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
              controls={(
                <div className="flex flex-wrap items-center gap-2" data-queue-operational-controls>
                  <DoctorAvailabilityToggle initialAvailable={doctorAvailable} compact />
                  <div data-operational-wait>
                    <QueuePressureSignal
                      initialNowMs={nowMs}
                      oldestWaitingMinutes={oldestWaitingMinutes}
                      oldestWaitingEnteredAt={oldestWaitingEnteredAt}
                      waitingCaseCount={globalWaitingCaseCount}
                      showIcon={false}
                      showLabelOnMobile
                      showTarget={false}
                      className="h-11 sm:h-8"
                      jumpToOldestOnClick
                      compact
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="min-h-11 gap-1.5 sm:min-h-8" aria-label="Operational summary">
                        <Activity className="h-3.5 w-3.5" aria-hidden />
                        Operations
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 space-y-3 p-3">
                      <p className="text-sm font-semibold">Operational summary</p>
                      {formToInboxLabel ? (
                        <div data-dashboard-median-tile className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>Median time to inbox</span>
                          <span className="font-semibold tabular-nums text-foreground">{formToInboxLabel}</span>
                        </div>
                      ) : null}
                    </PopoverContent>
                  </Popover>
                  {isAdmin && !onlyTestData ? <SystemHealthPill initial={systemHealth} /> : null}
                  {isAdmin && !onlyTestData ? <TestDataAdminMenu active={showTestData} /> : null}
                </div>
              )}
              intakes={queueResult.data}
              doctorId={profile.id}
              identityComplete={isDoctorIdentityComplete(doctorIdentity)}
              queueDegraded={queueResult.degraded}
              pagination={{
                page: queueResult.page,
                pageSize: queueResult.pageSize,
                total: queueResult.total,
              }}
              recentlyCompleted={recentlyCompletedResult.data}
              recentlyCompletedDegraded={recentlyCompletedResult.degraded}
              recentlyCompletedTruncated={recentlyCompletedResult.truncated}
              statusCounts={queueResult.statusCounts}
              globalStatusCounts={queueResult.globalStatusCounts}
              oldestWaitingIntakeId={queueResult.oldestWaitingIntakeId}
              initialStatusFilter={initialStatusFilter}
              hasExplicitStatusFilter={hasExplicitStatusFilter}
              baseHref={STAFF_DASHBOARD_HREF}
              doctorAvailable={doctorAvailable}
              allowSeededSearch={showTestData}
              onlySeededSearch={onlyTestData}
              compactShell
            />
          </section>
        </OperatorScrollArea>
      </OperatorPage>
  )
}

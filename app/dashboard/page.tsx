import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { QueueClient } from "@/app/doctor/queue/queue-client"
import { OwnerOperatorSetupCard } from "@/components/admin/owner-operator-setup-card"
import { StaffReadinessPanel } from "@/components/admin/staff-readiness-panel"
import { DoctorAvailabilityToggle } from "@/components/doctor/doctor-availability-toggle"
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
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
  getRecentlyCompletedIntakes,
  getTodayEarnings,
} from "@/lib/data/intakes"
import { getStaffReadinessSnapshot } from "@/lib/data/staff-readiness"
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
 * for admin, doctor, and support roles. Old `/admin` and doctor entrypoints
 * redirect here from next.config.mjs.
 *
 * Layout (admin or doctor):
 *   - Header: title + system health pill + availability toggle.
 *   - Owner-operator setup/readiness cards when admin setup needs attention.
 *   - Queue list (the same `QueueClient` as before).
 *
 * Support role gets redirected to STAFF_OPS_HREF (no clinical surface yet).
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
    getAIApprovedIntakes({ limit: 20 }),
    getRecentlyCompletedIntakes({ limit: 8 }),
    getDoctorIdentity(profile.id),
    getTodayEarnings(),
    import("@/app/actions/doctor-availability").then((m) => m.getDoctorAvailabilityAction()),
    getSystemHealth(),
    isAdmin ? getStaffReadinessSnapshot() : Promise.resolve(null),
  ])

  const queueResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: [] as IntakeWithPatient[], total: 0, page: 1, pageSize, degraded: true }
  const aiApprovedIntakes = results[1].status === "fulfilled" ? results[1].value : []
  const recentlyCompleted = results[2].status === "fulfilled" ? results[2].value : []
  const doctorIdentity: DoctorIdentity | null = results[3].status === "fulfilled" ? results[3].value : null
  const todayEarnings = results[4].status === "fulfilled" ? results[4].value : 0
  const doctorAvailable = results[5].status === "fulfilled" ? results[5].value?.available !== false : true
  const systemHealth = results[6].status === "fulfilled" ? results[6].value : EMPTY_SYSTEM_HEALTH
  const staffReadiness = results[7].status === "fulfilled" ? results[7].value : null

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
        "availability",
        "system-health",
        "staff-readiness",
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
              {isAdmin && <TestDataToggleButton active={showTestData} />}
              <SystemHealthPill initial={systemHealth} />
              <DoctorAvailabilityToggle initialAvailable={doctorAvailable} compact />
            </div>
          )}
        />

        <OperatorScrollArea className="flex flex-col gap-3 space-y-0">
          {showTestData && <TestDataBanner />}

          {/* Owner setup card self-hides when complete (no blocking items). */}
          {isAdmin ? (
            <OwnerOperatorSetupCard
              doctorIdentity={doctorIdentity}
              doctorAvailable={doctorAvailable}
              parchmentUserId={parchmentUserId}
            />
          ) : null}

          {isAdmin && staffReadiness ? (
            <StaffReadinessPanel snapshot={staffReadiness} />
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

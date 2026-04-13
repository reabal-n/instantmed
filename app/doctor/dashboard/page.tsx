import { Suspense } from "react"

import { IdentityIncompleteBanner,IntakeMonitor } from "@/components/doctor"
import { DashboardErrorBoundary } from "@/components/doctor/dashboard-error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { type DoctorIdentity,getDoctorIdentity, isDoctorIdentityComplete } from "@/lib/data/doctor-identity"
import { getAIApprovedIntakes, getAutoApprovalMetrics, getDoctorQueue, getIntakeMonitoringStats, getRecentlyCompletedIntakes, getSlaBreachIntakes, getTodayEarnings } from "@/lib/data/intakes"
import { createLogger } from "@/lib/observability/logger"

import { QueueClient } from "../queue/queue-client"
import { DashboardHeader } from "./dashboard-header"

const log = createLogger("doctor-dashboard")

export const metadata = {
  title: "Doctor Dashboard",
}

/** Stats section - fetches monitoring stats, SLA, AI metrics. Identity + earnings come from parent. */
async function DoctorStatsSection({
  profileId,
  doctorIdentity,
  todayEarnings,
}: {
  profileId: string
  doctorIdentity: DoctorIdentity | null
  todayEarnings: number
}) {
  const results = await Promise.allSettled([
    getIntakeMonitoringStats(),
    getSlaBreachIntakes(),
    getAutoApprovalMetrics(),
  ])

  const monitoringStats = results[0].status === "fulfilled"
    ? results[0].value
    : { todaySubmissions: 0, queueSize: 0, paidCount: 0, pendingCount: 0, approvedToday: 0, declinedToday: 0, avgReviewTimeMinutes: null, oldestInQueueMinutes: null }
  const slaData = results[1].status === "fulfilled"
    ? results[1].value
    : { breached: 0, approaching: 0 }
  const autoApprovalMetrics = results[2].status === "fulfilled"
    ? results[2].value
    : null

  // Log failures for monitoring
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const names = ["monitoring", "sla", "ai-metrics"]
      log.error(`Failed to fetch ${names[index]} data`, { profileId }, result.reason)
    }
  })

  const enrichedMonitoringStats = {
    ...monitoringStats,
    slaBreached: slaData.breached,
    slaApproaching: slaData.approaching,
    aiApprovedToday: autoApprovalMetrics?.todayApproved,
    aiRevokedToday: autoApprovalMetrics?.todayRevoked,
    aiAttemptedToday: autoApprovalMetrics?.todayAttempted,
    aiIneligibleToday: autoApprovalMetrics?.todayIneligible,
    todayEarnings,
  }

  const identityComplete = isDoctorIdentityComplete(doctorIdentity)
  const missingFields: string[] = []
  if (!doctorIdentity?.provider_number) missingFields.push("Provider Number")
  if (!doctorIdentity?.ahpra_number) missingFields.push("AHPRA Registration Number")

  return (
    <>
      {!identityComplete && (
        <IdentityIncompleteBanner missingFields={missingFields} />
      )}
      <DashboardErrorBoundary fallbackTitle="Unable to load stats">
        <IntakeMonitor initialStats={enrichedMonitoringStats} />
      </DashboardErrorBoundary>
    </>
  )
}

/** Queue section - fetches the review queue and AI-approved intakes. Identity + earnings come from parent. */
async function DoctorQueueSection({
  profileId,
  page,
  pageSize,
  doctorIdentity,
  todayEarnings,
}: {
  profileId: string
  page: number
  pageSize: number
  doctorIdentity: DoctorIdentity | null
  todayEarnings: number
}) {
  const results = await Promise.allSettled([
    getDoctorQueue({ page, pageSize, doctorId: profileId }),
    getAIApprovedIntakes({ limit: 20 }),
    getRecentlyCompletedIntakes({ limit: 8 }),
  ])

  const queueResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: [], total: 0, page: 1, pageSize }
  const aiApprovedIntakes = results[1].status === "fulfilled"
    ? results[1].value
    : []
  const recentlyCompleted = results[2].status === "fulfilled" ? results[2].value : []

  // Log failures for monitoring
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const names = ["queue", "ai-approved", "recently-completed"]
      log.error(`Failed to fetch ${names[index]} data`, { profileId }, result.reason)
    }
  })

  const identityComplete = isDoctorIdentityComplete(doctorIdentity)

  return (
    <DashboardErrorBoundary fallbackTitle="Unable to load queue">
      <QueueClient
        intakes={queueResult.data}
        doctorId={profileId}
        identityComplete={identityComplete}
        pagination={{
          page: queueResult.page,
          pageSize: queueResult.pageSize,
          total: queueResult.total,
        }}
        aiApprovedIntakes={aiApprovedIntakes}
        recentlyCompleted={recentlyCompleted}
        todayEarnings={todayEarnings}
      />
    </DashboardErrorBoundary>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border/50 bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  )
}

function QueueSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="p-4 pb-3 border-b border-border/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-52" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-border/30">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 sm:px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex gap-1.5 shrink-0 hidden sm:flex">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function DoctorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>
}) {
  // Layout enforces doctor/admin role - use cached profile
  const { profile } = (await getAuthenticatedUserWithProfile())!

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || "50", 10)))

  // Fetch shared data once - deduplicates the 2 redundant DB calls that were in both sections
  const [identityResult, earningsResult, availabilityResult] = await Promise.allSettled([
    getDoctorIdentity(profile.id),
    getTodayEarnings(),
    import("@/app/actions/doctor-availability").then((m) => m.getDoctorAvailabilityAction()),
  ])
  const doctorIdentity = identityResult.status === "fulfilled" ? identityResult.value : null
  const todayEarnings = earningsResult.status === "fulfilled" ? earningsResult.value : 0
  const doctorAvailable = availabilityResult.status === "fulfilled" ? availabilityResult.value.available : true

  if (identityResult.status === "rejected") {
    log.error("Failed to fetch identity data", { profileId: profile.id }, identityResult.reason)
  }
  if (earningsResult.status === "rejected") {
    log.error("Failed to fetch today-earnings data", { profileId: profile.id }, earningsResult.reason)
  }

  return (
    <div className="space-y-4">
      <DashboardHeader initialAvailable={doctorAvailable} />

      {/* Stats - streams in independently */}
      <Suspense fallback={<StatsSkeleton />}>
        <DoctorStatsSection profileId={profile.id} doctorIdentity={doctorIdentity} todayEarnings={todayEarnings} />
      </Suspense>

      {/* Queue - streams in independently */}
      <Suspense fallback={<QueueSkeleton />}>
        <DoctorQueueSection profileId={profile.id} page={page} pageSize={pageSize} doctorIdentity={doctorIdentity} todayEarnings={todayEarnings} />
      </Suspense>
    </div>
  )
}

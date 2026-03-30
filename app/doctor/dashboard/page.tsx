import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getDoctorQueue, getIntakeMonitoringStats, getSlaBreachIntakes, getAIApprovedIntakes, getAutoApprovalMetrics, getRecentlyCompletedIntakes, getTodayEarnings } from "@/lib/data/intakes"
import { getDoctorIdentity, isDoctorIdentityComplete } from "@/lib/data/doctor-identity"
import { QueueClient } from "../queue/queue-client"
import { IntakeMonitor } from "@/components/doctor/intake-monitor"
import { IdentityIncompleteBanner } from "@/components/doctor/identity-incomplete-banner"
import { DashboardErrorBoundary } from "@/components/doctor/dashboard-error-boundary"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("doctor-dashboard")

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Doctor Dashboard",
}

export default async function DoctorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>
}) {
  // Layout enforces doctor/admin role — use cached profile
  const { profile } = (await getAuthenticatedUserWithProfile())!

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || "50", 10)))

  // Fetch data in parallel — graceful degradation via allSettled
  const results = await Promise.allSettled([
    getDoctorQueue({ page, pageSize, doctorId: profile.id }),
    getIntakeMonitoringStats(),
    getSlaBreachIntakes(),
    getDoctorIdentity(profile.id),
    getAIApprovedIntakes({ limit: 20 }),
    getAutoApprovalMetrics(),
    getRecentlyCompletedIntakes({ limit: 8 }),
    getTodayEarnings(),
  ])

  const queueResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: [], total: 0, page: 1, pageSize }
  const monitoringStats = results[1].status === "fulfilled"
    ? results[1].value
    : { todaySubmissions: 0, queueSize: 0, paidCount: 0, pendingCount: 0, approvedToday: 0, declinedToday: 0, avgReviewTimeMinutes: null, oldestInQueueMinutes: null }
  const slaData = results[2].status === "fulfilled"
    ? results[2].value
    : { breached: 0, approaching: 0 }
  const doctorIdentity = results[3].status === "fulfilled"
    ? results[3].value
    : null
  const aiApprovedIntakes = results[4].status === "fulfilled"
    ? results[4].value
    : []
  const autoApprovalMetrics = results[5].status === "fulfilled"
    ? results[5].value
    : null
  const recentlyCompleted = results[6].status === "fulfilled" ? results[6].value : []
  const todayEarnings = results[7].status === "fulfilled" ? results[7].value : 0

  // Log failures for monitoring
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const names = ["queue", "monitoring", "sla", "identity", "ai-approved", "ai-metrics", "recently-completed", "today-earnings"]
      log.error(`Failed to fetch ${names[index]} data`, { profileId: profile.id }, result.reason)
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
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground font-sans">Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Patient requests awaiting your review</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/60 font-mono">
          <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">j</kbd>
          <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">k</kbd>
          <span className="text-muted-foreground/40">navigate</span>
          <span className="mx-1 text-muted-foreground/20">·</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">a</kbd>
          <span className="text-muted-foreground/40">approve</span>
          <span className="mx-1 text-muted-foreground/20">·</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">d</kbd>
          <span className="text-muted-foreground/40">decline</span>
        </div>
      </div>

      {/* Identity Incomplete Banner */}
      {!identityComplete && (
        <IdentityIncompleteBanner missingFields={missingFields} />
      )}

      {/* Live Stats */}
      <DashboardErrorBoundary fallbackTitle="Unable to load stats">
        <IntakeMonitor initialStats={enrichedMonitoringStats} />
      </DashboardErrorBoundary>

      {/* Queue */}
      <DashboardErrorBoundary fallbackTitle="Unable to load queue">
        <QueueClient
          intakes={queueResult.data}
          doctorId={profile.id}
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
    </div>
  )
}

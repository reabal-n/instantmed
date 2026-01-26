import { requireRole } from "@/lib/auth"
import { getDoctorQueue, getIntakeMonitoringStats, getDoctorPersonalStats, getSlaBreachIntakes } from "@/lib/data/intakes"
import { getDoctorIdentity, isDoctorIdentityComplete } from "@/lib/data/doctor-identity"
import { QueueClient } from "./queue/queue-client"
import { IntakeMonitor } from "@/components/doctor/intake-monitor"
import { DoctorPerformance } from "@/components/doctor/doctor-performance"
import { IdentityIncompleteBanner } from "@/components/doctor/identity-incomplete-banner"
import { DashboardErrorBoundary } from "@/components/doctor/dashboard-error-boundary"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("doctor-dashboard")

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Doctor Dashboard | InstantMed",
}

export default async function DoctorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>
}) {
  // Layout already enforces doctor/admin role, but page needs profile
  const { profile } = await requireRole(["doctor", "admin"])

  // Parse pagination params
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || "50", 10)))

  // Fetch all data in parallel for performance - use allSettled for graceful degradation
  const results = await Promise.allSettled([
    getDoctorQueue({ page, pageSize }),
    getIntakeMonitoringStats(),
    getDoctorPersonalStats(profile.id),
    getSlaBreachIntakes(),
    getDoctorIdentity(profile.id),
  ])

  // Extract results with sensible fallbacks
  const queueResult = results[0].status === "fulfilled" 
    ? results[0].value 
    : { data: [], total: 0, page: 1, pageSize }
  const monitoringStats = results[1].status === "fulfilled" 
    ? results[1].value 
    : { todaySubmissions: 0, queueSize: 0, paidCount: 0, pendingCount: 0, approvedToday: 0, declinedToday: 0, avgReviewTimeMinutes: null, oldestInQueueMinutes: null }
  const personalStats = results[2].status === "fulfilled" 
    ? results[2].value 
    : { reviewedToday: 0, approvedToday: 0, declinedToday: 0, avgReviewTimeMinutes: null, approvalRate: null, reviewedThisWeek: 0, reviewedThisMonth: 0 }
  const slaData = results[3].status === "fulfilled" 
    ? results[3].value 
    : { breached: 0, approaching: 0 }
  const doctorIdentity = results[4].status === "fulfilled" 
    ? results[4].value 
    : null

  // Log any failures for monitoring
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const names = ["queue", "monitoring", "personal", "sla", "identity"]
      log.error(`Failed to fetch ${names[index]} data`, { profileId: profile.id }, result.reason)
    }
  })

  // Merge SLA data into monitoring stats
  const enrichedMonitoringStats = {
    ...monitoringStats,
    slaBreached: slaData.breached,
    slaApproaching: slaData.approaching,
  }

  // Check if certificate identity is complete
  const identityComplete = isDoctorIdentityComplete(doctorIdentity)
  const missingFields: string[] = []
  if (!doctorIdentity?.provider_number) missingFields.push("Provider Number")
  if (!doctorIdentity?.ahpra_number) missingFields.push("AHPRA Registration Number")

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Review Queue</h1>
        <p className="text-muted-foreground">Patient requests awaiting your review</p>
      </div>

      {/* Identity Incomplete Banner */}
      {!identityComplete && (
        <IdentityIncompleteBanner missingFields={missingFields} />
      )}

      {/* Monitoring and Performance Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardErrorBoundary fallbackTitle="Unable to load monitoring stats">
          <IntakeMonitor initialStats={enrichedMonitoringStats} />
        </DashboardErrorBoundary>
        <DashboardErrorBoundary fallbackTitle="Unable to load performance stats">
          <DoctorPerformance stats={personalStats} doctorName={profile.full_name} />
        </DashboardErrorBoundary>
      </div>
      
      {/* Queue */}
      <DashboardErrorBoundary fallbackTitle="Unable to load queue">
        <QueueClient
          intakes={queueResult.data}
          doctorId={profile.id}
          doctorName={profile.full_name}
          identityComplete={identityComplete}
          pagination={{
            page: queueResult.page,
            pageSize: queueResult.pageSize,
            total: queueResult.total,
          }}
        />
      </DashboardErrorBoundary>
    </div>
  )
}

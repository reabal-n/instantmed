import { requireAuth } from "@/lib/auth"
import { redirect } from "next/navigation"
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
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  // Parse pagination params
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || "50", 10)))

  // Fetch all data in parallel for performance
  let queueResult, monitoringStats, personalStats, slaData, doctorIdentity
  try {
    [queueResult, monitoringStats, personalStats, slaData, doctorIdentity] = await Promise.all([
      getDoctorQueue({ page, pageSize }),
      getIntakeMonitoringStats(),
      getDoctorPersonalStats(profile.id),
      getSlaBreachIntakes(),
      getDoctorIdentity(profile.id),
    ])
  } catch (error) {
    log.error("Data fetch error", { profileId: profile.id }, error)
    throw error // Re-throw to trigger error boundary
  }

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

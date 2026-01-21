import { requireAuth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDoctorQueue, getIntakeMonitoringStats, getDoctorPersonalStats, getSlaBreachIntakes } from "@/lib/data/intakes"
import { getDoctorIdentity, isDoctorIdentityComplete } from "@/lib/data/doctor-identity"
import { QueueClient } from "./queue/queue-client"
import { IntakeMonitor } from "@/components/doctor/intake-monitor"
import { DoctorPerformance } from "@/components/doctor/doctor-performance"
import { IdentityIncompleteBanner } from "@/components/doctor/identity-incomplete-banner"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("doctor-dashboard")

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Doctor Dashboard | InstantMed",
}

export default async function DoctorDashboardPage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/sign-in")
  }

  // Fetch all data in parallel for performance
  let queueResult, monitoringStats, personalStats, slaData, doctorIdentity
  try {
    [queueResult, monitoringStats, personalStats, slaData, doctorIdentity] = await Promise.all([
      getDoctorQueue(),
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
        <IntakeMonitor initialStats={enrichedMonitoringStats} />
        <DoctorPerformance stats={personalStats} doctorName={profile.full_name} />
      </div>
      
      {/* Queue */}
      <QueueClient
        intakes={queueResult.data}
        doctorId={profile.id}
        doctorName={profile.full_name}
        identityComplete={identityComplete}
      />
    </div>
  )
}

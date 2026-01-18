import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getDoctorQueue, getIntakeMonitoringStats, getDoctorPersonalStats, getSlaBreachIntakes } from "@/lib/data/intakes"
import { QueueClient } from "./queue-client"
import { IntakeMonitor } from "@/components/doctor/intake-monitor"
import { DoctorPerformance } from "@/components/doctor/doctor-performance"

export const dynamic = "force-dynamic"

export default async function DoctorQueuePage() {
  const { profile } = await requireAuth("doctor")
  if (!profile) {
    redirect("/auth/login")
  }

  // Fetch all data in parallel for performance
  const [queueResult, monitoringStats, personalStats, slaData] = await Promise.all([
    getDoctorQueue(),
    getIntakeMonitoringStats(),
    getDoctorPersonalStats(profile.id),
    getSlaBreachIntakes(),
  ])

  // Merge SLA data into monitoring stats
  const enrichedMonitoringStats = {
    ...monitoringStats,
    slaBreached: slaData.breached,
    slaApproaching: slaData.approaching,
  }

  return (
    <div className="space-y-6">
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
      />
    </div>
  )
}

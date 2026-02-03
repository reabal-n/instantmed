import { requireRole } from "@/lib/auth"
import { getDoctorQueue, getIntakeMonitoringStats, getDoctorPersonalStats, getSlaBreachIntakes } from "@/lib/data/intakes"
import { getDoctorIdentity, isDoctorIdentityComplete } from "@/lib/data/doctor-identity"
import { QueueClient } from "./queue/queue-client"
import { IntakeMonitor } from "@/components/doctor/intake-monitor"
import { DoctorPerformance } from "@/components/doctor/doctor-performance"
import { IdentityIncompleteBanner } from "@/components/doctor/identity-incomplete-banner"
import { DashboardErrorBoundary } from "@/components/doctor/dashboard-error-boundary"
import { createLogger } from "@/lib/observability/logger"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  FileText,
  Settings
} from "lucide-react"
import Link from "next/link"

const log = createLogger("doctor-dashboard-v2")

export const dynamic = "force-dynamic"

export default async function DoctorDashboardPageV2({
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clinical Dashboard</h1>
          <p className="text-muted-foreground">Patient care workflow and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/doctor/settings/identity">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Identity Incomplete Banner */}
      {!identityComplete && (
        <IdentityIncompleteBanner missingFields={missingFields} />
      )}

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrichedMonitoringStats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              {enrichedMonitoringStats.oldestInQueueMinutes && 
                `Oldest: ${Math.round(enrichedMonitoringStats.oldestInQueueMinutes)} min`
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviewed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personalStats.reviewedToday}</div>
            <p className="text-xs text-muted-foreground">
              {personalStats.approvedToday} approved, {personalStats.declinedToday} declined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {personalStats.approvalRate ? `${Math.round(personalStats.approvalRate)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {personalStats.reviewedThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Review Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {personalStats.avgReviewTimeMinutes ? 
                `${Math.round(personalStats.avgReviewTimeMinutes)}m` : "N/A"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {enrichedMonitoringStats.avgReviewTimeMinutes && 
                `System: ${Math.round(enrichedMonitoringStats.avgReviewTimeMinutes)}m`
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Alerts */}
      {(enrichedMonitoringStats.slaBreached > 0 || enrichedMonitoringStats.slaApproaching > 0) && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Service Level Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {enrichedMonitoringStats.slaBreached > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{enrichedMonitoringStats.slaBreached}</Badge>
                  <span className="text-sm text-orange-800 dark:text-orange-200">
                    requests have breached SLA
                  </span>
                </div>
              )}
              {enrichedMonitoringStats.slaApproaching > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange-600 text-orange-800 dark:border-orange-400 dark:text-orange-200">
                    {enrichedMonitoringStats.slaApproaching}
                  </Badge>
                  <span className="text-sm text-orange-800 dark:text-orange-200">
                    requests approaching SLA
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Queue Section - Primary Focus */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Review Queue
                </span>
                <Badge variant="secondary">
                  {queueResult.total} total
                </Badge>
              </CardTitle>
              <CardDescription>
                Patient requests awaiting your review. Priority: paid requests first.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Stats and Tools */}
        <div className="space-y-6">
          {/* System Monitoring */}
          <DashboardErrorBoundary fallbackTitle="Unable to load monitoring stats">
            <IntakeMonitor initialStats={enrichedMonitoringStats} />
          </DashboardErrorBoundary>

          {/* Personal Performance */}
          <DashboardErrorBoundary fallbackTitle="Unable to load performance stats">
            <DoctorPerformance stats={personalStats} doctorName={profile.full_name} />
          </DashboardErrorBoundary>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/doctor/patients">
                  <Users className="h-4 w-4 mr-2" />
                  My Patients
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/doctor/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  My Analytics
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/doctor/admin">
                  <FileText className="h-4 w-4 mr-2" />
                  All Requests
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Reviewed</span>
                <Badge variant="secondary">{personalStats.reviewedToday}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300">
                  {personalStats.approvedToday}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Declined</span>
                <Badge className="bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300">
                  {personalStats.declinedToday}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Week</span>
                <Badge variant="outline">{personalStats.reviewedThisWeek}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

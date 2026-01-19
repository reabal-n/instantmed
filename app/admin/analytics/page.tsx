import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AnalyticsDashboardClient } from "./analytics-client"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function AnalyticsDashboardPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser || authUser.profile.role !== "admin") {
    redirect("/")
  }

  const supabase = await createClient()

  // Fetch analytics data
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get intake funnel data
  const [
    totalVisitsResult,
    startedIntakesResult,
    paidIntakesResult,
    completedIntakesResult,
    intakesByDayResult,
    intakesByServiceResult,
    intakesBySourceResult,
  ] = await Promise.all([
    // Total page views (from audit logs or approximation)
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .in("event_type", ["page_view", "session_start"]),
    
    // Started intakes (created)
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString()),
    
    // Paid intakes
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .not("paid_at", "is", null),
    
    // Completed intakes
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo.toISOString())
      .eq("status", "approved"),
    
    // Intakes by day (last 30 days)
    supabase
      .from("intakes")
      .select("created_at, status")
      .gte("created_at", monthAgo.toISOString())
      .order("created_at", { ascending: true }),
    
    // Intakes by service type
    supabase
      .from("intakes")
      .select("service_type")
      .gte("created_at", monthAgo.toISOString()),
    
    // Intakes by UTM source
    supabase
      .from("intakes")
      .select("utm_source, utm_medium, utm_campaign")
      .gte("created_at", monthAgo.toISOString())
      .not("utm_source", "is", null),
  ])

  // Process daily data
  const dailyData: Record<string, { visits: number; started: number; paid: number; completed: number }> = {}
  
  // Initialize last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    const key = date.toISOString().split("T")[0]
    dailyData[key] = { visits: 0, started: 0, paid: 0, completed: 0 }
  }

  // Fill in intake data
  if (intakesByDayResult.data) {
    for (const intake of intakesByDayResult.data) {
      const key = intake.created_at.split("T")[0]
      if (dailyData[key]) {
        dailyData[key].started++
        if (intake.status === "approved") {
          dailyData[key].completed++
        }
      }
    }
  }

  // Process service type data
  const serviceTypeCounts: Record<string, number> = {}
  if (intakesByServiceResult.data) {
    for (const intake of intakesByServiceResult.data) {
      const type = intake.service_type || "unknown"
      serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1
    }
  }

  // Process UTM source data
  const sourceCounts: Record<string, number> = {}
  if (intakesBySourceResult.data) {
    for (const intake of intakesBySourceResult.data) {
      const source = intake.utm_source || "direct"
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    }
  }

  const analytics = {
    funnel: {
      visits: totalVisitsResult.count || 0,
      started: startedIntakesResult.count || 0,
      paid: paidIntakesResult.count || 0,
      completed: completedIntakesResult.count || 0,
    },
    dailyData: Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    })),
    serviceTypes: Object.entries(serviceTypeCounts).map(([type, count]) => ({
      type,
      count,
    })),
    sources: Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
    })),
  }

  return <AnalyticsDashboardClient analytics={analytics} />
}

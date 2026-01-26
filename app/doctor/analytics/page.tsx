import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { AnalyticsClient } from "./analytics-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Analytics | InstantMed Doctor Portal",
}

// Pagination constants
const PAGE_SIZE = 500 // Reasonable limit for analytics aggregation

export interface AnalyticsSearchParams {
  days?: string // Date range in days (default: 90)
  cursor?: string // Cursor for pagination (created_at of last item)
}

// Intake type for type safety
interface IntakeRow {
  id: string
  status: string
  is_priority: boolean
  created_at: string
  reviewed_at: string | null
  category: string | null
}

async function getAnalytics(searchParams: AnalyticsSearchParams = {}) {
  const supabase = createServiceRoleClient()
  
  const now = new Date()
  const days = searchParams.days ? parseInt(searchParams.days, 10) : 90 // Default to 90 days
  const rangeStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // OPTIMIZED: Only fetch intakes within date range with minimal columns
  // Uses idx_intakes_created_at index for efficient filtering
  // BEFORE: .select(*) with no date filter - loaded ALL intakes
  // AFTER: .select(6 columns) with 90-day filter + pagination
  let query = supabase
    .from("intakes")
    .select(`
      id,
      status,
      is_priority,
      created_at,
      reviewed_at,
      category
    `, { count: 'exact' })
    .gte("created_at", rangeStart.toISOString())
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE)

  // Cursor-based pagination: fetch items older than cursor
  if (searchParams.cursor) {
    query = query.lt("created_at", searchParams.cursor)
  }

  const { data: pagedIntakes, count: totalInRange } = await query
  const intakes: IntakeRow[] = pagedIntakes || []

  // Determine next cursor for pagination
  const lastItem = intakes.length > 0 ? intakes[intakes.length - 1] : null
  const nextCursor = lastItem && intakes.length === PAGE_SIZE ? lastItem.created_at : null
  const hasMore = intakes.length === PAGE_SIZE

  // Status counts from fetched data
  const statusCounts = intakes.reduce((acc: Record<string, number>, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1
    return acc
  }, {})

  // Service type counts from fetched data
  const serviceTypeCounts = intakes.reduce((acc: Record<string, number>, i) => {
    const serviceType = i.category || "other"
    acc[serviceType] = (acc[serviceType] || 0) + 1
    return acc
  }, {})

  // Today's stats
  const todayIntakes = intakes.filter(i => new Date(i.created_at) >= todayStart)
  const todayApproved = intakes.filter(i => 
    i.status === "approved" && i.reviewed_at && new Date(i.reviewed_at) >= todayStart
  )

  // This week stats
  const thisWeekIntakes = intakes.filter(i => new Date(i.created_at) >= sevenDaysAgo)
  const lastWeekIntakes = intakes.filter(i => 
    new Date(i.created_at) >= fourteenDaysAgo && new Date(i.created_at) < sevenDaysAgo
  )

  // Daily breakdown (last 7 days)
  const dailyData: { date: string; count: number; approved: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    
    const dayIntakes = intakes.filter(intake => {
      const created = new Date(intake.created_at)
      return created >= dayStart && created < dayEnd
    })
    
    const dayApproved = intakes.filter(intake => {
      if (intake.status !== "approved" || !intake.reviewed_at) return false
      const reviewed = new Date(intake.reviewed_at)
      return reviewed >= dayStart && reviewed < dayEnd
    })
    
    dailyData.push({
      date: date.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" }),
      count: dayIntakes.length,
      approved: dayApproved.length,
    })
  }

  // Average response time (paid → approved)
  const completedIntakes = intakes.filter(i => 
    i.status === "approved" && i.reviewed_at
  )
  
  let avgResponseMinutes = 0
  if (completedIntakes.length > 0) {
    const totalMinutes = completedIntakes.reduce((sum, i) => {
      const created = new Date(i.created_at).getTime()
      const reviewed = new Date(i.reviewed_at!).getTime()
      return sum + (reviewed - created) / (1000 * 60)
    }, 0)
    avgResponseMinutes = Math.round(totalMinutes / completedIntakes.length)
  }

  // Revenue: also apply date filter for consistency
  // OPTIMIZED: Only fetch payments within date range
  const { data: payments } = await supabase
    .from("payments")
    .select("amount_paid, created_at")
    .eq("status", "paid")
    .gte("created_at", rangeStart.toISOString())

  const allPayments = payments || []
  const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0) / 100
  const thisWeekRevenue = allPayments
    .filter(p => new Date(p.created_at) >= sevenDaysAgo)
    .reduce((sum, p) => sum + (p.amount_paid || 0), 0) / 100
  const lastWeekRevenue = allPayments
    .filter(p => new Date(p.created_at) >= fourteenDaysAgo && new Date(p.created_at) < sevenDaysAgo)
    .reduce((sum, p) => sum + (p.amount_paid || 0), 0) / 100
  const todayRevenue = allPayments
    .filter(p => new Date(p.created_at) >= todayStart)
    .reduce((sum, p) => sum + (p.amount_paid || 0), 0) / 100

  // Trends
  const intakeTrend = lastWeekIntakes.length > 0 
    ? Math.round(((thisWeekIntakes.length - lastWeekIntakes.length) / lastWeekIntakes.length) * 100)
    : thisWeekIntakes.length > 0 ? 100 : 0
  
  const revenueTrend = lastWeekRevenue > 0
    ? Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100)
    : thisWeekRevenue > 0 ? 100 : 0

  // Priority stats
  const priorityCount = intakes.filter(i => i.is_priority).length
  const priorityPercentage = intakes.length > 0 ? Math.round((priorityCount / intakes.length) * 100) : 0

  // Pending in queue
  const pendingInQueue = intakes.filter(i => i.status === "paid").length

  return {
    // Summary
    totalIntakes: totalInRange || intakes.length,
    todayIntakes: todayIntakes.length,
    todayApproved: todayApproved.length,
    pendingInQueue,
    
    // Status breakdown
    statusCounts,
    
    // Service breakdown
    serviceTypeCounts,
    
    // Response time
    avgResponseMinutes,
    
    // Revenue
    totalRevenue,
    thisWeekRevenue,
    todayRevenue,
    
    // Trends
    intakeTrend,
    revenueTrend,
    
    // Daily chart data
    dailyData,
    
    // Priority
    priorityCount,
    priorityPercentage,
    
    // Approval rate
    approvalRate: intakes.length > 0 
      ? Math.round(((statusCounts.approved || 0) / intakes.length) * 100) 
      : 0,
    
    // Pagination info
    pagination: {
      days,
      hasMore,
      nextCursor,
      totalInRange: totalInRange || 0,
      pageSize: PAGE_SIZE,
    },
  }
}

interface PageProps {
  searchParams: Promise<AnalyticsSearchParams>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  // Layout already enforces doctor/admin role, but page needs profile
  const { profile } = await requireRole(["doctor", "admin"])
  const params = await searchParams

  const analytics = await getAnalytics(params)

  return <AnalyticsClient analytics={analytics} doctorName={profile.full_name} />
}

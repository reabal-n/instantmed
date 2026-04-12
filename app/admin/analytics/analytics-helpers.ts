export interface AnalyticsData {
  funnel: {
    visits: number
    started: number
    paid: number
    completed: number
  }
  dailyData: {
    date: string
    visits: number
    started: number
    paid: number
    completed: number
    revenue: number
  }[]
  serviceTypes: {
    type: string
    count: number
  }[]
  sources: {
    source: string
    count: number
  }[]
  revenue: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  queueHealth: {
    queueSize: number
    avgReviewTimeMinutes: number | null
    oldestInQueueMinutes: number | null
    todaySubmissions: number
    approvedToday: number
    declinedToday: number
  }
  overview: {
    total: number
    inQueue: number
    approved: number
    declined: number
    pendingInfo: number
    scriptsPending: number
  }
}

export const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export type TabKey = "overview" | "funnel" | "revenue" | "queue"

export { formatServiceType } from "@/lib/format/service"


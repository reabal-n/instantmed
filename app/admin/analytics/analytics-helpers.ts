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

/**
 * Chart palette. Tracks the design-system semantic + service tokens.
 *
 * Order: primary blue, success emerald, warning amber, destructive red,
 * teal accent (replaces banned violet #8b5cf6 — DESIGN.md §1
 * forbids purple/violet outside `--service-referral`), service-pink.
 *
 * Phase 1 of the doctor-admin rebuild swept #8b5cf6 in 5 chart files
 * (analytics-funnel-tab, analytics-overview-tab, finance-client x2,
 * here) and replaced with --teal #5DB8C9.
 */
export const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#f87171", "#5db8c9", "#ec4899"] as const

export type TabKey =
  | "overview"
  | "funnel"
  | "revenue"
  | "queue"
  | "business-kpis"

export { formatServiceType } from "@/lib/format/service"


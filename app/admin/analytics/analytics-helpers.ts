export interface AnalyticsData {
  funnel: {
    visits: number
    started: number
    paid: number
    completed: number
  }
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

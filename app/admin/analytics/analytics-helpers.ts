export interface AnalyticsData {
  funnel: {
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
  }
}

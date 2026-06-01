import { type GoogleAdsHealth } from "@/lib/analytics/google-ads-health"
import { type BusinessOperatingScorecard } from "@/lib/data/business-scorecard"
import { type PrescriptionFulfilmentDashboard } from "@/lib/parchment/fulfilment-dashboard"

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
  googleAds: GoogleAdsHealth
  prescriptionFulfilment: PrescriptionFulfilmentDashboard
  businessScorecard: BusinessOperatingScorecard | null
}

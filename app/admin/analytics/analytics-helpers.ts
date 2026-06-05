import { type GoogleAdsHealth } from "@/lib/analytics/google-ads-health"
import { type GoogleAdsProfitSnapshot } from "@/lib/analytics/google-ads-profit-summary"
import { type BusinessOperatingScorecard } from "@/lib/data/business-scorecard"
import { type RecoveryScorecard } from "@/lib/data/recovery-scorecard"
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
  googleAdsProfit: GoogleAdsProfitSnapshot | null
  recoveryScorecard: RecoveryScorecard | null
  prescriptionFulfilment: PrescriptionFulfilmentDashboard
  businessScorecard: BusinessOperatingScorecard | null
}

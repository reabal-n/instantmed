import { type AiAttributionBreakdown } from "@/lib/admin/ai-attribution-breakdown"
import { type HeardAboutUsBreakdown } from "@/lib/admin/heard-about-us-breakdown"
import { type GoogleAdsHealth } from "@/lib/analytics/google-ads-health"
import { type GoogleAdsProfitSnapshot } from "@/lib/analytics/google-ads-profit-summary"
import { type PostHogIntakeFunnelSnapshot } from "@/lib/analytics/posthog-intake-funnel"
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
  intakeFunnel: PostHogIntakeFunnelSnapshot
  heardAboutUs: HeardAboutUsBreakdown
  aiAttribution: AiAttributionBreakdown
  recoveryScorecard: RecoveryScorecard | null
  prescriptionFulfilment: PrescriptionFulfilmentDashboard
  businessScorecard: BusinessOperatingScorecard | null
}

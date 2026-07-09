import { type AiAttributionBreakdown } from "@/lib/admin/ai-attribution-breakdown"
import { type HeardAboutUsBreakdown } from "@/lib/admin/heard-about-us-breakdown"
import { type GoogleAdsHealth } from "@/lib/analytics/google-ads-health"
import { type GoogleAdsProfitSnapshot } from "@/lib/analytics/google-ads-profit-summary"
import { type PostHogIntakeFunnelSnapshot } from "@/lib/analytics/posthog-intake-funnel"
import { type BusinessOperatingScorecard } from "@/lib/data/business-scorecard"
import { type RecoveryScorecard } from "@/lib/data/recovery-scorecard"
import { type RevenueDashboard } from "@/lib/data/revenue-dashboard"
import { type PrescriptionFulfilmentDashboard } from "@/lib/parchment/fulfilment-dashboard"

export interface AnalyticsData {
  // When the server assembled this snapshot (drives the "synced Xs ago" pill).
  generatedAt: string
  funnel: {
    started: number
    paid: number
    completed: number
  }
  // Canonical payment truth shared with the (now-folded-in) Payments dashboard:
  // refund-adjusted windows, daily trend, service mix, and payment pressure.
  revenue: RevenueDashboard
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

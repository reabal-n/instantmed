import type { BusinessReadModel } from "@/lib/admin/business-read-model"
import type { BusinessTrendsViewModel } from "@/lib/admin/business-trends"
import { type HeardAboutUsBreakdown } from "@/lib/admin/heard-about-us-breakdown"
import type { RecordedAttributionBreakdown } from "@/lib/admin/recorded-attribution-breakdown"
import type { ReleaseFrictionDashboardSnapshot } from "@/lib/admin/release-friction-readout"
import type { ReviewRequestFunnelSnapshot } from "@/lib/admin/review-request-funnel"
import type { PostHogCanonicalIntakeFunnelSnapshot } from "@/lib/analytics/posthog-canonical-intake-funnel"

export interface BusinessPageData {
  business: BusinessReadModel
  generatedAt: string
  intakeFunnel: PostHogCanonicalIntakeFunnelSnapshot
  recordedAttribution: RecordedAttributionBreakdown
  heardAboutUs: HeardAboutUsBreakdown
  reviewRequestFunnel: ReviewRequestFunnelSnapshot
  releaseFriction: ReleaseFrictionDashboardSnapshot
  trends: BusinessTrendsViewModel
}

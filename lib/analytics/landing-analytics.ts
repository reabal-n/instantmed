import type { SpecialtyExperienceVersion } from "@/lib/growth/specialty-experiences"

export type CTALocation =
  | "hero"
  | "how_it_works"
  | "certificate_preview"
  | "pricing"
  | "final_cta"
  | "sticky_mobile"
  | "employer_link"
  | "verify_link"
  | "about_hero"
  | "about_what_we_wont_do"

type LandingAnalyticsProperties = Record<string, unknown>
type LandingAnalyticsCapture = (event: string, properties: LandingAnalyticsProperties) => void

export function createLandingExperienceViewLatch({
  service,
  growthExperienceVersion,
  enabled = true,
}: {
  service: string
  growthExperienceVersion: SpecialtyExperienceVersion | null
  enabled?: boolean
}) {
  let hasTracked = false

  return {
    track: (capture: LandingAnalyticsCapture | null | undefined) => {
      if (!enabled || !growthExperienceVersion || !capture || hasTracked) return
      hasTracked = true
      try {
        capture("landing_experience_viewed", {
          service,
          growth_experience_version: growthExperienceVersion,
        })
      } catch {
        // A concrete analytics attempt is best-effort and must not interrupt navigation.
      }
    },
  }
}

export function createLandingAnalyticsTracker({
  service,
  growthExperienceVersion = null,
  capture,
  enabled = true,
}: {
  service: string
  growthExperienceVersion?: SpecialtyExperienceVersion | null
  capture?: LandingAnalyticsCapture
  enabled?: boolean
}) {
  const experienceView = createLandingExperienceViewLatch({
    service,
    growthExperienceVersion,
    enabled,
  })
  const versionProperties = growthExperienceVersion
    ? { growth_experience_version: growthExperienceVersion }
    : {}

  const track = (event: string, properties: LandingAnalyticsProperties) => {
    if (!enabled) return
    try {
      capture?.(event, properties)
    } catch {
      // Analytics must never delay or interrupt patient navigation.
    }
  }

  return {
    trackLandingExperienceViewed: () => {
      experienceView.track(capture)
    },
    trackCTAClick: (location: CTALocation) => {
      track("landing_cta_clicked", {
        service,
        cta_location: location,
        ...versionProperties,
      })
    },
    trackFAQOpen: (_question: string, index: number) => {
      track("landing_faq_opened", {
        service,
        faq_index: index,
        ...versionProperties,
      })
    },
    trackSectionView: (section: string) => {
      track("landing_section_viewed", {
        service,
        section,
        ...versionProperties,
      })
    },
    trackScrollDepth: (depth: number) => {
      track("landing_scroll_depth", {
        service,
        depth_percent: depth,
        ...versionProperties,
      })
    },
  }
}

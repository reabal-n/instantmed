import { normalizeIncomingGrowthExperienceVersion } from "@/lib/growth/specialty-experience-attribution"
import {
  normalizeSpecialtyExperienceVersion,
  type SpecialtyExperienceService,
  type SpecialtyExperienceVersion,
} from "@/lib/growth/specialty-experiences"

export function resolveLandingGrowthExperienceVersion(
  service: SpecialtyExperienceService,
  version: unknown,
): SpecialtyExperienceVersion | null {
  return normalizeSpecialtyExperienceVersion(version, service, "landing")
}

export function resolveAvailableLandingGrowthExperienceVersion(
  growthExperienceVersion: SpecialtyExperienceVersion | null,
  {
    isDisabled,
    isLoading,
  }: {
    isDisabled: boolean
    isLoading: boolean
  },
): SpecialtyExperienceVersion | null {
  return !isLoading && !isDisabled ? growthExperienceVersion : null
}

export function buildGrowthExperienceRequestHref(
  href: string,
  growthExperienceVersion: SpecialtyExperienceVersion | null,
): string {
  if (!growthExperienceVersion || !href.startsWith("/request") || href.startsWith("//")) {
    return href
  }

  let requestUrl: URL
  try {
    requestUrl = new URL(href, "https://instantmed.local")
  } catch {
    return href
  }
  if (requestUrl.pathname !== "/request") return href

  const validatedVersion = normalizeIncomingGrowthExperienceVersion(
    growthExperienceVersion,
    {
      serviceType: requestUrl.searchParams.get("service"),
      subtype: requestUrl.searchParams.get("subtype"),
    },
  )
  if (!validatedVersion) return href

  requestUrl.searchParams.set("growth_experience_version", validatedVersion)
  return `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`
}

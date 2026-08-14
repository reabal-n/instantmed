const POSTHOG_API_HOST_BY_INGESTION_HOST: Record<string, string> = {
  "https://eu.i.posthog.com": "https://eu.posthog.com",
  "https://us.i.posthog.com": "https://us.posthog.com",
}

/**
 * PostHog's public SDK host receives events, while authenticated project API
 * requests use the corresponding regional app host.
 */
export function normalizePostHogApiHost(configuredHost: string): string {
  const normalizedHost = configuredHost.replace(/\/+$/, "")
  return POSTHOG_API_HOST_BY_INGESTION_HOST[normalizedHost] ?? normalizedHost
}

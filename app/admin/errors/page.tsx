import { ErrorMonitoringClient } from "./errors-client"

export const dynamic = "force-dynamic"

export default async function ErrorMonitoringPage() {
  // In production, this would fetch from Sentry API
  // For now, we'll show the UI structure with mock/empty data
  const sentryOrgSlug = process.env.SENTRY_ORG || "instantmed"
  const sentryProjectSlug = process.env.SENTRY_PROJECT || "instantmed-nextjs"

  return (
    <ErrorMonitoringClient
      sentryOrgSlug={sentryOrgSlug}
      sentryProjectSlug={sentryProjectSlug}
    />
  )
}

import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ErrorMonitoringClient } from "./errors-client"

export const dynamic = "force-dynamic"

export default async function ErrorMonitoringPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser || authUser.profile.role !== "admin") {
    redirect("/")
  }

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

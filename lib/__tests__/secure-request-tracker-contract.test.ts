import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const projectFile = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("secure request tracker contract", () => {
  it("keeps lifecycle templates off raw intake-id tracker links", () => {
    const templates = [
      "request-received",
      "payment-confirmed",
      "needs-more-info",
      "still-reviewing",
      "request-declined",
      "script-sent",
      "consult-approved",
      "refund-issued",
    ]

    for (const template of templates) {
      const source = projectFile(`lib/email/components/templates/${template}.tsx`)
      expect(source, template).not.toContain("/track/${requestId}")
      expect(source, template).toContain("requestAccessUrl")
    }
  })

  it("mints signed access URLs at every lifecycle send and retry boundary", () => {
    const directSenders = [
      "lib/stripe/confirmed-payment-finalization.ts",
      "app/actions/request-more-info.ts",
      "lib/email/send-status.ts",
      "app/api/cron/retry-auto-approval/route.ts",
      "app/api/cron/stale-queue/route.ts",
      "lib/email/senders.ts",
      "app/doctor/queue/actions.ts",
    ]

    for (const path of directSenders) {
      expect(projectFile(path), path).toContain("buildPatientRequestAccessUrl")
    }

    const reconstruction = projectFile("lib/email/send/reconstruct.ts")
    expect(reconstruction.match(/requestAccessUrl: buildPatientRequestAccessUrl/g))
      .toHaveLength(7)
  })

  it("removes the parallel client tracker and full-row browser subscription", () => {
    expect(existsSync(join(process.cwd(), "app/track/[intakeId]/tracking-client.tsx"))).toBe(false)

    const page = projectFile("app/track/request/page.tsx")
    expect(page).not.toContain("TrackingClient")
    expect(page).not.toContain("postgres_changes")
    expect(page).not.toContain("estimatedMinutes")
    expect(page).not.toContain("queuePosition")
    expect(page).not.toContain("request_access_token")
  })

  it("exchanges the URL bearer for an HttpOnly cookie before React renders", () => {
    const exchange = projectFile("app/track/[intakeId]/route.ts")

    expect(exchange).toContain("verifyPatientRequestAccessToken")
    expect(exchange).toContain("PATIENT_REQUEST_ACCESS_COOKIE")
    expect(exchange).toContain("httpOnly: true")
    expect(exchange).toContain('path: "/track"')
    expect(exchange).toContain('new URL("/track/request", request.url)')
  })

  it("keeps auth returns fixed and free of request ids and bearer tokens", () => {
    const page = projectFile("app/track/request/page.tsx")

    expect(page).toContain('"/sign-up?redirect=%2Ftrack%2Frequest"')
    expect(page).toContain('"/sign-in?redirect=%2Ftrack%2Frequest"')
    expect(page).not.toContain("buildPostSignInHref")
    expect(page).not.toContain("encodeURIComponent(intakeHref)")
    expect(page).not.toContain("intake_id=")
    expect(page).not.toContain("requestAccessUrl")
  })

  it("keeps the capability surface read-only and clinical content behind sign-in", () => {
    const page = projectFile("app/track/request/page.tsx")
    expect(existsSync(join(process.cwd(), "app/track/respond/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "components/patient/guest-request-response-form.tsx"))).toBe(false)
    expect(page).not.toContain("GuestRequestResponseForm")
    expect(page).not.toContain("info_request_message")
    expect(page).not.toContain("Doctor’s question")
    for (const profileGate of [
      "role",
      "account_closed_at",
      "merged_into_profile_id",
    ]) {
      expect(page).toContain(profileGate)
    }
  })

  it("blocks capability paths from caching, referrers, attribution, and external analytics", () => {
    const config = projectFile("next.config.mjs")
    const globalClients = projectFile("components/providers/global-deferred-clients.tsx")
    const middlewareAttribution = projectFile("lib/analytics/middleware-attribution.ts")

    expect(config).toContain('source: "/track/:path*"')
    expect(config).toContain('value: "private, no-store, max-age=0"')
    expect(config).toContain('value: "no-referrer"')
    expect(globalClients).toContain("allowExternalTelemetry")
    expect(globalClients).toContain("isExternalAnalyticsExcludedPathname")
    expect(middlewareAttribution).toContain(
      "isExternalAnalyticsExcludedPathname(req.nextUrl.pathname)",
    )
  })

  it("keeps external URL analytics off authenticated dynamic routes", () => {
    const pathPolicy = projectFile("lib/browser/sensitive-capability-path.ts")
    const globalClients = projectFile("components/providers/global-deferred-clients.tsx")
    const googleTags = projectFile("components/providers/google-tags.tsx")
    const posthogProvider = projectFile("components/providers/posthog-provider.tsx")
    const instrumentation = projectFile("instrumentation-client.ts")

    for (const prefix of ["/account", "/admin", "/dashboard", "/doctor", "/patient"]) {
      expect(pathPolicy).toContain(`"${prefix}"`)
    }
    expect(globalClients).toContain("allowExternalTelemetry && Analytics")
    expect(posthogProvider).toContain("isExternalAnalyticsExcludedPathname(pathname)")
    expect(googleTags).toContain("send_page_view: false")
    expect(instrumentation).toContain("capture_pageleave: false")
    expect(instrumentation).toContain("isExternalAnalyticsExcludedPath()")
  })

  it("retires legacy raw-id complete-account access before any order projection", () => {
    const completeAccount = projectFile("app/auth/complete-account/page.tsx")
    const accessGuard = completeAccount.indexOf("if (params.access)")
    const serviceRoleRead = completeAccount.indexOf("createServiceRoleClient()")

    expect(accessGuard).toBeGreaterThan(-1)
    expect(serviceRoleRead).toBeGreaterThan(accessGuard)
    expect(completeAccount).toContain('if (intakeId && paymentState === "paid")')
    expect(completeAccount).not.toContain(
      'certificateAccess={params.access === "certificate"}',
    )
    expect(projectFile("app/auth/complete-account/complete-account-form.tsx"))
      .not.toContain("certificateAccess")
  })

  it("keeps guest account completion off browser telemetry and merged profiles off auth", () => {
    const completeAccount = projectFile("app/auth/complete-account/complete-account-form.tsx")
    const postConversionPaths = projectFile("lib/browser/post-conversion-path.ts")
    const authHelpers = projectFile("lib/auth/helpers.ts")
    const config = projectFile("next.config.mjs")

    expect(completeAccount).not.toContain("trackPurchase")
    expect(completeAccount).not.toContain("usePostHog")
    expect(postConversionPaths).not.toContain('"/auth/complete-account"')
    expect(config).toContain('source: "/auth/complete-account"')
    expect(authHelpers).toContain("account_closure_reason, merged_into_profile_id")
    expect(authHelpers).toContain('.is("merged_into_profile_id", null)')
  })
})

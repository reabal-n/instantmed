import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), "utf8")
}

describe("code-clean retirement contracts", () => {
  it("keeps retired redirect-only routes out of the app tree", () => {
    const retiredRoutes = [
      "app/auth/login",
      "app/login",
      "app/consult/request",
      "app/medical-certificate/request",
      "app/admin/page.tsx",
      "app/admin/ops/doctors",
      "app/admin/ops/sla",
      "app/prescriptions/new",
      "app/prescriptions/repeat",
      "app/prescriptions/request",
    ]

    for (const route of retiredRoutes) {
      expect(existsSync(join(root, route)), route).toBe(false)
    }

    const nextConfig = read("next.config.mjs")
    expect(nextConfig).toContain('source: "/auth/login"')
    expect(nextConfig).toContain('source: "/login"')
    expect(nextConfig).toContain('source: "/consult/request"')
    expect(nextConfig).toContain('source: "/medical-certificate/request"')
    expect(nextConfig).toContain('source: "/admin"')
    expect(nextConfig).toContain('destination: "/dashboard"')
    expect(nextConfig).toContain('source: "/admin/ops/doctors"')
    expect(nextConfig).toContain('destination: "/admin/doctors"')
    expect(nextConfig).toContain('source: "/admin/ops/sla"')
    expect(nextConfig).toContain('destination: "/admin/analytics"')
    expect(nextConfig).toContain('source: "/prescriptions/new"')
    expect(nextConfig).toContain('source: "/prescriptions/repeat"')
    expect(nextConfig).toContain('source: "/prescriptions/request"')

    const orphanCheck = read("scripts/check-orphaned-files.sh")
    for (const route of retiredRoutes) {
      expect(orphanCheck).toContain(route)
    }
  })

  it("keeps old dashboard-only APIs out of the route tree", () => {
    const retiredApis = [
      "app/api/admin/test-email/route.ts",
      "app/api/doctor/assign-request/route.ts",
      "app/api/doctor/drafts/[intakeId]/route.ts",
      "app/api/doctor/onboarding-status/route.ts",
      "app/api/health/dashboard/route.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const route of retiredApis) {
      expect(existsSync(join(root, route)), route).toBe(false)
      expect(orphanCheck).toContain(route)
    }
  })

  it("keeps stale patient quick-reorder APIs out of the route tree", () => {
    const retiredPatientApis = [
      "app/api/patient/last-prescription/route.ts",
      "app/api/patient/refill-prescription/route.ts",
      "app/api/patient/update-profile/route.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const route of retiredPatientApis) {
      expect(existsSync(join(root, route)), route).toBe(false)
      expect(orphanCheck).toContain(route)
    }

    const architecture = read("docs/ARCHITECTURE.md")
    expect(architecture).not.toContain("last-prescription")
    expect(architecture).not.toContain("refill-prescription")
    expect(architecture).not.toContain("update-profile")
  })

  it("keeps unused notification sidecars out of the patient shell", () => {
    const retiredNotificationSidecars = [
      "components/shared/notification-bell.tsx",
      "lib/hooks/use-notifications.ts",
      "lib/notifications/push-notifications.ts",
      "lib/prescriptions/refill-reminders.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const path of retiredNotificationSidecars) {
      expect(existsSync(join(root, path)), path).toBe(false)
      expect(orphanCheck).toContain(path)
    }

    expect(read("components/shared/index.ts")).not.toContain("NotificationBell")
    expect(read("components/shared/navbar/user-menu.tsx")).not.toContain("NotificationBell")
    expect(read("components/ui/mobile-nav.tsx")).not.toContain("PATIENT_NOTIFICATIONS_HREF")
    expect(read("components/ui/mobile-nav.tsx")).not.toContain('label: "Notifications"')
  })

  it("keeps the retired patient notifications feed redirect-only", () => {
    const retiredPatientNotificationRoutes = [
      "app/patient/notifications/page.tsx",
      "app/patient/notifications/notifications-client.tsx",
      "app/patient/notifications/error.tsx",
      "app/patient/notifications/loading.tsx",
    ]

    for (const path of retiredPatientNotificationRoutes) {
      expect(existsSync(join(root, path)), path).toBe(false)
    }

    const nextConfig = read("next.config.mjs")
    expect(nextConfig).toContain('source: "/patient/notifications"')
    expect(nextConfig).toContain('destination: "/patient/intakes"')

    expect(read("lib/dashboard/routes.ts")).not.toContain("PATIENT_NOTIFICATIONS_HREF")
    expect(read("components/shell/left-rail.tsx")).not.toContain("PATIENT_NOTIFICATIONS_HREF")
    expect(read("components/shell/left-rail.tsx")).not.toContain("Bell")
    expect(read("components/shell/left-rail.tsx")).not.toContain("unreadNotifications")
    expect(read("components/shell/authenticated-shell.tsx")).not.toContain("unreadNotifications")
    expect(read("app/patient/patient-shell.tsx")).not.toContain("unreadNotifications")
    expect(read("app/patient/layout.tsx")).not.toContain('from("notifications")')
  })

  it("keeps automated treatment follow-up reminders out of the lean one-off model", () => {
    const retiredTreatmentFollowupFiles = [
      "app/api/cron/treatment-followup/route.ts",
      "lib/email/treatment-followup.ts",
      "lib/email/components/templates/treatment-followup.tsx",
      "lib/data/followups.ts",
      "components/patient/followup-tracker-card.tsx",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const path of retiredTreatmentFollowupFiles) {
      expect(existsSync(join(root, path)), path).toBe(false)
      expect(orphanCheck).toContain(path)
    }

    expect(read("app/doctor/queue/actions.ts")).not.toContain("createFollowupsForIntake")
    expect(read("app/patient/page.tsx")).not.toContain('from("intake_followups")')
    expect(read("components/patient/dashboard-hero.tsx")).not.toContain("followup-due")
    expect(read("components/patient/panel-dashboard.tsx")).not.toContain("FollowupTrackerCard")
    expect(read("vercel.json")).not.toContain("/api/cron/treatment-followup")

    const legacyFollowupsPanel = read("app/doctor/intakes/[id]/intake-detail-followups.tsx")
    expect(legacyFollowupsPanel).toContain("Legacy check-ins")
    expect(legacyFollowupsPanel).toContain("New automated check-ins are retired")
    expect(legacyFollowupsPanel).not.toContain("Follow-up check-ins")

    const patientFollowupPage = read("app/patient/followups/[id]/page.tsx")
    const followupActions = read("app/actions/followups.ts")
    const routesSource = read("lib/dashboard/routes.ts")
    expect(patientFollowupPage).toContain("Compatibility-only route for historical ED/hair-loss check-in links")
    expect(followupActions).toContain("Compatibility actions for historical intake_followups rows")
    expect(routesSource).toContain("Hidden compatibility route for historical treatment check-in links")
  })

  it("keeps repeat-Rx subscriptions dormant and out of patient acquisition paths", () => {
    expect(existsSync(join(root, "app/api/cron/subscription-nudge/route.ts"))).toBe(false)
    expect(existsSync(join(root, "lib/data/subscriptions.ts"))).toBe(false)
    expect(existsSync(join(root, "lib/email/subscription-nudge.ts"))).toBe(false)
    expect(existsSync(join(root, "components/email/templates/subscription-nudge.tsx"))).toBe(false)
    expect(existsSync(join(root, "lib/email/components/templates/subscription-nudge.tsx"))).toBe(false)
    expect(existsSync(join(root, "components/patient/subscription-card.tsx"))).toBe(false)
    expect(existsSync(join(root, "app/api/stripe/customer-portal/route.ts"))).toBe(false)
    expect(existsSync(join(root, "app/api/stripe/webhook/handlers/invoice-payment-succeeded.ts"))).toBe(false)
    expect(existsSync(join(root, "app/api/stripe/webhook/handlers/invoice-payment-failed.ts"))).toBe(false)
    expect(existsSync(join(root, "app/api/stripe/webhook/handlers/customer-subscription-deleted.ts"))).toBe(false)
    expect(existsSync(join(root, "app/api/stripe/webhook/handlers/customer-subscription-updated.ts"))).toBe(false)
    expect(existsSync(join(root, "lib/email/components/templates/subscription-cancelled.tsx"))).toBe(false)

    const orphanCheck = read("scripts/check-orphaned-files.sh")
    expect(orphanCheck).toContain("app/api/cron/subscription-nudge/route.ts")
    expect(orphanCheck).toContain("lib/data/subscriptions.ts")
    expect(orphanCheck).toContain("lib/email/subscription-nudge.ts")
    expect(orphanCheck).toContain("components/email/templates/subscription-nudge.tsx")
    expect(orphanCheck).toContain("lib/email/components/templates/subscription-nudge.tsx")
    expect(orphanCheck).toContain("components/patient/subscription-card.tsx")
    expect(orphanCheck).toContain("app/api/stripe/customer-portal/route.ts")
    expect(orphanCheck).toContain("app/api/stripe/webhook/handlers/invoice-payment-succeeded.ts")
    expect(orphanCheck).toContain("app/api/stripe/webhook/handlers/invoice-payment-failed.ts")
    expect(orphanCheck).toContain("app/api/stripe/webhook/handlers/customer-subscription-deleted.ts")
    expect(orphanCheck).toContain("app/api/stripe/webhook/handlers/customer-subscription-updated.ts")
    expect(orphanCheck).toContain("lib/email/components/templates/subscription-cancelled.tsx")

    const vercelConfig = JSON.parse(read("vercel.json")) as {
      crons?: Array<{ path?: string }>
    }
    expect(vercelConfig.crons?.map((cron) => cron.path)).not.toContain("/api/cron/subscription-nudge")
    expect(vercelConfig.crons?.map((cron) => cron.path)).not.toContain("/api/cron/repeat-rx-reminders")
    expect(existsSync(join(root, "app/api/cron/repeat-rx-reminders/route.ts"))).toBe(false)
    expect(vercelConfig.crons?.every((cron) => existsSync(join(root, `app${cron.path}/route.ts`)))).toBe(true)
    expect(existsSync(join(root, "app/api/ops/email-dispatcher/route.ts"))).toBe(false)
    expect(read("lib/config/env.ts")).not.toContain("OPS_CRON_SECRET")
    expect(read(".env.example")).not.toContain("OPS_CRON_SECRET")

    expect(read("lib/config/env.ts")).not.toContain("Production requires STRIPE_PRICE_REPEAT_RX_MONTHLY")
    expect(read("lib/config/env.ts")).not.toContain("STRIPE_PRICE_REPEAT_RX_MONTHLY")
    expect(read(".env.example")).not.toContain("STRIPE_PRICE_REPEAT_RX_MONTHLY")
    expect(read("lib/constants/index.ts")).not.toContain("REPEAT_RX_MONTHLY")
    expect(read("lib/stripe/checkout.ts")).not.toContain('mode: "subscription"')
    expect(read("lib/sms/templates.ts")).not.toContain("REFILL_REMINDER")
    expect(read("lib/sms/templates.ts")).not.toContain("/prescriptions/request")

    const checkoutCompletedHandler = read("app/api/stripe/webhook/handlers/checkout-session-completed.ts")
    expect(checkoutCompletedHandler).not.toMatch(/from\("subscriptions"\)\.upsert/)
    expect(checkoutCompletedHandler).not.toContain("Subscription record created")
    expect(checkoutCompletedHandler).toContain("Ignored dormant subscription checkout completion")

    const webhookHandlers = read("app/api/stripe/webhook/handlers/index.ts")
    expect(webhookHandlers).not.toContain("invoice.payment_succeeded")
    expect(webhookHandlers).not.toContain("invoice.payment_failed")
    expect(webhookHandlers).not.toContain("customer.subscription.deleted")
    expect(webhookHandlers).not.toContain("customer.subscription.updated")
    expect(read("docs/OPERATIONS.md")).toContain("Do not enable invoice or `customer.subscription.*` events")

    const patientPage = read("app/patient/page.tsx")
    expect(patientPage).not.toContain('from("subscriptions")')
    expect(patientPage).not.toContain("subscription={")

    const patientPanel = read("components/patient/panel-dashboard.tsx")
    expect(patientPanel).not.toContain("LegacySubscriptionCard")
    expect(patientPanel).not.toContain("subscription?:")

    const emailTypes = read("lib/email/send/types.ts")
    expect(emailTypes).not.toContain("subscription_cancelled")

    const requestSurfaces = [
      "components/request/steps/review-step.tsx",
      "components/request/steps/checkout-step.tsx",
      "lib/request/unified-checkout.ts",
    ]
    for (const surface of requestSurfaces) {
      const source = read(surface)
      expect(source, surface).not.toContain("subscribeAndSave")
      expect(source, surface).not.toContain("subscribe_and_save")
      expect(source, surface).not.toContain("REPEAT_RX_MONTHLY")
    }

    const publicAcquisitionSurfaces = [
      "components/marketing/hero-doctor-review-mockup.tsx",
      "components/marketing/prescriptions-landing.tsx",
      "lib/seo/data/competitor-comparisons.ts",
      "docs/REVENUE_MODEL.md",
      "docs/PRIMITIVES.md",
      "docs/OPERATIONS.md",
    ]
    for (const surface of publicAcquisitionSurfaces) {
      const source = read(surface)
      expect(source, surface).not.toContain("Subscribe & Save")
      expect(source, surface).not.toContain("$19.95/mo")
      expect(source, surface).not.toMatch(/\$19\.95\s*\/\s*mo\b/i)
      expect(source, surface).not.toContain("STRIPE_PRICE_REPEAT_RX_MONTHLY")
      expect(source, surface).not.toContain("REPEAT_RX_MONTHLY")
      expect(source, surface).not.toMatch(/optional monthly repeat (script|prescription) subscription/i)
    }
  })

  it("keeps superseded intake engines out of the runtime tree", () => {
    const retiredIntakeModules = [
      "lib/intake/flow-configs.ts",
      "lib/intake/flow-engine.ts",
      "lib/intake/chat-flow-v2.ts",
    ]

    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const modulePath of retiredIntakeModules) {
      expect(existsSync(join(root, modulePath)), modulePath).toBe(false)
      expect(orphanCheck).toContain(modulePath)
    }
  })
})

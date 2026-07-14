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
      "app/prescriptions/[subtype]",
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
    expect(nextConfig).toContain('source: "/prescriptions/:subtype"')
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
      "app/api/medications/route.ts",
      "app/api/health/dashboard/route.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const route of retiredApis) {
      expect(existsSync(join(root, route)), route).toBe(false)
      expect(orphanCheck).toContain(route)
    }
  })

  it("keeps superseded staff and data sidecars retired", () => {
    const retiredSidecars = [
      "app/actions/decline-bulk.ts",
      "app/actions/render-test-email.ts",
      "app/actions/safety-symptoms.ts",
      "app/doctor/intakes/[id]/intake-decline-dialog.tsx",
      "app/doctor/patients/manual-patient-dialog.tsx",
      "components/doctor/review/clinical-notes-editor.tsx",
      "components/doctor/review/formatting-toolbar.tsx",
      "components/doctor/review/patient-info-card.tsx",
      "lib/data/consultation-types.ts",
      "lib/data/queue-availability.ts",
      "lib/doctor/session-timeout.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const path of retiredSidecars) {
      expect(existsSync(join(root, path)), path).toBe(false)
      expect(orphanCheck).toContain(path)
    }

    expect(read("app/doctor/patients/patients-list-client.tsx")).toContain("AddPatientDialog")
    expect(read("components/doctor/review/intake-review-cockpit.tsx")).toContain(
      "PatientDecisionStrip",
    )
    expect(read("components/doctor/clinical-case-review.tsx")).toContain(
      'aria-label="Draft clinical note"',
    )
    expect(read("app/api/cron/release-stale-claims/route.ts")).toContain(
      'supabase.rpc("release_stale_intake_claims"',
    )
  })

  it("keeps unused copy catalogs and parallel flow models retired", () => {
    const retiredCatalogs = [
      "lib/microcopy/buttons.ts",
      "lib/microcopy/errors.ts",
      "lib/microcopy/feedback.ts",
      "lib/microcopy/prescription.ts",
      "lib/microcopy/referral.ts",
      "lib/microcopy/repeat-rx.ts",
      "types/marketing.ts",
      "types/med-cert.ts",
      "types/repeat-rx.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const path of retiredCatalogs) {
      expect(existsSync(join(root, path)), path).toBe(false)
      expect(orphanCheck).toContain(path)
    }

    expect(read("lib/microcopy/universal.ts")).toContain("export const COPY")
    expect(read("lib/validation/med-cert-schema.ts")).toContain("validateMedCertPayload")
    expect(read("lib/validation/repeat-script-schema.ts")).toContain("validateRepeatScriptPayload")
  })

  it("keeps superseded validation and formatting helpers retired", () => {
    const retiredHelpers = [
      "lib/api/responses.ts",
      "lib/format/service.ts",
      "lib/utils/form-formatting.ts",
      "lib/utils/idempotency.ts",
      "lib/validation/dates.ts",
      "lib/validation/schemas.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const path of retiredHelpers) {
      expect(existsSync(join(root, path)), path).toBe(false)
      expect(orphanCheck).toContain(path)
    }

    expect(read("lib/format/intake.ts")).toContain("formatServiceType")
    expect(read("lib/medical-certificates/date-policy.ts")).toContain(
      "validateCertificateDateRange",
    )
    expect(read("lib/validation/medicare.ts")).toContain("formatMedicareNumber")
    expect(read("lib/email/send/idempotency.ts")).toContain("buildEmailOutboxIdempotencyKey")
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
    expect(read("app/patient/patient-shell.tsx")).not.toContain("unreadNotifications")
    expect(read("app/patient/layout.tsx")).not.toContain('from("notifications")')
  })

  it("keeps the retired patient health summary redirect-only", () => {
    const retiredPatientHealthSummary = [
      "app/patient/health-summary/page.tsx",
      "app/patient/health-summary/client.tsx",
      "app/patient/health-summary/error.tsx",
      "app/patient/health-summary/loading.tsx",
      "lib/data/health-summary.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const path of retiredPatientHealthSummary) {
      expect(existsSync(join(root, path)), path).toBe(false)
      expect(orphanCheck).toContain(path)
    }

    const nextConfig = read("next.config.mjs")
    expect(nextConfig).toContain('source: "/patient/health-summary"')
    expect(nextConfig).toContain('destination: "/patient"')
    expect(read("docs/ARCHITECTURE.md")).not.toContain("/patient/health-summary")
  })

  it("keeps the retired patient new-request modal redirect-only", () => {
    const retiredPatientNewRequestModal = [
      "app/patient/@modal/new-request/page.tsx",
      "app/patient/@modal/default.tsx",
      "app/patient/default.tsx",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const path of retiredPatientNewRequestModal) {
      expect(existsSync(join(root, path)), path).toBe(false)
      expect(orphanCheck).toContain(path)
    }

    const routesSource = read("lib/dashboard/routes.ts")
    const leftRailSource = read("components/shell/left-rail.tsx")
    const nextConfig = read("next.config.mjs")

    expect(routesSource).not.toContain("PATIENT_NEW_REQUEST_HREF")
    expect(leftRailSource).not.toContain("PATIENT_NEW_REQUEST_HREF")
    expect(leftRailSource).toContain("REQUEST_HREF")
    expect(nextConfig).toContain('source: "/patient/new-request"')
    expect(nextConfig).toContain('destination: "/request"')
  })

  it("keeps automated treatment follow-up reminders out of the lean one-off model", () => {
    const retiredTreatmentFollowupFiles = [
      "app/api/cron/treatment-followup/route.ts",
      "lib/email/treatment-followup.ts",
      "lib/email/components/templates/treatment-followup.tsx",
      "lib/data/followups.ts",
      "components/patient/followup-tracker-card.tsx",
      "app/patient/followups/[id]/page.tsx",
      "app/patient/followups/[id]/followup-form.tsx",
      "app/patient/followups/[id]/loading.tsx",
      "app/patient/followups/[id]/skip/route.ts",
      "app/actions/followups.ts",
      "lib/validation/followup-schema.ts",
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

    const routesSource = read("lib/dashboard/routes.ts")
    const nextConfigSource = read("next.config.mjs")
    expect(routesSource).not.toContain("PATIENT_FOLLOWUPS_HREF")
    expect(routesSource).not.toContain("buildPatientFollowupHref")
    expect(nextConfigSource).toContain('source: "/patient/followups/:path*"')
    expect(nextConfigSource).toContain('destination: "/patient/intakes"')

    const patientNavigationSurfaces = [
      "components/ui/mobile-nav.tsx",
      "components/shell/left-rail.tsx",
      "app/patient/patient-shell.tsx",
    ]
    for (const surface of patientNavigationSurfaces) {
      const source = read(surface)
      expect(source, surface).not.toContain("PATIENT_FOLLOWUPS_HREF")
      expect(source, surface).not.toContain("/patient/followups")
    }
  })

  it("keeps retired exit-intent email campaign code out of runtime", () => {
    const retiredExitIntentFiles = [
      "lib/email/components/templates/exit-intent-last-chance.tsx",
      "lib/email/components/templates/exit-intent-reminder.tsx",
      "lib/email/components/templates/exit-intent-social-proof.tsx",
      "lib/crypto/exit-intent-token.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const path of retiredExitIntentFiles) {
      expect(existsSync(join(root, path)), path).toBe(false)
      expect(orphanCheck).toContain(path)
    }

    expect(read("lib/email/components/templates/index.ts")).not.toContain("ExitIntent")
    expect(read("lib/email/send/types.ts")).not.toContain("exit_intent")
    expect(read("lib/email/email-dispatcher.ts")).not.toContain("exit_intent")
    expect(read("lib/hooks/use-landing-analytics.ts")).not.toContain("trackExitIntent")
    expect(read("lib/hooks/use-landing-analytics.ts")).not.toContain("landing_exit_intent")
    expect(read("docs/ARCHITECTURE.md")).not.toContain("Dynamic imports for testimonials/exit-intent")
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
    // The entire Twilio SMS subsystem was deleted (zero callers). Assert it
    // stays gone rather than asserting on contents of files that no longer exist.
    expect(existsSync(join(root, "lib/sms")), "lib/sms").toBe(false)
    expect(existsSync(join(root, "lib/sms/templates.ts")), "lib/sms/templates.ts").toBe(false)

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
      "app/api/ai/clinical-note/route.ts",
      "app/api/ai/form-validation/route.ts",
      "app/api/ai/med-cert-draft/route.ts",
      "app/api/ai/symptom-suggestions/route.ts",
      "lib/ai/audit.ts",
      "lib/ai/cache.ts",
      "lib/ai/confidence.ts",
      "lib/ai/index.ts",
      "lib/ai/intelligent-suggestions.ts",
      "lib/intake/ai-collection-boundaries.ts",
      "lib/intake/doctor-summary-format.ts",
      "lib/intake/form-transition.ts",
      "lib/intake/progress-persistence.ts",
      "lib/intake/structured-intake-schema.ts",
      "lib/intake/flow-configs.ts",
      "lib/intake/flow-engine.ts",
      "lib/intake/chat-flow-v2.ts",
      "lib/monitoring/ai-health.ts",
    ]

    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const modulePath of retiredIntakeModules) {
      expect(existsSync(join(root, modulePath)), modulePath).toBe(false)
      expect(orphanCheck).toContain(modulePath)
    }
  })

  it("does not redirect legacy image names into a missing people directory", () => {
    expect(existsSync(join(root, "public/images/people"))).toBe(false)
    expect(read("next.config.mjs")).not.toContain("/images/people/")
  })
})

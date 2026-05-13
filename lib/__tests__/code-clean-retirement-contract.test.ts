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
    expect(nextConfig).toContain('destination: "/admin/analytics?tab=queue"')
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
      "app/api/health/dashboard/route.ts",
    ]
    const orphanCheck = read("scripts/check-orphaned-files.sh")

    for (const route of retiredApis) {
      expect(existsSync(join(root, route)), route).toBe(false)
      expect(orphanCheck).toContain(route)
    }
  })

  it("keeps repeat-Rx subscriptions dormant and out of patient acquisition paths", () => {
    expect(existsSync(join(root, "app/api/cron/subscription-nudge/route.ts"))).toBe(false)
    expect(existsSync(join(root, "lib/email/subscription-nudge.ts"))).toBe(false)
    expect(existsSync(join(root, "components/email/templates/subscription-nudge.tsx"))).toBe(false)
    expect(existsSync(join(root, "lib/email/components/templates/subscription-nudge.tsx"))).toBe(false)

    const orphanCheck = read("scripts/check-orphaned-files.sh")
    expect(orphanCheck).toContain("app/api/cron/subscription-nudge/route.ts")
    expect(orphanCheck).toContain("lib/email/subscription-nudge.ts")
    expect(orphanCheck).toContain("components/email/templates/subscription-nudge.tsx")
    expect(orphanCheck).toContain("lib/email/components/templates/subscription-nudge.tsx")

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

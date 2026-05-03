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
    expect(nextConfig).toContain('source: "/prescriptions/new"')
    expect(nextConfig).toContain('source: "/prescriptions/repeat"')
    expect(nextConfig).toContain('source: "/prescriptions/request"')

    const orphanCheck = read("scripts/check-orphaned-files.sh")
    for (const route of retiredRoutes) {
      expect(orphanCheck).toContain(route)
    }
  })

  it("keeps repeat-Rx subscriptions dormant and out of patient acquisition paths", () => {
    expect(existsSync(join(root, "app/api/cron/subscription-nudge/route.ts"))).toBe(false)
    expect(existsSync(join(root, "lib/email/subscription-nudge.ts"))).toBe(false)
    expect(existsSync(join(root, "lib/email/components/templates/subscription-nudge.tsx"))).toBe(false)

    const vercelConfig = JSON.parse(read("vercel.json")) as {
      crons?: Array<{ path?: string }>
    }
    expect(vercelConfig.crons?.map((cron) => cron.path)).not.toContain("/api/cron/subscription-nudge")

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
      expect(source, surface).not.toContain("STRIPE_PRICE_REPEAT_RX_MONTHLY")
      expect(source, surface).not.toContain("REPEAT_RX_MONTHLY")
      expect(source, surface).not.toMatch(/optional monthly repeat (script|prescription) subscription/i)
    }
  })
})

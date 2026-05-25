/**
 * Service-landing journey factory.
 *
 * The four specialty service landings (/medical-certificate, /prescriptions,
 * /erectile-dysfunction, /hair-loss) share the same shape: public marketing
 * surface, long-scroll, no auth, no interactions beyond opening the mobile
 * nav. Rather than duplicate the homepage.ts long-scroll pattern four times,
 * factory builds a Journey from a path + label.
 *
 * Each landing-page run mirrors homepage.ts:
 *   1. networkidle landing
 *   2. dynamic step count based on document height (handles tall pages)
 *   3. smooth scroll bottom -> back to top
 *   4. opens + closes the mobile nav to capture chrome
 */

import type { Journey } from "./index"

interface ServiceLandingConfig {
  name: string
  label: string
  path: string
  targetSeconds?: number
}

export function buildServiceLandingJourney(config: ServiceLandingConfig): Journey {
  return {
    name: config.name,
    label: config.label,
    targetSeconds: config.targetSeconds ?? 55,
    async run(page, baseUrl) {
      await page.goto(`${baseUrl}${config.path}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      })
      await page.waitForTimeout(2500)

      const documentHeight: number = await page.evaluate(
        () => document.documentElement.scrollHeight,
      )
      const viewportHeight = 812
      const steps = Math.max(5, Math.ceil(documentHeight / viewportHeight))
      for (let i = 1; i <= steps; i++) {
        const top = (documentHeight - viewportHeight) * (i / steps)
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), top)
        await page.waitForTimeout(1800)
      }

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
      await page.waitForTimeout(1500)

      const navTrigger = page
        .getByRole("button", { name: /menu|nav|hamburger/i })
        .first()
      if (await navTrigger.isVisible().catch(() => false)) {
        await navTrigger.click()
        await page.waitForTimeout(1500)
        await page.keyboard.press("Escape")
        await page.waitForTimeout(800)
      }
    },
  }
}

export const medicalCertificateLanding = buildServiceLandingJourney({
  name: "service-medical-certificate",
  label: "/medical-certificate service landing long-scroll",
  path: "/medical-certificate",
})

export const prescriptionsLanding = buildServiceLandingJourney({
  name: "service-prescriptions",
  label: "/prescriptions service landing long-scroll",
  path: "/prescriptions",
})

export const erectileDysfunctionLanding = buildServiceLandingJourney({
  name: "service-erectile-dysfunction",
  label: "/erectile-dysfunction service landing long-scroll",
  path: "/erectile-dysfunction",
})

export const hairLossLanding = buildServiceLandingJourney({
  name: "service-hair-loss",
  label: "/hair-loss service landing long-scroll",
  path: "/hair-loss",
})

// ─── Marketing surface landings ────────────────────────────────────────
// Public marketing pages that aren't service-specific but still need
// Tier 1 review coverage.

export const aboutLanding = buildServiceLandingJourney({
  name: "marketing-about",
  label: "/about marketing page long-scroll",
  path: "/about",
})

export const pricingLanding = buildServiceLandingJourney({
  name: "marketing-pricing",
  label: "/pricing marketing page long-scroll",
  path: "/pricing",
})

export const contactLanding = buildServiceLandingJourney({
  name: "marketing-contact",
  label: "/contact marketing page long-scroll",
  path: "/contact",
})

export const businessLanding = buildServiceLandingJourney({
  name: "marketing-business",
  label: "/business B2B landing long-scroll",
  path: "/business",
})

/**
 * Journey registry. Each journey describes:
 *   - A semantic name used as part of the runId
 *   - A label rendered in INDEX.md and reports
 *   - A `run(page)` function that drives the Playwright page
 *
 * The capture script wraps `run` in screencast tracing + frame extraction.
 * Journeys should not start the screencast themselves; they only drive
 * page interactions.
 *
 * Add new journeys in this folder and register them in `JOURNEYS` below.
 */

import type { Page } from "playwright"

import { paidFunnel } from "./paid-funnel"
import { brandSpine } from "./brand-spine"
import { doctorDashboard } from "./doctor-dashboard"
import { homepage } from "./homepage"
import {
  aboutLanding,
  businessLanding,
  contactLanding,
  erectileDysfunctionLanding,
  hairLossLanding,
  medicalCertificateLanding,
  prescriptionsLanding,
  pricingLanding,
} from "./service-landing"

export interface Journey {
  name: string
  label: string
  /**
   * Approximate target duration in seconds. The capture wrapper uses
   * this for: timeout budget, frame-extraction interval (frames every
   * ~targetSeconds/8 seconds), and INDEX.md metadata.
   */
  targetSeconds: number
  /**
   * Drive the page. The page is already navigated to baseUrl and
   * sized to mobile 375x812 with a touch-capable browser context.
   * Use page.waitForTimeout for pacing scroll capture, NOT
   * setTimeout.
   */
  run: (page: Page, baseUrl: string) => Promise<void>
}

export const JOURNEYS: Record<string, Journey> = {
  "paid-funnel": paidFunnel,
  "brand-spine": brandSpine,
  "doctor-dashboard": doctorDashboard,
  homepage,
  "service-medical-certificate": medicalCertificateLanding,
  "service-prescriptions": prescriptionsLanding,
  "service-erectile-dysfunction": erectileDysfunctionLanding,
  "service-hair-loss": hairLossLanding,
  "marketing-about": aboutLanding,
  "marketing-pricing": pricingLanding,
  "marketing-contact": contactLanding,
  "marketing-business": businessLanding,
}

export const DEFAULT_JOURNEY = "paid-funnel"

export function getJourney(name?: string): Journey {
  const key = name ?? DEFAULT_JOURNEY
  const journey = JOURNEYS[key]
  if (!journey) {
    const valid = Object.keys(JOURNEYS).join(", ")
    throw new Error(`Unknown journey: '${key}'. Valid: ${valid}`)
  }
  return journey
}

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const voiceSource = readFileSync(join(root, "lib/marketing/voice.ts"), "utf8")
const medCertLandingSource = readFileSync(join(root, "components/marketing/med-cert-landing.tsx"), "utf8")
const employerMarqueeSource = readFileSync(join(root, "components/shared/employer-logo-marquee.tsx"), "utf8")
const medCertPageSource = readFileSync(join(root, "app/medical-certificate/page.tsx"), "utf8")
const medCertIntentSource = readFileSync(join(root, "lib/marketing/med-cert-intent-config.ts"), "utf8")
const trustBadgesSource = readFileSync(join(root, "lib/marketing/trust-badges.ts"), "utf8")
const workplaceClaimSources = [
  medCertIntentSource,
  readFileSync(join(root, "components/marketing/med-cert-intent-page.tsx"), "utf8"),
  readFileSync(join(root, "lib/marketing/services.ts"), "utf8"),
  readFileSync(join(root, "app/for/[audience]/page.tsx"), "utf8"),
  readFileSync(join(root, "app/for/shift-workers/page.tsx"), "utf8"),
  readFileSync(join(root, "lib/seo/data/deep-city-content/sa.ts"), "utf8"),
].join("\n")

describe("marketing copy contracts", () => {
  it("keeps the homepage hero kicker calm and clinically grounded", () => {
    expect(voiceSource).not.toContain("Three minutes. Done.")
    expect(voiceSource).toContain('export const ICONIC_HOOK = "Start with a secure form. Takes about 3 minutes."')
  })

  it("renders the employer logo marquee on the medical certificate landing page", () => {
    expect(medCertLandingSource).toContain("EmployerLogoMarquee")
    expect(medCertLandingSource.indexOf("<EmployerLogoMarquee")).toBeLessThan(
      medCertLandingSource.indexOf("<EmployerCalloutStrip"),
    )
  })

  it("does not imply employer endorsement or guaranteed acceptance in the logo marquee", () => {
    expect(employerMarqueeSource).not.toMatch(/\baccept(?:ed|s)?\b/i)
    expect(employerMarqueeSource).not.toMatch(/\bendors(?:ed|ement)\b/i)
    expect(employerMarqueeSource).toContain("Used by employees at")
    expect(employerMarqueeSource).toContain("Employer and institution policies may vary.")
    expect(employerMarqueeSource).toContain("group-focus-within/marquee:[animation-play-state:paused]")
  })

  it("keeps medical certificate trust copy specific instead of slogan-like", () => {
    expect(medCertPageSource).toContain("Online Medical Certificate | AHPRA GP Review | InstantMed")
    expect(medCertPageSource).not.toContain("Under 30 Minutes, No Call")
    expect(medCertPageSource).not.toContain("in under 30 minutes")
    expect(medCertIntentSource).not.toContain("Real doctor review")
    expect(workplaceClaimSources).not.toContain("All employers")
    expect(workplaceClaimSources).not.toContain("98% AU employers accept")
    expect(trustBadgesSource).toContain("AHPRA GP review")
  })
})

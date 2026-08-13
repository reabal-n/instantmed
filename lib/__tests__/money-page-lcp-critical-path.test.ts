import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("money-page LCP critical path", () => {
  it("preloads the money-page H1 subset without changing the full face policy", () => {
    const layout = source("app/layout.tsx")
    const moneyFont = source("lib/fonts/money-h1.ts")
    const plusJakartaBlock = layout.match(
      /const plusJakarta = Plus_Jakarta_Sans\(\{([\s\S]*?)\n\}\)/,
    )?.[1]

    expect(plusJakartaBlock).toBeDefined()
    expect(plusJakartaBlock).toContain('display: "optional"')
    expect(plusJakartaBlock).toContain('weight: "variable"')
    expect(plusJakartaBlock).toContain("preload: false")
    expect(layout).not.toContain("plus-jakarta-money-h1.woff2")
    expect(moneyFont).toContain('src: "./plus-jakarta-money-h1.woff2"')
    expect(moneyFont).toContain('display: "optional"')
    expect(moneyFont).toContain('weight: "200 800"')
    expect(moneyFont).toContain("preload: true")
  })

  it("does not trade route LCP for global CSS duplication", () => {
    const nextConfig = source("next.config.mjs")

    expect(nextConfig).not.toContain("inlineCss: true")
    expect(nextConfig).not.toMatch(/^\s*optimizeCss:\s*true/m)
  })

  it("keeps the commercial H1s server-renderable and free of entrance opacity", () => {
    const medCertLanding = source("components/marketing/med-cert-landing.tsx")
    const hero = source("components/marketing/hero.tsx")

    expect(medCertLanding).toContain('moneyH1Font.className')
    expect(medCertLanding).toMatch(
      /<Heading level="display"[\s\S]*?Medical certificate\. From your bed\./,
    )
    expect(hero).toMatch(/<Heading[\s\S]*?level="display"/)
    expect(hero).toContain("titleClassName")
    expect(source("components/marketing/prescriptions-landing.tsx")).toContain(
      "titleClassName={moneyH1Font.className}",
    )
    expect(medCertLanding).not.toMatch(
      /<Heading level="display"[^>]*hero-(?:availability|subheadline|cta|trust|count|mockup)-enter/,
    )
    expect(medCertLanding).not.toContain("hero-subheadline-enter")
    expect(hero).toContain('immediateSubheadline ? undefined : "hero-subheadline-enter"')
    expect(source("components/marketing/prescriptions-landing.tsx")).toContain(
      "immediateSubheadline",
    )
  })

  it("does not eagerly preload the offscreen sticky payment marks", () => {
    const paymentLogos = source("components/checkout/payment-logos.tsx")

    expect(paymentLogos).toMatch(
      /export function StripePaymentLogos[\s\S]*?<ApplePayLogo[^>]*loading="lazy"/,
    )
    expect(paymentLogos).toMatch(
      /export function StripePaymentLogos[\s\S]*?<GooglePayLogo[^>]*loading="lazy"/,
    )
  })

  it("keeps interaction-only motion out of the initial money-page bundle", () => {
    const navbar = source("components/shared/navbar.tsx")
    const menuToggle = source("components/shared/navbar/mobile-menu-toggle.tsx")
    const stickyCta = source("components/marketing/shared/sticky-cta.tsx")
    const servicesDropdown = source("components/shared/navbar/services-dropdown.tsx")
    const resourcesDropdown = source("components/shared/navbar/resources-dropdown.tsx")
    const motionHooks = source("components/ui/motion.tsx")
    const wordReveal = source("components/ui/morning/word-reveal.tsx")
    const mobileMenu = source("components/ui/animated-mobile-menu.tsx")
    const hero = source("components/marketing/hero.tsx")
    const homepage = source("app/(marketing)/page.tsx")
    const authProvider = source("lib/supabase/auth-provider.tsx")
    const authCookie = source("lib/supabase/auth-cookie.ts")
    const brandLogo = source("components/shared/brand-logo.tsx")
    const medCertMockup = source("components/marketing/mockups/med-cert-hero-mockup.tsx")
    const escriptMockup = source("components/marketing/mockups/escript-hero-mockup.tsx")

    expect(navbar).toContain("dynamic(")
    expect(navbar).toContain("ssr: false")
    expect(navbar).toContain("mobileDrawerLoaded ?")
    expect(navbar).toContain('id="mobile-navigation-menu" hidden')
    expect(navbar).toContain("if (await prepareMobileDrawer()) setMobileMenuOpen(true)")
    expect(menuToggle).toContain("aria-busy={isPending || undefined}")
    expect(navbar).not.toContain("AnimatedMobileMenu")
    expect(menuToggle).not.toContain("framer-motion")
    expect(stickyCta).not.toContain("framer-motion")
    expect(servicesDropdown).not.toContain("framer-motion")
    expect(resourcesDropdown).not.toContain("framer-motion")
    expect(motionHooks).not.toMatch(/from ["']framer-motion["']/)
    expect(wordReveal).not.toContain("framer-motion")
    expect(wordReveal).toContain("IntersectionObserver")
    expect(mobileMenu).not.toContain("framer-motion")
    expect(hero).not.toContain("hero-doctor-review-mockup")
    expect(homepage).toContain("HeroDoctorReviewMockup")
    expect(navbar).toContain("prefetch={false}")
    expect(brandLogo).toContain("prefetch={prefetch}")
    expect(authCookie).toContain("requestMayHaveSupabaseSession")
    expect(authProvider).toContain("initialAuthResolvedRef.current = true")
    expect(medCertMockup).not.toContain("font-mono")
    expect(escriptMockup).not.toContain("font-mono")
    expect(medCertMockup).toContain("font-[ui-monospace]")
    expect(escriptMockup).toContain("font-[ui-monospace]")
  })

  it("keeps the global 404 from assigning next/link to a money-page chunk group", () => {
    const notFound = source("app/not-found.tsx")

    expect(notFound).not.toContain('from "next/link"')
    expect(notFound).toContain('<a\n            href="/"')
    expect(notFound).toContain('<a\n            href="/request"')
  })

  it("keeps the prescriptions body server-owned with a narrow control island", () => {
    const prescriptions = source("components/marketing/prescriptions-landing.tsx")
    const controls = source("components/marketing/prescriptions-client-controls.tsx")
    const hero = source("components/marketing/hero.tsx")

    expect(prescriptions).not.toMatch(/^"use client"/)
    expect(prescriptions).not.toContain("LandingPageShell")
    expect(prescriptions).toContain("PrescriptionsClientControls")
    expect(prescriptions).toContain('data-prescription-cta="final_cta"')
    expect(controls).toMatch(/^"use client"/)
    expect(controls).toContain("useLandingAnalytics")
    expect(controls).toContain("useServiceAvailability")
    expect(controls).toContain('document.addEventListener("click", handleClick, true)')
    expect(controls).toContain('document.removeEventListener("click", handleClick, true)')
    expect(controls).toContain("PRICING_DISPLAY.REPEAT_SCRIPT")
    expect(controls).not.toContain("$29.95")
    expect(hero).not.toMatch(/^["']use client["']/)
  })
})

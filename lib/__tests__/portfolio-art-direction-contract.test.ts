import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

describe("portfolio money-page art direction", () => {
  it("uses a catalog-derived card chooser instead of the split-panel route diagram", () => {
    const homepage = read("app/(marketing)/page.tsx")
    const homeLinks = read("components/marketing/home-service-links.tsx")
    const map = read("components/marketing/portfolio-route-map.tsx")

    expect(homepage).toContain("<PortfolioRouteMap />")
    expect(homepage).toContain("secondaryCta={null}")
    expect(homepage).not.toContain("beforeCta={")
    expect(homepage).toContain("Five focused services for Australian adults 18+")
    expect(homepage).toContain("PRICING_DISPLAY.MED_CERT")
    expect(homepage).toContain("regular GP or an in-person service")
    expect(homepage).not.toContain("ServiceCards")
    expect(homepage).not.toContain("HomeFactsBlock")
    expect(homepage).not.toContain("<HowItWorks")
    expect(homepage).not.toContain("ComplianceMarquee")
    expect(homepage.indexOf("<CTABanner")).toBeLessThan(
      homepage.indexOf("<HomeServiceLinks />"),
    )
    expect(homepage).not.toContain('from \'next/image\'')
    expect(homepage).not.toMatch(/\/images\/home-[123]\.webp/)
    expect(homeLinks.match(/href: "/g)).toHaveLength(4)
    expect(homeLinks).toContain('href: "/online-doctor-australia"')
    expect(homeLinks).toContain('href: "/telehealth-australia"')
    expect(homeLinks).toContain('href: "/compare/online-medical-certificate-options"')
    expect(homeLinks).toContain('href: "/verify"')
    expect(homeLinks).not.toContain('href: "/medical-certificate"')
    expect(homeLinks).not.toContain('href: "/prescriptions"')
    expect(map).toContain("getActiveServices()")
    expect(map).toContain("getServiceMarketingHref(service)")
    expect(map).toContain("getServiceRequestHref(service)")
    expect(map).toContain("function ServiceCard")
    expect(map).toContain("What do you need?")
    expect(map).toContain("UTI symptoms or start/switch pill")
    expect(map).toContain("FORM_FIRST_WEDGE")
    expect(map).toContain("sm:grid-cols-2 lg:grid-cols-6")
    expect(map).toContain('isCoreService ? "lg:col-span-3" : "lg:col-span-2"')
    expect(map).toContain("useServiceAvailability()")
    expect(map).toContain("focus-visible:ring-2")
    expect(map).not.toContain("group-hover:translate")
    expect(map).not.toContain("transition-transform")
    expect(map).not.toMatch(/(?:linear|radial)-gradient/)
    expect(map).not.toContain("backdrop-blur")
    expect(map).not.toContain("framer-motion")
  })

  it("keeps the consult selector compact and image-free after its canonical rebuild", () => {
    const consult = read("app/consult/page.tsx")

    expect(consult).toContain("<Hero")
    expect(consult).toContain('<ServiceDecisionBoard id="services" className=')
    expect(consult).not.toContain("showDetails")
    expect(consult).not.toContain('from "next/image"')
    expect(consult).not.toContain("/images/consult-1.webp")
  })

  it("gives the women's-health overview two bounded lanes and one review boundary", () => {
    const landing = read("components/marketing/womens-health-landing.tsx")
    const fork = read("components/marketing/womens-health-decision-fork.tsx")

    expect(landing).toContain("<WomensHealthDecisionFork />")
    expect(landing).not.toContain("WomensHealthIntent")
    expect(landing).not.toContain("EScriptHeroMockup")
    expect(fork).toContain('level="h3" as="h2"')
    expect(fork).toContain('href="/request?service=consult&subtype=womens_health&intent=uti"')
    expect(fork).toContain('href="/request?service=consult&subtype=womens_health&intent=ocp_new"')
    expect(fork).toContain('href="/prescriptions"')
    expect(fork).toContain("UTI symptoms")
    expect(fork).toContain("Start or switch the pill")
    expect(fork).toContain("Doctor review before prescribing")
    expect(fork).toContain("FORM_FIRST_WEDGE")
    expect(fork).not.toMatch(/(?:linear|radial)-gradient/)
    expect(fork).not.toContain("backdrop-blur")
    expect(fork).not.toContain("framer-motion")
    expect(fork).not.toContain("group-hover:translate")
    expect(fork).not.toContain("transition-transform")
  })
})

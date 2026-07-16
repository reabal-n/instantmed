import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

describe("marketing and request reflow contract", () => {
  it("lets canonical headings break safely at extreme widths", () => {
    const heading = read("components/ui/heading.tsx")

    expect(heading).toContain('"max-w-full min-w-0 hyphens-auto [overflow-wrap:anywhere]"')
  })

  it("keeps the shared hero within an extreme-width viewport", () => {
    const hero = read("components/marketing/hero.tsx")

    expect(hero).toContain("mx-auto max-w-5xl px-4 sm:px-8 lg:px-10")
    expect(hero).toContain("flex-1 w-full min-w-0 text-center lg:text-left")
    expect(hero).toMatch(/inline-flex[^"\n]*max-w-full[^"\n]*flex-wrap[^"\n]*justify-center/)
    expect(hero).toContain("min-[241px]:whitespace-nowrap")
    expect(hero).toContain("max-[240px]:hidden")
    expect(hero).toContain("h-auto min-h-12 whitespace-normal px-4 py-3 text-center")
  })

  it.each([
    "components/marketing/erectile-dysfunction-landing.tsx",
    "components/marketing/uti-assessment-landing.tsx",
    "components/marketing/contraceptive-pill-assessment-landing.tsx",
  ])("%s uses explicit single-column hero tracks", (path) => {
    const landing = read(path)

    expect(landing).toContain(
      "relative mx-auto grid min-w-0 grid-cols-1 max-w-6xl gap-8",
    )
    expect(landing).toContain('<Reveal instant className="min-w-0 max-w-2xl">')
    expect(landing).toContain('<Reveal instant className="min-w-0">')
    expect(landing.match(/h-auto min-h-12 w-full whitespace-normal py-3 text-center/g)).toHaveLength(2)
  })

  it("keeps pricing cards and their calls to action reflowable", () => {
    const pricing = read("app/pricing/pricing-content.tsx")
    const decisions = read("components/marketing/service-decision-board.tsx")

    expect(pricing).toContain('<ServiceDecisionBoard id="pricing-cards"')
    expect(decisions).toContain("grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2")
    expect(decisions).toContain("grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3")
    expect(decisions).toContain("flex min-w-0 flex-col rounded-2xl")
    expect(decisions).toContain("h-auto min-h-12 w-full whitespace-normal py-3 text-center")
  })

  it("provides a shared emergency-width reflow floor", () => {
    const globals = read("app/globals.css")
    const button = read("components/ui/button.tsx")
    const footer = read("components/shared/footer.tsx")
    const mobileMenu = read("components/ui/animated-mobile-menu.tsx")
    const skipLink = read("components/shared/skip-to-content.tsx")

    expect(globals).toContain(':where([data-marketing]) {\n  overflow-wrap: anywhere;')
    expect(globals.indexOf(':where([data-marketing]) {\n  overflow-wrap: anywhere;')).toBeLessThan(
      globals.indexOf('@media (max-width: 240px)'),
    )
    expect(globals).toContain(
      ':where([data-marketing]) a.inline-flex.items-center.justify-center',
    )
    expect(globals).toContain("summary:focus-visible,")
    expect(globals).toContain('[tabindex]:not([tabindex="-1"]):focus-visible')
    expect(globals).toContain("outline: 2px solid var(--primary) !important;")
    expect(globals).toContain("outline-offset: 2px !important;")
    expect(globals).toContain("box-shadow: 0 0 0 4px var(--background) !important;")
    expect(globals).toContain('max-width: 100%;\n    height: auto;')
    expect(globals).toContain('white-space: normal;\n    overflow-wrap: anywhere;')
    expect(button).toContain("max-[240px]:h-auto max-[240px]:min-h-11")
    expect(button).toContain("max-[240px]:whitespace-normal max-[240px]:px-3")
    expect(button).toContain("focus-visible:ring-2 focus-visible:ring-primary")
    expect(button).not.toContain("focus-visible:ring-dawn-300")
    expect(button).not.toContain("dark:focus-visible:ring-dawn-500/40")
    expect(footer).toContain("grid-cols-1 min-[241px]:grid-cols-2")
    expect(footer).toContain("min-w-0 flex-wrap")
    expect(footer).not.toContain('<p className="whitespace-nowrap">')
    expect(mobileMenu.match(/w-full max-w-\[300px\]/g)).toHaveLength(2)
    expect(mobileMenu).not.toMatch(/(?:^|\s)w-\[300px\](?:\s|")/m)
    expect(mobileMenu).toContain("focus-visible:ring-2 focus-visible:ring-primary")
    expect(mobileMenu).not.toContain("focus-visible:ring-primary/50")
    expect(skipLink).toContain("focus:ring-4 focus:ring-primary")
    expect(skipLink).not.toContain("focus:ring-primary/30")
    expect(skipLink).toContain('data-skip-link-hydrated={isHydrated ? "true" : "false"}')
    expect(skipLink).toContain('fallbackTarget.querySelector<HTMLElement>("main")')
    expect(skipLink).toContain('target.setAttribute("tabindex", "-1")')
    expect(skipLink).toContain('target.focus({ preventScroll: true })')
    expect(skipLink).toContain('target.removeAttribute("tabindex")')
    expect(skipLink.match(/activateSkipTarget\(event,/g)).toHaveLength(2)
  })

  it("keeps dense comparisons and the homepage route map shrinkable", () => {
    const comparisonTable = read("components/sections/comparison-table.tsx")
    const routeMap = read("components/marketing/portfolio-route-map.tsx")

    expect(comparisonTable.match(/grid-cols-3 sm:grid-cols-\[1fr_120px_120px\]/g)).toHaveLength(2)
    expect(comparisonTable.match(/px-2 min-\[241px\]:px-6/g)).toHaveLength(2)
    expect(routeMap).toContain("lg:grid-cols-[minmax(0,0.86fr)_auto_minmax(0,1.14fr)]")
    expect(routeMap).toContain('className="min-w-0 flex-1"')
    expect(routeMap).toContain("grid-cols-[auto_minmax(0,1fr)]")
  })

  it("moves each compact commercial link as one reflowable unit", () => {
    const links = read("components/marketing/sections/commercial-intent-links-section.tsx")

    expect(links).toContain('<span key={link.href} className="inline-block">')
  })

  it("gives request services valid H2 structure and emergency-width reflow", () => {
    const serviceHub = read("components/request/service-hub-screen.tsx")
    const compactRow = serviceHub.slice(serviceHub.indexOf("function CompactServiceRow"))

    expect(serviceHub).toContain('data-patient-flow="true"')
    expect(serviceHub).toContain("flex flex-wrap min-[240px]:flex-nowrap")
    expect(compactRow).toContain("<section aria-labelledby={headingId}>")
    expect(compactRow).toContain('level="h3" as="h2"')
    expect(compactRow).toContain('className="sr-only"')
    expect(compactRow).toContain("aria-labelledby={headingId}")
    expect(compactRow).toContain("const descriptionId = `request-service-${id}-description`")
    expect(compactRow).toContain("const priceId = `request-service-${id}-price`")
    expect(compactRow).toContain('aria-describedby={`${descriptionId} ${priceId}`}')
    expect(compactRow).toContain("<p id={descriptionId}")
    expect(compactRow).toContain("<div id={priceId}")
    expect(compactRow).toContain('aria-hidden="true"')
    expect(compactRow).not.toContain("<h3")
    expect(compactRow).toContain("grid-cols-[auto_minmax(0,1fr)]")
    expect(compactRow).toContain("min-[240px]:flex")
    expect(compactRow).toContain("col-span-2")
    expect(compactRow).toContain("hidden text-border-em min-[240px]:inline")
    expect(compactRow).toContain("mt-1 block text-xs min-[240px]:mt-0 min-[240px]:inline")
    expect(compactRow).toContain(
      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    )
    expect(compactRow).not.toContain("focus-visible:ring-primary/25")
  })

  it("keeps the consult overview landmark and card tracks reflowable", () => {
    const consult = read("app/consult/page.tsx")
    const decisions = read("components/marketing/service-decision-board.tsx")

    expect(consult).toContain(
      '<main aria-label="Online doctor services" className="min-w-0 flex-1 bg-background">',
    )
    expect(consult).toContain("<Hero")
    expect(consult).toContain('<ServiceDecisionBoard id="services" className=')
    expect(consult).not.toContain("showDetails")
    expect(consult).not.toContain('from "next/image"')
    expect(consult).not.toContain("/images/consult-1.webp")
    expect(decisions).toContain("min-w-0 flex-1")
    expect(decisions).toContain("h-auto min-h-12 w-full whitespace-normal py-3 text-center")
  })

  it("keeps fixed-size hero specimens stable under enlarged root text", () => {
    const medCertLanding = read("components/marketing/med-cert-landing.tsx")
    const medCertMockup = read("components/marketing/mockups/med-cert-hero-mockup.tsx")

    expect(medCertLanding).toContain(
      'className="relative mt-12 shrink-0 self-center max-[240px]:hidden lg:mt-0"',
    )
    expect(medCertMockup).toContain('"w-[352px] xl:w-[384px]"')
    expect(medCertMockup).not.toContain('"w-[22rem] xl:w-[24rem]"')
  })

  it("keeps the shared sticky call to action off-canvas when hidden", () => {
    const sticky = read("components/marketing/shared/sticky-cta.tsx")
    const pricingSticky = read("app/pricing/pricing-sticky-cta.tsx")

    expect(sticky).toContain("initial={{}}")
    expect(sticky).toContain('y: show ? 0 : "100%"')
    expect(sticky).toContain('visibility: show ? "visible" : "hidden"')
    expect(sticky).toContain("inert={!show ? true : undefined}")
    expect(sticky).toContain("h-auto min-h-12 w-full whitespace-normal py-3 text-center")
    expect(sticky).toContain("min-w-0 break-words")
    expect(sticky).not.toContain("text-center truncate")
    expect(sticky).not.toContain("y: 100")
    expect(pricingSticky).toContain(
      "flex flex-col items-stretch gap-2 min-[241px]:flex-row min-[241px]:items-center min-[241px]:justify-between",
    )
    expect(pricingSticky).toContain(
      "w-full min-[241px]:w-auto min-[241px]:shrink-0",
    )
  })

  it("scopes 48px touch targets to patient flows without changing global targets", () => {
    const requestFlow = read("components/request/request-flow.tsx")
    const progress = read("components/request/progress-bar.tsx")
    const globals = read("app/globals.css")

    expect(requestFlow).toContain('data-patient-flow="true"')
    expect(requestFlow.match(/className="h-12 w-12 sm:h-10 sm:w-10"/g)).toHaveLength(2)
    expect(progress).toContain('data-request-progress-step="true"')
    expect(progress).toContain('data-request-progress-shell="true"')
    expect(progress).toContain('data-request-progress-track="true"')
    expect(progress).toContain('data-request-progress-grid="true"')
    expect(progress).toContain('data-request-progress-actionable={isClickable ? "true" : "false"}')
    expect(globals).toContain('[data-patient-flow="true"] :is(')
    expect(globals).toContain("min-height: 48px;")
    expect(globals).toContain("min-width: 48px;")
    expect(globals).toContain('@media (max-width: 240px)')
    const broadTargetIndex = globals.indexOf('[data-patient-flow="true"] :is(')
    const broadMinWidthIndex = globals.indexOf("min-width: 48px;", broadTargetIndex)
    const narrowProgressIndex = globals.indexOf(
      '[data-patient-flow="true"] button[data-request-progress-step="true"]',
    )

    expect(broadTargetIndex).toBeGreaterThan(-1)
    expect(broadMinWidthIndex).toBeGreaterThan(broadTargetIndex)
    expect(narrowProgressIndex).toBeGreaterThan(broadMinWidthIndex)
    expect(
      globals.slice(narrowProgressIndex, globals.indexOf("}", narrowProgressIndex)),
    ).toContain("min-width: 48px;")
    expect(globals).toContain('[data-request-progress-grid="true"]')
    expect(globals).toContain('[data-request-progress-step="true"]:disabled')
    expect(globals).not.toContain(
      '[data-patient-flow="true"] button[data-request-progress-step="true"] {\n    min-width: 0;',
    )
    expect(globals).toContain("/* Ensure all interactive elements meet touch target requirements */")
    expect(globals).toContain("min-height: 44px;")
    expect(globals).toContain("min-width: 44px;")
  })
})

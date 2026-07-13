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

    expect(pricing).toContain("grid min-w-0 grid-cols-1 gap-6 md:grid-cols-3")
    expect(pricing).toContain("relative min-w-0 rounded-2xl")
    expect(pricing).toContain(
      "w-full h-auto min-h-12 whitespace-normal rounded-xl py-3 text-center font-medium",
    )
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
    expect(compactRow).toContain('aria-hidden="true"')
    expect(compactRow).not.toContain("<h3")
    expect(compactRow).toContain("grid-cols-[auto_minmax(0,1fr)]")
    expect(compactRow).toContain("min-[240px]:flex")
    expect(compactRow).toContain("col-span-2")
  })

  it("keeps the consult overview landmark and card tracks reflowable", () => {
    const consult = read("app/consult/page.tsx")

    expect(consult).toContain('<main className="min-w-0">')
    expect(consult).toContain("grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2")
    expect(consult).toContain("grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2")
    expect(consult).toMatch(/className="[^"\n]*min-w-0[^"\n]*p-4[^"\n]*min-\[241px\]:p-6[^"\n]*sm:p-8/)
    expect(consult).toContain("flex-col items-start gap-3 min-[241px]:flex-row")
    expect(consult).toContain("whitespace-normal h-auto min-h-12 py-3 text-center")
  })

  it("keeps the shared sticky call to action off-canvas when hidden", () => {
    const sticky = read("components/marketing/shared/sticky-cta.tsx")

    expect(sticky).toContain('initial={{ y: "100%", opacity: 0 }}')
    expect(sticky).toContain('animate={{ y: show ? 0 : "100%", opacity: show ? 1 : 0 }}')
    expect(sticky).toContain("duration: prefersReducedMotion ? 0 : 0.3")
    expect(sticky).toContain("inert={!show ? true : undefined}")
    expect(sticky).toContain("h-auto min-h-12 w-full whitespace-normal py-3 text-center")
    expect(sticky).not.toContain("y: 100")
  })

  it("scopes 48px touch targets to patient flows without changing global targets", () => {
    const requestFlow = read("components/request/request-flow.tsx")
    const progress = read("components/request/progress-bar.tsx")
    const globals = read("app/globals.css")

    expect(requestFlow).toContain('data-patient-flow="true"')
    expect(requestFlow.match(/className="h-12 w-12 sm:h-10 sm:w-10"/g)).toHaveLength(2)
    expect(progress).toContain('data-request-progress-step="true"')
    expect(progress).toContain('className="relative h-12 sm:h-[3.35rem]"')
    expect(globals).toContain('[data-patient-flow="true"] :is(')
    expect(globals).toContain("min-height: 48px;")
    expect(globals).toContain("min-width: 48px;")
    expect(globals).toContain('@media (max-width: 240px)')
    expect(globals).toContain(
      '[data-patient-flow="true"] [data-request-progress-step="true"]',
    )
    expect(globals).toContain("min-width: 0;")
    expect(globals).toContain("/* Ensure all interactive elements meet touch target requirements */")
    expect(globals).toContain("min-height: 44px;")
    expect(globals).toContain("min-width: 44px;")
  })
})

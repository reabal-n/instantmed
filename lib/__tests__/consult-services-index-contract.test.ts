import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { getActiveServiceDecisions } from "@/lib/marketing/service-decisions"

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("/consult specialty-only services index contract", () => {
  it("derives exactly the five active service actions from the canonical catalog", () => {
    const decisions = getActiveServiceDecisions()

    expect(decisions.map(({ id }) => id)).toEqual([
      "med-cert",
      "repeat-rx",
      "ed",
      "hair-loss",
      "womens-health",
    ])
    expect(decisions.map(({ requestHref }) => requestHref)).toEqual([
      "/request?service=med-cert",
      "/request?service=repeat-script",
      "/request?service=consult&subtype=ed",
      "/request?service=consult&subtype=hair_loss",
      "/request?service=consult&subtype=womens_health",
    ])
  })

  it("uses the catalog-derived decision board instead of local service inventory", () => {
    const source = read("app/consult/page.tsx")
    const decisions = read("lib/marketing/service-decisions.ts")
    const board = read("components/marketing/service-decision-board.tsx")

    expect(source).toContain('const ACTIVE_SERVICES = getActiveServiceDecisions()')
    expect(source).toContain('<ServiceDecisionBoard id="services" className=')
    expect(source).not.toContain("showDetails")
    expect(decisions).toContain("getActiveServices()")
    expect(decisions).toContain("getServiceRequestHref(service)")
    expect(decisions).not.toContain("inclusions:")
    expect(decisions).not.toContain("steps:")
    expect(board).not.toContain("decision.inclusions")
    expect(board).not.toContain("decision.steps")
    expect(source).not.toContain("interface DetailedService")
    expect(source).not.toContain("const comingSoon")
  })

  it("keeps consult metadata and visible scope synced with the active set", () => {
    const source = read("app/consult/page.tsx")

    expect(source).toContain('canonical: "https://instantmed.com.au/consult"')
    expect(source).toContain("five focused online services")
    expect(source).toContain("InstantMed does not offer a broad general consult")
    expect(source.match(/question:/g)).toHaveLength(4)
    expect(source).toContain('question: "Will the doctor call me?"')
    expect(source).toContain('question: "How is this different from a GP visit?"')
    expect(source).toContain('question: "Is my information private?"')
    expect(source).toContain('question: "What if my concern does not fit these services?"')
    expect(source).not.toContain('question: "How much does it cost?"')
    expect(source).not.toContain("We treat four things")
  })

  it("uses the canonical marketing shell and landmarks", () => {
    const source = read("app/consult/page.tsx")
    const mainTag =
      '<main aria-label="Online doctor services" className="min-w-0 flex-1 bg-background">'

    expect(source).toContain(
      'title: { absolute: "Online Doctor Services in Australia | InstantMed" }',
    )
    expect(source).toContain("<MarketingPageShell>")
    expect(source).toContain('<Navbar variant="marketing" />')
    expect(source).toContain("<Hero")
    expect(source).toContain('className="pt-14"')
    expect(source).toContain('mockupClassName="hidden lg:block"')
    expect(source).toContain("<FAQSection")
    expect(source).toContain("<CTABanner")
    expect(source).not.toContain("<FaqCtaSection")
    expect(source).not.toContain("<h1 className=")
    expect(source).toContain(mainTag)
    expect(source).toContain("<MarketingFooter />")
    expect(source.indexOf('<Navbar variant="marketing" />')).toBeLessThan(
      source.indexOf(mainTag),
    )
    expect(source.indexOf(mainTag)).toBeLessThan(source.indexOf("<MarketingFooter />"))
  })

  it("keeps women's health narrow and possible prescribing contact visible", () => {
    const source = read("app/consult/page.tsx")
    const decisions = read("lib/marketing/service-decisions.ts")
    const board = read("components/marketing/service-decision-board.tsx")

    expect(decisions).toContain("starting or switching the contraceptive pill")
    expect(decisions).not.toContain("start, switch, or continue the contraceptive pill")
    expect(source).toContain("may call or message if more information is clinically needed")
    expect(source).not.toContain("no call needed")
    expect(decisions).not.toContain("FORM_FIRST_WEDGE")
    expect(decisions.match(/doctorRole:/g)).toHaveLength(1)
    expect(board).toContain('import { FORM_FIRST_WEDGE } from "@/lib/marketing/voice"')
    expect(board.match(/\{FORM_FIRST_WEDGE\}/g)).toHaveLength(1)
    expect(board).toContain('aria-label="Prescription review model"')
  })

  it("does not attach a med-cert-only live counter to the generic service selector", () => {
    const source = read("app/consult/page.tsx")

    expect(source).not.toContain("getWaitState")
    expect(source).not.toContain("<WaitCounter")
    expect(source).toContain("reassuranceRow={(")
  })

  it("keeps gated categories non-actionable on the overview", () => {
    const source = read("app/consult/page.tsx")

    expect(source).not.toContain("weight_loss")
    expect(source).not.toContain("weight-loss-online")
    expect(source).not.toMatch(/Start (?:a )?(?:general consult|antibiotics?|weight)/i)
  })

  it("renders one schema entry per active catalog service", () => {
    const source = read("app/consult/page.tsx")

    expect(source).toContain("ACTIVE_SERVICES.map((service) => (")
    expect(source).toContain("MedicalServiceSchema")
    expect(source).toContain("price={service.priceFrom.toFixed(2)}")
    expect(source).not.toMatch(/MedicalServiceSchema[\s\S]*?name="Online Doctor Services"/)
  })

  it("uses 24/7 availability without a fixed review-time promise", () => {
    const source = read("app/consult/page.tsx")

    expect(source).toContain("Requests and review 24/7")
    expect(source).not.toMatch(/1[-–]2\s*hours?|within (?:an?|1) hour|same[- ]day\s*(?:review|service|access|turnaround)|7 days a week|AEST hours/i)
  })

  it("keeps the eligibility, fee, Medicare, and outside-scope boundaries concise", () => {
    const source = read("app/consult/page.tsx")

    expect(source).not.toContain("bg-amber-100")
    expect(source).toContain("Australia only. 18+. Fees from")
    expect(source).toContain("PRICING_DISPLAY.MED_CERT")
    expect(source).toContain("Medical certificates")
    expect(source).toContain("do not require Medicare; prescribing pathways require Medicare")
    expect(source).toContain('question: "What if my concern does not fit these services?"')
    expect(source).toContain("call 000 or seek urgent in-person care")
  })

  it("uses no em dashes", () => {
    expect(read("app/consult/page.tsx")).not.toContain("—")
  })
})

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { SERVICE_CATALOG } from "@/lib/services/service-catalog"

const root = process.cwd()
const read = (p: string) => readFileSync(join(root, p), "utf8")

describe("one name per service (19 Sep 2026 audit)", () => {
  it("names the repeat and hair-loss services the way their pages do", () => {
    expect(SERVICE_CATALOG["repeat-rx"].title).toBe("Repeat prescription")
    expect(SERVICE_CATALOG["repeat-rx"].subtitle).toBe("Your regular medicine, reviewed by a doctor")
    expect(SERVICE_CATALOG.ed.subtitle).toBe("Private doctor assessment")
    expect(SERVICE_CATALOG["hair-loss"].title).toBe("Hair loss assessment")
    expect(SERVICE_CATALOG["hair-loss"].subtitle).toBe("Doctor-reviewed, from home")
  })

  it("uses one CTA grammar: verb + object · price", () => {
    const rx = read("components/marketing/prescriptions-landing.tsx")
    const rxControls = read("components/marketing/prescriptions-client-controls.tsx")
    const routeMap = read("components/marketing/portfolio-route-map.tsx")
    const ed = read("components/marketing/erectile-dysfunction-landing.tsx")
    const wh = read("components/marketing/womens-health-landing.tsx")

    expect(rx).toContain("Get your repeat · ${PRICING_DISPLAY.REPEAT_SCRIPT}")
    expect(rxControls).toContain("Get your repeat · ${PRICING_DISPLAY.REPEAT_SCRIPT}")
    expect(rx).toContain('ctaText="Get your repeat"')
    expect(routeMap).toContain('cta: "Get your repeat"')
    expect(rx).not.toContain("Renew")
    expect(rxControls).not.toContain("Renew")
    expect(ed).toContain("Start private assessment · ${PRICING_DISPLAY.MENS_HEALTH}")
    expect(ed).not.toContain("Request assessment -")
    expect(wh).toContain("Start assessment · ${PRICING_DISPLAY.WOMENS_HEALTH}")
  })
})

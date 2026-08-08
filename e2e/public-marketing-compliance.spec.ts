import { expect, test } from "@playwright/test"

const PUBLIC_PATHS = [
  { path: "/", label: "Homepage" },
  { path: "/pricing", label: "Pricing" },
  { path: "/request", label: "Service hub" },
  { path: "/medical-certificate", label: "Medical certificate" },
  { path: "/sign-in", label: "Sign in" },
] as const

const REVIEW_NUMERIC_PATTERNS = [
  /\b[0-9]\.[0-9]\s*\/\s*5\b/i,
  /\b[0-9]\.[0-9]\s*stars?\b/i,
  /\b[0-9]\.[0-9]\s*★/i,
  /\b[0-9][0-9,]*\+?\s+reviews?\b/i,
  /\btestimonial(s)?\b/i,
]

const ACTIVE_SERVICE_IDS = [
  "med-cert",
  "repeat-rx",
  "ed",
  "hair-loss",
  "womens-health",
  "weight-loss",
] as const

async function visibleText(page: import("@playwright/test").Page) {
  return page.locator("body").innerText()
}

function serviceIdForRequestHref(href: string): (typeof ACTIVE_SERVICE_IDS)[number] | null {
  const url = new URL(href, "https://instantmed.com.au")
  if (url.pathname !== "/request") return null

  const service = url.searchParams.get("service")
  const subtype = url.searchParams.get("subtype")

  if (service === "med-cert") return "med-cert"
  if (service === "repeat-script") return "repeat-rx"
  if (service === "consult" && subtype === "ed") return "ed"
  if (service === "consult" && subtype === "hair_loss") return "hair-loss"
  if (service === "consult" && subtype === "womens_health") return "womens-health"

  return null
}

async function publicActions(page: import("@playwright/test").Page) {
  return page.locator("a[href], button").evaluateAll((elements) =>
    elements.map((element) => ({
      href: element instanceof HTMLAnchorElement ? element.getAttribute("href") ?? "" : "",
      text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
    })),
  )
}

function isForbiddenServiceAction(action: { href: string; text: string }) {
  const url = new URL(action.href || "/", "https://instantmed.com.au")
  const startsCareAction = /^(start|request|get|book|choose)\b/i.test(action.text)
  const isSpecificSpecialty = /\b(?:ED|erectile|hair|women(?:'s)?|UTI|contracept)\b/i.test(
    action.text,
  )

  if (url.pathname === "/request" && url.searchParams.has("service")) {
    return serviceIdForRequestHref(action.href) === null
  }

  if (url.pathname === "/general-consult") {
    return startsCareAction
  }

  if (!startsCareAction) return false

  // Weight management is a live service since 2026-08-07; only retired
  // general-consult and antibiotic-guarantee actions stay forbidden.
  if (/\b(?:general consult(?:ation)?|antibiotics?)\b/i.test(action.text)) {
    return true
  }

  return /\bconsult(?:ation)?\b/i.test(action.text) && !isSpecificSpecialty
}

test.describe("Public marketing compliance smoke", () => {
  for (const surface of PUBLIC_PATHS) {
    test(`${surface.label} keeps Google proof stars-only and hides gated pricing`, async ({ page }) => {
      const response = await page.goto(surface.path, { waitUntil: "domcontentloaded" })
      expect(response?.status(), `${surface.path} should load`).toBeLessThan(400)

      await expect(
        page.locator('[aria-label="Google star rating"]').first(),
        `${surface.path} should render the stars-only Google proof badge`,
      ).toBeVisible({ timeout: 10_000 })

      const bodyText = await visibleText(page)

      for (const pattern of REVIEW_NUMERIC_PATTERNS) {
        expect(bodyText, `${surface.path} leaked numeric review/testimonial copy`).not.toMatch(pattern)
      }

      // Weight management launched 2026-08-07 — $89.95 is legitimate live
      // pricing on decision surfaces now, so the gated-leak pins are retired.
    })
  }

  test("pricing and consult expose only active service actions", async ({ page }) => {
    for (const path of ["/pricing", "/consult"] as const) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" })
      expect(response?.status(), `${path} should load`).toBeLessThan(400)

      const actions = await publicActions(page)
      expect(
        actions.filter(isForbiddenServiceAction),
        `${path} exposed a general-consult, antibiotic, or weight-loss care action`,
      ).toEqual([])

      const bodyText = await visibleText(page)
      expect(bodyText, `${path} should include the active women's-health service`).toMatch(
        /Women's health/i,
      )
    }
  })

  test("consult routes exactly the six active services through canonical intake URLs", async ({ page }) => {
    await page.goto("/consult", { waitUntil: "domcontentloaded" })

    const requestHrefs = await page
      .locator('a[href^="/request?service="]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
    const routedServiceIds = requestHrefs
      .map(serviceIdForRequestHref)
      .filter((serviceId): serviceId is (typeof ACTIVE_SERVICE_IDS)[number] => serviceId !== null)

    expect([...new Set(routedServiceIds)].sort()).toEqual([...ACTIVE_SERVICE_IDS].sort())
    // Weight management is live — its card and CTA are expected now, and
    // nothing on the page is coming-soon.
    await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(0)
  })

  test("pricing routes exactly the six active services through canonical intake URLs", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" })

    const cards = page.locator("[data-service-id]")
    await expect(cards).toHaveCount(ACTIVE_SERVICE_IDS.length)
    expect((await cards.evaluateAll((items) => items.map((item) => item.getAttribute("data-service-id")))).sort())
      .toEqual([...ACTIVE_SERVICE_IDS].sort())

    const requestHrefs = await cards
      .locator('a[href^="/request?service="]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""))
    const routedServiceIds = requestHrefs
      .map(serviceIdForRequestHref)
      .filter((serviceId): serviceId is (typeof ACTIVE_SERVICE_IDS)[number] => serviceId !== null)

    expect([...new Set(routedServiceIds)].sort()).toEqual([...ACTIVE_SERVICE_IDS].sort())
  })

  test("Medicare wording stays scoped to medical certificates", async ({ page }) => {
    await page.goto("/medical-certificate", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("No Medicare needed").first()).toBeVisible()

    await page.goto("/request", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("No Medicare needed for medical certificates").first()).toBeVisible()

    await page.goto("/pricing", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Not for medical certificates", { exact: false }).first()).toBeVisible()
    await expect(page.getByText("For prescriptions and consultations", { exact: false }).first()).toBeVisible()
  })
})

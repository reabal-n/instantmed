import { expect, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

const ACTIVE_SERVICE_ROWS = [
  { id: "med-cert", name: "Medical certificate", url: /service=med-cert/ },
  { id: "repeat-rx", name: "Refill a prescription", url: /service=repeat-script/ },
  { id: "ed", name: "Erectile dysfunction", url: /service=consult.*subtype=ed/ },
  { id: "hair-loss", name: "Hair loss treatment", url: /service=consult.*subtype=hair_loss/ },
  { id: "womens-health", name: "Women's health", url: /service=consult.*subtype=womens_health/ },
] as const

async function clearRequestState(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.removeItem("instantmed-draft-med-cert")
    localStorage.removeItem("instantmed-draft-prescription")
    localStorage.removeItem("instantmed-draft-consult")
    localStorage.removeItem("instantmed-request-draft")
    localStorage.removeItem("instantmed-preferences")
  })
}

test.describe("Service Hub", () => {
  test.beforeEach(async ({ page }) => {
    await clearRequestState(page)
  })

  test("renders current active services and coming-soon services", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /What brings you in today/i })).toBeVisible()

    const activeRows = page.locator('button[aria-labelledby^="request-service-"]')
    await expect(activeRows).toHaveCount(ACTIVE_SERVICE_ROWS.length)

    const activeRowIds = await activeRows.evaluateAll((rows) =>
      rows.map((row) =>
        row
          .getAttribute("aria-labelledby")
          ?.replace(/^request-service-/, "")
          .replace(/-heading$/, ""),
      ),
    )
    expect(activeRowIds).toEqual(ACTIVE_SERVICE_ROWS.map((service) => service.id))

    for (const service of ACTIVE_SERVICE_ROWS) {
      await expect(page.getByRole("button", { name: service.name, exact: true })).toBeVisible()
    }

    await expect(page.getByRole("button", { name: /General consultation/i })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /Antibiotic/i })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /Weight (management|loss)/i })).toHaveCount(0)

    await expect(page.getByText("Popular")).toBeVisible()
    const comingSoonStrip = page.locator('[data-coming-soon-strip="true"]')
    await expect(comingSoonStrip.getByText("Coming soon", { exact: true })).toBeVisible()
    await expect(
      comingSoonStrip.getByLabel("Weight management: not taking requests yet", { exact: true }),
    ).toHaveAttribute("aria-disabled", "true")
    await expect(comingSoonStrip.getByText("Women's health", { exact: true })).toHaveCount(0)
  })

  test("routes active service rows to the correct request flows", async ({ page }) => {
    for (const service of ACTIVE_SERVICE_ROWS) {
      await page.goto("/request")
      await waitForPageLoad(page)

      await page.getByRole("button", { name: service.name, exact: true }).click()
      await page.waitForURL(service.url, { timeout: 15000 })
    }
  })

  test("direct request URLs bypass the hub or show the invalid-service state", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible()

    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /What brings you in today/i })).not.toBeVisible()

    await page.goto("/request?service=invalid-service")
    await waitForPageLoad(page)
    await expect(page.getByText("Unknown service")).toBeVisible()
    await expect(page.getByRole("button", { name: /Choose a service/i })).toBeVisible()
  })

  test("shows and clears request drafts using the current compact banner", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "instantmed-draft-med-cert",
        JSON.stringify({
          serviceType: "med-cert",
          currentStepId: "symptoms",
          lastSavedAt: new Date().toISOString(),
          answers: { certType: "work" },
        }),
      )
    })

    await page.goto("/request")
    await waitForPageLoad(page)

    await expect(page.getByText(/Continue your medical certificate/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /Resume/i })).toBeVisible()

    await page.getByRole("button", { name: /Discard draft/i }).click()
    await expect(page.getByText(/Continue your medical certificate/i)).not.toBeVisible()
    await expect(page.evaluate(() => localStorage.getItem("instantmed-draft-med-cert"))).resolves.toBeNull()
  })
})

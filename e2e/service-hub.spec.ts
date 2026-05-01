import { expect, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

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

    await expect(page.getByRole("button", { name: /Medical certificate/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Refill a prescription/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Erectile dysfunction/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Hair loss treatment/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /General consultation/i })).toBeVisible()

    await expect(page.getByText("Popular")).toBeVisible()
    await expect(page.getByText("Coming soon")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Women's health" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Weight management" })).toBeVisible()
  })

  test("routes active service rows to the correct request flows", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)

    await page.getByRole("button", { name: /Medical certificate/i }).click()
    await page.waitForURL(/service=med-cert/, { timeout: 15000 })
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible()

    await page.goto("/request")
    await page.getByRole("button", { name: /Refill a prescription/i }).click()
    await page.waitForURL(/service=repeat-script/, { timeout: 15000 })

    await page.goto("/request")
    await page.getByRole("button", { name: /Erectile dysfunction/i }).click()
    await page.waitForURL(/service=consult.*subtype=ed/, { timeout: 15000 })

    await page.goto("/request")
    await page.getByRole("button", { name: /Hair loss treatment/i }).click()
    await page.waitForURL(/service=consult.*subtype=hair_loss/, { timeout: 15000 })

    await page.goto("/request")
    await page.getByRole("button", { name: /General consultation/i }).click()
    await page.waitForURL(/service=consult.*subtype=general/, { timeout: 15000 })
  })

  test("direct request URLs bypass the hub or show the invalid-service state", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible()

    await page.goto("/request?service=prescription")
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

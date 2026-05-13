import { expect, type Page, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { INTAKE_ID, isDbAvailable } from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const PATIENT_ID = "e2e00000-0000-0000-0000-000000000002"

async function expectNoDesktopPageScroll(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }))

  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1)
}

test.describe("operator viewport contract", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "SUPABASE_SERVICE_ROLE_KEY required")
    await page.setViewportSize({ width: 1440, height: 900 })
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("keeps the core operator cockpit pages inside one desktop viewport", async ({ page }) => {
    await page.goto("/admin")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /^staff cockpit$/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /^admin layer$/i })).toBeVisible()
    await expect(page.getByTestId("queue-heading")).toBeVisible()
    await expect(page.getByText(/switch to doctor|doctor mode|continue as doctor/i)).toHaveCount(0)
    await expectNoDesktopPageScroll(page)

    await page.goto("/admin/ops")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /^operations$/i })).toBeVisible()
    await expect(page.getByTestId("operator-scroll-area")).toBeVisible()
    await expect(page.getByText(/switch to doctor|doctor mode|continue as doctor/i)).toHaveCount(0)
    await expectNoDesktopPageScroll(page)

    await page.goto(`/admin/intakes/${INTAKE_ID}`)
    await waitForPageLoad(page)
    await expect(page.getByTestId("operator-action-rail")).toBeVisible()
    await expect(page.getByText(/switch to doctor|doctor mode|continue as doctor/i)).toHaveCount(0)
    await expectNoDesktopPageScroll(page)

    await page.goto(`/admin/patients/${PATIENT_ID}`)
    await waitForPageLoad(page)
    await expect(page.getByTestId("operator-action-rail")).toBeVisible()
    await expect(page.getByText(/switch to doctor|doctor mode|continue as doctor/i)).toHaveCount(0)
    await expectNoDesktopPageScroll(page)
  })

  test("keeps essential operator ops pages inside the staff shell", async ({ page }) => {
    test.setTimeout(120_000)

    const pages = [
      { path: "/admin/intakes", heading: /intake ledger/i },
      { path: "/admin/ops/parchment", heading: /parchment ops/i },
      { path: "/admin/ops/patient-merge-audit", heading: /patient merge audit/i },
      { path: "/admin/ops/prescribing-identity", heading: /prescribing identity blocks/i },
      { path: "/admin/analytics?tab=queue", heading: /analytics/i },
      { path: "/admin/webhook-dlq", heading: /payment webhooks/i },
      { path: "/admin/refunds?status=failed", heading: /^refunds$/i },
      { path: "/admin/emails/hub?tab=queue", heading: /email delivery/i },
      { path: "/admin/features", heading: /feature flags/i, boundedConsole: true },
      { path: "/admin/settings/templates", heading: /certificate templates/i },
    ]

    for (const pageConfig of pages) {
      await page.goto(pageConfig.path)
      await waitForPageLoad(page)
      await expect(page.getByRole("heading", { name: pageConfig.heading })).toBeVisible({ timeout: 15000 })
      await expect(page.getByTestId("operator-page")).toBeVisible()
      if ("boundedConsole" in pageConfig) {
        await expect(page.getByTestId("feature-flags-bounded-console")).toBeVisible()
        await expect(page.getByTestId("feature-flag-critical-strip")).toBeVisible()
      } else {
        await expect(page.getByTestId("operator-scroll-area")).toBeVisible()
      }
      await expect(page.getByText(/switch to doctor|doctor mode|continue as doctor/i)).toHaveCount(0)
      await expectNoDesktopPageScroll(page)
    }
  })
})

import { expect, type Page, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import { INTAKE_ID, isDbAvailable, resetIntakeForRetest } from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const SEEDED_PATIENT_NAME = "E2E Test Patient"

async function stabilizeOperatorVisual(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  })

  await page.evaluate(() => {
    const root = document.querySelector("main") ?? document.body
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []

    while (walker.nextNode()) {
      nodes.push(walker.currentNode as Text)
    }

    for (const node of nodes) {
      if (!node.textContent) continue
      node.textContent = node.textContent
        .replace(/IM-[A-Z0-9-]+/g, "IM-REFERENCE")
        .replace(/e2e[0-9a-f-]{28,}/gi, "E2E-ID")
        .replace(/\b\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}(?:,\s+\d{1,2}:\d{2}\s?(?:am|pm))?/gi, "DATE")
        .replace(/\b\d{1,2}:\d{2}\s?(?:am|pm)\b/gi, "TIME")
    }
  })
}

async function prewarmReviewDataRoute(page: Page, intakeId: string): Promise<unknown> {
  const csrfResponse = await page.request.get("/api/csrf")
  const csrfPayload = await csrfResponse.json().catch(() => ({})) as { token?: string }
  const csrfHeaders = csrfPayload.token ? { "X-CSRF-Token": csrfPayload.token } : undefined

  const [reviewResponse, lockResponse, auditResponse] = await Promise.all([
    page.request.get(`/api/doctor/intakes/${intakeId}/review-data`),
    page.request.post(`/api/doctor/intakes/${intakeId}/lock`, { headers: csrfHeaders }),
    page.request.post(`/api/doctor/intakes/${intakeId}/audit-view`, {
      headers: {
        ...csrfHeaders,
        "Content-Type": "application/json",
      },
      data: { serviceType: "med_certs", hasSafetyFlags: false },
    }),
  ])

  expect(csrfResponse.status()).toBe(200)
  expect(reviewResponse.status()).toBe(200)
  expect([200, 403]).toContain(lockResponse.status())
  expect([200, 403]).toContain(auditResponse.status())

  return reviewResponse.json()
}

async function useStableReviewDataRoute(page: Page, intakeId: string, payload: unknown) {
  await page.route(`**/api/doctor/intakes/${intakeId}/review-data`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    })
  })
}

async function expectOperatorScreenshot(page: Page, snapshotName: string) {
  await stabilizeOperatorVisual(page)
  await expect(page).toHaveScreenshot(snapshotName, {
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    maxDiffPixelRatio: 0.01,
  })
}

test.describe("operator visual regression", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "SUPABASE_SERVICE_ROLE_KEY required")
    await resetIntakeForRetest(INTAKE_ID)
    await page.setViewportSize({ width: 1440, height: 900 })
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("captures the unified admin cockpit", async ({ page }) => {
    await page.goto("/admin")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /^staff cockpit$/i })).toBeVisible()
    await expectOperatorScreenshot(page, "operator-admin-cockpit.png")
  })

  test("captures the operations cockpit", async ({ page }) => {
    await page.goto("/admin/ops")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /^operations$/i })).toBeVisible()
    await expectOperatorScreenshot(page, "operator-admin-ops.png")
  })

  test("captures the intake ledger", async ({ page }) => {
    await page.goto("/admin/intakes")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /intake ledger/i })).toBeVisible()
    await expectOperatorScreenshot(page, "operator-admin-intakes.png")
  })

  test("captures the review panel cockpit", async ({ page }) => {
    const reviewPayload = await prewarmReviewDataRoute(page, INTAKE_ID)
    await useStableReviewDataRoute(page, INTAKE_ID, reviewPayload)
    await page.goto("/admin")
    await waitForPageLoad(page)

    const openCaseButton = page.getByRole("button", { name: new RegExp(`Open case for ${SEEDED_PATIENT_NAME}`, "i") })
    await expect(openCaseButton).toBeVisible({ timeout: 20_000 })
    await openCaseButton.click()

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText("Blockers only")).toBeVisible({ timeout: 20_000 })
    await expectOperatorScreenshot(page, "operator-review-panel.png")
  })
})

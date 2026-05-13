import { expect, type Page, test } from "@playwright/test"

import { loginAsDoctor, loginAsOperator, loginAsSupport, logoutTestUser } from "./helpers/auth"

const GENERIC_ERROR = /Something went wrong|Please try again\. If this keeps happening|Error loading dashboard/i

async function assertNoGenericError(page: Page) {
  await expect(page.locator("body")).not.toContainText(GENERIC_ERROR)
}

async function visibleSidebarHrefs(page: Page): Promise<string[]> {
  return page.locator('aside[aria-label="Staff sidebar"] nav[aria-label="Primary"] a[href]')
    .evaluateAll((links) => Array.from(new Set(
      links
        .map((link) => link.getAttribute("href"))
        .filter((href): href is string => typeof href === "string" && href.startsWith("/")),
    )))
}

async function crawlVisibleStaffNav(page: Page, entryPath: string) {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.goto(entryPath, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 })
  await assertNoGenericError(page)

  const hrefs = await visibleSidebarHrefs(page)
  expect(hrefs.length, "staff sidebar should expose at least one visible nav link").toBeGreaterThan(0)

  for (const href of hrefs) {
    const response = await page.goto(href, { waitUntil: "domcontentloaded" })
    expect(response?.status(), `${href} should not hard-fail`).toBeLessThan(500)
    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 })
    await assertNoGenericError(page)
  }
}

test.describe("staff nav crawler", () => {
  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("owner admin doctor nav links all load", async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, result.error).toBe(true)

    await crawlVisibleStaffNav(page, "/dashboard")
  })

  test("doctor-only nav links all load", async ({ page }) => {
    const result = await loginAsDoctor(page)
    expect(result.success, result.error).toBe(true)

    await crawlVisibleStaffNav(page, "/dashboard")
  })

  test("support-only nav links all load", async ({ page }) => {
    const result = await loginAsSupport(page)
    expect(result.success, result.error).toBe(true)

    await crawlVisibleStaffNav(page, "/dashboard")
  })
})

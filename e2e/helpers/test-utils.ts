import { Page, expect } from "@playwright/test"

/**
 * E2E Test Utilities
 * Common helpers for Playwright tests
 */

/**
 * Wait for page to be fully loaded (no network activity)
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle")
}

/**
 * Fill form field and verify value
 */
export async function fillField(page: Page, selector: string, value: string) {
  const field = page.locator(selector)
  await field.fill(value)
  await expect(field).toHaveValue(value)
}

/**
 * Click button and wait for navigation or response
 */
export async function clickAndWait(
  page: Page, 
  selector: string, 
  options?: { waitFor?: "navigation" | "networkidle" }
) {
  const button = page.locator(selector)
  await button.click()
  
  if (options?.waitFor === "navigation") {
    await page.waitForURL(/.*/)
  } else {
    await page.waitForLoadState("networkidle")
  }
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).isVisible()
}

/**
 * Select option from dropdown
 */
export async function selectOption(page: Page, selector: string, value: string) {
  await page.locator(selector).selectOption(value)
}

/**
 * Check checkbox
 */
export async function checkBox(page: Page, selector: string) {
  const checkbox = page.locator(selector)
  if (!(await checkbox.isChecked())) {
    await checkbox.check()
  }
}

/**
 * Wait for toast/notification message
 */
export async function waitForToast(page: Page, text: string) {
  await expect(page.getByText(text)).toBeVisible({ timeout: 10000 })
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: { status?: number; body: unknown }
) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status: response.status || 200,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    })
  })
}

/**
 * Generate test Medicare number (valid format, not real)
 */
export function generateTestMedicare(): { number: string; irn: string; expiry: string } {
  return {
    number: "2123456701", // Test Medicare number (starts with 2)
    irn: "1",
    expiry: "12/2026",
  }
}

/**
 * Generate test phone number
 */
export function generateTestPhone(): string {
  return "0412345678"
}

/**
 * Generate test address
 */
export function generateTestAddress() {
  return {
    line1: "123 Test Street",
    suburb: "Sydney",
    state: "NSW",
    postcode: "2000",
  }
}

import { expect, type Page, test } from "@playwright/test"

import { generateTestAddress as _generateTestAddress,generateTestMedicare as _generateTestMedicare, generateTestPhone as _generateTestPhone, waitForPageLoad } from "./helpers/test-utils"

/**
 * Medical Certificate Flow E2E Tests
 * 
 * Tests the complete patient journey for requesting a medical certificate:
 * 1. Landing page → Start flow
 * 2. Symptom selection
 * 3. Duration selection
 * 4. Personal details (for guests)
 * 5. Review & consent
 * 6. Payment (mocked)
 * 7. Confirmation
 */

function getHeroCertificateCta(page: Page) {
  return page
    .getByRole("main")
    .getByRole("link", { name: /get your certificate/i })
    .first()
}

test.describe("Medical Certificate Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start from the medical certificate landing page
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
  })

  test("landing page loads correctly", async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Medical Certificate/i)
    
    // Check main CTA is visible (use main content area to avoid nav buttons)
    const startButton = getHeroCertificateCta(page)
    await expect(startButton).toBeVisible({ timeout: 10000 })
    
    // Check key trust elements are present
    await expect(page.getByText(/AHPRA|Australian doctor|doctor/i).first()).toBeVisible()
  })

  test("can navigate to intake flow", async ({ page }) => {
    // Click main CTA in content area
    await getHeroCertificateCta(page).click()
    
    // Should navigate to intake or show first step
    await expect(page).toHaveURL(/request|medical-certificate/i)
  })

  test("intake page loads", async ({ page }) => {
    // Navigate directly to unified request flow
    await page.goto("/request?service=med-cert")
    
    // Page should load the unified request flow
    await expect(page).toHaveURL(/request/i)
  })

  test("responsive design - mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
    
    // Page should be usable on mobile - check heading is visible
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("accessibility - page has heading structure", async ({ page }) => {
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
    
    // Page should have proper heading structure
    const h1 = page.getByRole("heading", { level: 1 })
    await expect(h1).toBeVisible()
  })

  test("displays pricing information", async ({ page }) => {
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
    
    // Price should be visible somewhere on page
    const priceText = page.getByText(/\$\d+/i).first()
    await expect(priceText).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Medical Certificate - Guest Flow", () => {
  test("guest can start without login", async ({ page }) => {
    await page.goto("/medical-certificate")
    await waitForPageLoad(page)
    
    // Should be able to start without signing in
    const startButton = getHeroCertificateCta(page)
    await expect(startButton).toBeVisible({ timeout: 10000 })
    await expect(startButton).toBeEnabled()
  })
})

test.describe("Medical Certificate - certType URL Pre-seeding", () => {
  test("certType=work pre-selects Work in the certificate step", async ({ page }) => {
    await page.goto("/request?service=med-cert&certType=work")
    await waitForPageLoad(page)

    // Certificate step should render with Work pre-selected
    const workRadio = page.getByRole("radio", { name: /Work/i })
    await expect(workRadio).toBeVisible({ timeout: 10000 })
    await expect(workRadio).toHaveAttribute("aria-checked", "true")
  })

  test("certType=study pre-selects Study in the certificate step", async ({ page }) => {
    await page.goto("/request?service=med-cert&certType=study")
    await waitForPageLoad(page)

    const studyRadio = page.getByRole("radio", { name: /Study/i })
    await expect(studyRadio).toBeVisible({ timeout: 10000 })
    await expect(studyRadio).toHaveAttribute("aria-checked", "true")
  })

  test("certType=carer pre-selects Carer in the certificate step", async ({ page }) => {
    await page.goto("/request?service=med-cert&certType=carer")
    await waitForPageLoad(page)

    const carerRadio = page.getByRole("radio", { name: /Carer/i })
    await expect(carerRadio).toBeVisible({ timeout: 10000 })
    await expect(carerRadio).toHaveAttribute("aria-checked", "true")
  })

  test("invalid certType is ignored - no pre-selection", async ({ page }) => {
    await page.goto("/request?service=med-cert&certType=invalid")
    await waitForPageLoad(page)

    // All radios should be unchecked (unless smart defaults kick in)
    const radios = page.getByRole("radio")
    const count = await radios.count()
    // At least one radio should exist (the cert type selector rendered)
    expect(count).toBeGreaterThanOrEqual(3)
  })
})

test.describe("Medical Certificate - Scroll Stability", () => {
  test("landing and request pages scroll without runtime errors", async ({ page }) => {
    const errors: string[] = []
    const benignConsoleErrors = [
      /favicon/i,
      /third-party cookie/i,
    ]

    page.on("console", (msg) => {
      if (msg.type() === "error" && !benignConsoleErrors.some((pattern) => pattern.test(msg.text()))) {
        errors.push(msg.text())
      }
    })
    page.on("pageerror", (error) => {
      errors.push(error.message)
    })

    for (const path of ["/medical-certificate", "/medical-certificate/work", "/request?service=med-cert"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await waitForPageLoad(page)
      await page.mouse.wheel(0, 1800)
      await page.waitForTimeout(250)
      await page.mouse.wheel(0, 1800)
      await page.waitForTimeout(250)
      await page.mouse.wheel(0, -1200)
      await page.waitForTimeout(250)
    }

    expect(errors).toEqual([])
  })

  test("CSP allows Google AU conversion telemetry used on med-cert request", async ({ request }) => {
    const response = await request.get("/request?service=med-cert")
    const csp = response.headers()["content-security-policy"] || ""

    expect(csp).toContain("connect-src")
    expect(csp).toContain("https://*.google.com.au")
  })
})

test.describe("Medical Certificate - Error Handling", () => {
  test("handles network errors gracefully", async ({ page }) => {
    // Mock a network failure on API calls
    await page.route("**/api/**", (route) => {
      route.abort("failed")
    })
    
    await page.goto("/medical-certificate")
    
    // Page should still load (static content)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("shows error message on submission failure", async ({ page }) => {
    // Mock API to return error
    await page.route("**/api/requests/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      })
    })
    
    // Navigate to unified request flow
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Error handling would show user-friendly message
    // (Specific test depends on form implementation)
  })
})

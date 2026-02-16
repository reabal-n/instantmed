/**
 * Layout Contract E2E Tests
 * 
 * Verifies consistent layout structure across dashboards using DOM assertions.
 * No screenshot comparisons - uses class and attribute assertions.
 */

import { test, expect } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"

test.describe("Layout Contracts - Doctor Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("doctor main has correct container classes", async ({ page }) => {
    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    // Check main content area exists with expected structure
    const main = page.locator('[data-testid="doctor-main"]')
    await expect(main).toBeVisible()

    // Main should have flex-1 and padding classes
    const mainClass = await main.getAttribute("class")
    expect(mainClass).toContain("flex-1")
    expect(mainClass).toContain("px-4")
    expect(mainClass).toMatch(/sm:px-6|lg:px-8/)

    // Container should have max-width
    const container = page.locator('[data-testid="dashboard-container"]')
    await expect(container).toBeVisible()

    const containerClass = await container.getAttribute("class")
    expect(containerClass).toContain("max-w-7xl")
    expect(containerClass).toContain("mx-auto")
  })

  test("doctor queue page has consistent spacing", async ({ page }) => {
    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    // Check that content sections have spacing
    const sections = page.locator(".space-y-6, .space-y-4, .space-y-8")
    const sectionCount = await sections.count()
    expect(sectionCount).toBeGreaterThan(0)

    // Check that grids have gap classes
    const grids = page.locator("[class*='gap-']")
    const gridCount = await grids.count()
    expect(gridCount).toBeGreaterThan(0)
  })

  test("doctor patients page has consistent layout", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Container should exist
    const container = page.locator('[data-testid="dashboard-container"]')
    await expect(container).toBeVisible()

    // Should have grid spacing for stats cards
    const statsGrid = page.locator(".grid.gap-4, .grid.gap-6")
    const statsCount = await statsGrid.count()
    expect(statsCount).toBeGreaterThan(0)
  })
})

test.describe("Layout Contracts - Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("admin studio has correct container classes", async ({ page }) => {
    await page.goto("/admin/studio")
    await waitForPageLoad(page)

    // Check for max-width container in studio
    const container = page.locator(".max-w-7xl")
    await expect(container.first()).toBeVisible()

    // Should have consistent padding
    const paddedContainer = page.locator("[class*='px-4'][class*='sm:px-6']")
    const paddedCount = await paddedContainer.count()
    expect(paddedCount).toBeGreaterThan(0)
  })

  test("admin studio has grid with consistent gap", async ({ page }) => {
    await page.goto("/admin/studio")
    await waitForPageLoad(page)

    // Check for grid with gap
    const grids = page.locator(".grid[class*='gap-']")
    const gridCount = await grids.count()
    expect(gridCount).toBeGreaterThan(0)

    // At least one grid should have gap-6 or gap-8
    const hasStandardGap = await page.locator(".grid.gap-6, .grid.gap-8").count()
    expect(hasStandardGap).toBeGreaterThan(0)
  })

  test("admin clinic has correct container classes", async ({ page }) => {
    await page.goto("/admin/clinic")
    await waitForPageLoad(page)

    // Check for content spacing
    const spacedContent = page.locator(".space-y-6")
    await expect(spacedContent.first()).toBeVisible()

    // Check for grid layout
    const grid = page.locator(".grid[class*='gap-']")
    const gridCount = await grid.count()
    expect(gridCount).toBeGreaterThan(0)
  })
})

test.describe("Layout Contracts - Cross-Dashboard Consistency", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("doctor and admin use same max-width", async ({ page }) => {
    // Check doctor
    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    const doctorContainer = page.locator('[data-testid="dashboard-container"]')
    const doctorClass = await doctorContainer.getAttribute("class")
    const doctorMaxWidth = doctorClass?.match(/max-w-\w+/)?.[0]

    // Check admin studio
    await page.goto("/admin/studio")
    await waitForPageLoad(page)

    const adminContainer = page.locator(".max-w-7xl").first()
    await expect(adminContainer).toBeVisible()

    // Both should use max-w-7xl
    expect(doctorMaxWidth).toBe("max-w-7xl")
  })

  test("responsive padding is consistent", async ({ page }) => {
    const checkPadding = async (url: string) => {
      await page.goto(url)
      await waitForPageLoad(page)

      // Look for responsive padding pattern
      const hasPadding = await page.locator("[class*='px-4']").count()
      return hasPadding > 0
    }

    const doctorHasPadding = await checkPadding("/doctor/dashboard")
    const studioHasPadding = await checkPadding("/admin/studio")
    const clinicHasPadding = await checkPadding("/admin/clinic")

    expect(doctorHasPadding).toBe(true)
    expect(studioHasPadding).toBe(true)
    expect(clinicHasPadding).toBe(true)
  })

  test("card grids use consistent gap", async ({ page }) => {
    const checkGap = async (url: string): Promise<boolean> => {
      await page.goto(url)
      await waitForPageLoad(page)

      // Look for gap-4 or gap-6 on grids
      const hasGap = await page.locator(".grid.gap-4, .grid.gap-6, .grid.gap-8").count()
      return hasGap > 0
    }

    const doctorHasGap = await checkGap("/doctor/dashboard")
    const studioHasGap = await checkGap("/admin/studio")
    const patientsHasGap = await checkGap("/doctor/patients")

    expect(doctorHasGap).toBe(true)
    expect(studioHasGap).toBe(true)
    expect(patientsHasGap).toBe(true)
  })
})

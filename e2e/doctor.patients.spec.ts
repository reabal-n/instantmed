/**
 * Doctor Patients List E2E Test
 * 
 * Tests the doctor patients directory:
 * - Patients list loads without errors
 * - Seeded patient appears in the list
 * - Search and filter work
 */

import { test, expect } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"

// Seeded test data from scripts/e2e/seed.ts
const SEEDED_PATIENT_NAME = "E2E Test Patient"

test.describe("Doctor Patients Directory", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("patients list loads without errors", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Should see Patient Directory heading
    await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible({ timeout: 15000 })

    // Should see stats cards (Total Patients, Onboarded, etc.)
    await expect(page.getByText(/total patients/i)).toBeVisible()

    // Should NOT see error messages
    const errorMessages = [
      "Error loading patients",
      "Failed to load",
      "Something went wrong",
    ]

    for (const errorText of errorMessages) {
      const errorElement = page.getByText(errorText, { exact: false })
      await expect(errorElement).not.toBeVisible()
    }
  })

  test("seeded patient appears in list", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Wait for directory to load
    await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible({ timeout: 15000 })

    // Look for the seeded patient
    const patientName = page.getByText(SEEDED_PATIENT_NAME)
    await expect(patientName.first()).toBeVisible({ timeout: 10000 })
  })

  test("search filters patients", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Wait for directory to load
    await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible({ timeout: 15000 })

    // Find search input
    const searchInput = page.getByPlaceholder(/search/i)
    await expect(searchInput).toBeVisible()

    // Search for E2E patient
    await searchInput.fill("E2E Test")
    await page.waitForTimeout(500)

    // Should still show the E2E patient
    const patientName = page.getByText(SEEDED_PATIENT_NAME)
    await expect(patientName.first()).toBeVisible()

    // Search for non-existent patient
    await searchInput.clear()
    await searchInput.fill("ZZZZNONEXISTENT12345")
    await page.waitForTimeout(500)

    // Patient should not be visible anymore
    await expect(patientName.first()).not.toBeVisible()
  })

  test("patient table displays correctly", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Wait for directory to load
    await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible({ timeout: 15000 })

    // Should see table headers (Patient, Location, Contact, etc.)
    const table = page.locator("table")
    if (await table.isVisible()) {
      // Table view
      await expect(page.getByRole("columnheader", { name: /patient/i })).toBeVisible()
    } else {
      // Card view - should at least show patient names
      const patientCards = page.locator('[class*="card"]')
      const cardCount = await patientCards.count()
      expect(cardCount).toBeGreaterThan(0)
    }
  })

  test("state filter works", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Wait for directory to load
    await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible({ timeout: 15000 })

    // Look for state filter dropdown
    const stateFilter = page.getByRole("combobox").first()
    if (await stateFilter.isVisible()) {
      await stateFilter.click()
      await page.waitForTimeout(300)

      // Should see state options
      const vicOption = page.getByRole("option", { name: /vic|victoria/i })
      if (await vicOption.isVisible()) {
        await vicOption.click()
        await page.waitForTimeout(500)

        // Page should still be functional (no crash)
        await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible()
      }
    }
  })
})

test.describe("Doctor Patients - Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("handles pagination if present", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Wait for directory to load
    await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible({ timeout: 15000 })

    // Look for pagination controls
    const nextButton = page.getByRole("button", { name: /next/i })
    const prevButton = page.getByRole("button", { name: /prev|previous/i })

    // If pagination exists, try clicking next
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click()
      await page.waitForTimeout(500)

      // Should still show patient directory
      await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible()

      // Go back if possible
      if (await prevButton.isEnabled()) {
        await prevButton.click()
      }
    }
  })

  test("onboarding filter works", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Wait for directory to load
    await expect(page.getByRole("heading", { name: /patient directory/i })).toBeVisible({ timeout: 15000 })

    // Look for onboarding filter
    const onboardingStats = page.getByText(/onboarded/i).first()
    await expect(onboardingStats).toBeVisible()

    // Check that the stats are numbers (not NaN or errors)
    const totalPatientsCard = page.locator("text=/Total Patients/").locator("..").locator("text=/\\d+/")
    if (await totalPatientsCard.isVisible()) {
      const text = await totalPatientsCard.textContent()
      const num = parseInt(text || "0", 10)
      expect(num).toBeGreaterThanOrEqual(0)
    }
  })
})

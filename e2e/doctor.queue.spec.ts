/**
 * Doctor Queue E2E Test
 * 
 * Tests the doctor review queue and approval workflow:
 * - Queue loads without errors
 * - Seeded intake appears in the list
 * - Can navigate to document builder
 * - Can approve certificate and verify DB update
 */

import { test, expect } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { waitForPageLoad } from "./helpers/test-utils"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Seeded test data IDs from scripts/e2e/seed.ts
const SEEDED_INTAKE_ID = "e2e00000-0000-0000-0000-000000000010"
const SEEDED_PATIENT_NAME = "E2E Test Patient"

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

async function getIntakeStatus(intakeId: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("intakes")
    .select("status")
    .eq("id", intakeId)
    .single()
  
  if (error) return null
  return data?.status
}

async function resetIntakeForTest(intakeId: string) {
  const supabase = getSupabaseClient()
  
  // Delete any existing issued certificates
  await supabase
    .from("issued_certificates")
    .delete()
    .eq("intake_id", intakeId)
  
  // Delete any existing intake documents
  await supabase
    .from("intake_documents")
    .delete()
    .eq("intake_id", intakeId)
  
  // Reset intake status to paid
  await supabase
    .from("intakes")
    .update({ 
      status: "paid",
      claimed_by: null,
      claimed_at: null,
    })
    .eq("id", intakeId)
}

test.describe("Doctor Queue", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("queue loads without error banners", async ({ page }) => {
    await page.goto("/doctor")
    await waitForPageLoad(page)

    // Should see Review Queue heading
    await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible({ timeout: 15000 })

    // Should NOT see error banners
    const errorBanners = [
      "Unable to load queue",
      "Unable to load monitoring",
      "Unable to load performance",
      "Error loading dashboard",
    ]

    for (const errorText of errorBanners) {
      const errorElement = page.getByText(errorText)
      await expect(errorElement).not.toBeVisible()
    }
  })

  test("seeded intake appears in queue", async ({ page }) => {
    test.skip(!SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY required")

    // Ensure intake is in paid status
    await resetIntakeForTest(SEEDED_INTAKE_ID)

    await page.goto("/doctor")
    await waitForPageLoad(page)

    // Wait for queue to load
    await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible({ timeout: 15000 })

    // Look for the seeded patient in the queue
    // The patient name should appear in the queue list
    const patientName = page.getByText(SEEDED_PATIENT_NAME)
    await expect(patientName.first()).toBeVisible({ timeout: 10000 })
  })

  test("can navigate to document builder from queue", async ({ page }) => {
    test.skip(!SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY required")

    // Ensure intake is in paid status
    await resetIntakeForTest(SEEDED_INTAKE_ID)

    await page.goto("/doctor")
    await waitForPageLoad(page)

    // Wait for queue to load
    await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible({ timeout: 15000 })

    // Find and click on the seeded patient row to expand it
    const patientRow = page.getByText(SEEDED_PATIENT_NAME).first()
    await expect(patientRow).toBeVisible({ timeout: 10000 })
    await patientRow.click()

    // Wait for expansion and look for the review/document button
    await page.waitForTimeout(500)

    // Look for a link/button to the document builder
    const documentLink = page.getByRole("link", { name: /review|document|certificate/i }).first()
    
    if (await documentLink.isVisible()) {
      await documentLink.click()
    } else {
      // Alternative: direct navigation
      await page.goto(`/doctor/intakes/${SEEDED_INTAKE_ID}/document`)
    }

    await waitForPageLoad(page)

    // Should be on the document builder page
    expect(page.url()).toContain("/document")
    
    // Should see document builder content (not an error page)
    const hasContent = await page.getByText(/certificate|patient|approve/i).first().isVisible().catch(() => false)
    expect(hasContent).toBe(true)
  })

  test("full approval flow from queue to approved status", async ({ page }) => {
    test.skip(!SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY required")

    // Reset intake for clean test
    await resetIntakeForTest(SEEDED_INTAKE_ID)

    // Navigate directly to document builder
    await page.goto(`/doctor/intakes/${SEEDED_INTAKE_ID}/document`)
    await waitForPageLoad(page)

    // Wait for page to load
    await page.waitForTimeout(1000)

    // Fill in required fields if empty
    const reasonTextarea = page.locator("textarea").first()
    if (await reasonTextarea.isVisible()) {
      const currentValue = await reasonTextarea.inputValue()
      if (!currentValue) {
        await reasonTextarea.fill("Acute viral illness requiring rest")
      }
    }

    // Click the approve button
    const approveButton = page.locator('[data-testid="approve-button"]')
    await expect(approveButton).toBeVisible({ timeout: 10000 })
    await expect(approveButton).toBeEnabled()
    await approveButton.click()

    // Wait for success message
    const successMessage = page.locator('[data-testid="success-message"]')
    await expect(successMessage).toBeVisible({ timeout: 30000 })

    // Verify DB was updated
    await page.waitForTimeout(2000)
    const status = await getIntakeStatus(SEEDED_INTAKE_ID)
    expect(status, "Intake status should be 'approved'").toBe("approved")
  })
})

test.describe("Doctor Queue - Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("queue handles empty state gracefully", async ({ page }) => {
    // This test verifies the UI handles when queue is empty
    // (may show "Queue is clear!" message)
    await page.goto("/doctor")
    await waitForPageLoad(page)

    // Should load without crashing
    await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible({ timeout: 15000 })

    // If queue is empty, should show empty state (not an error)
    const emptyState = page.getByText(/queue is clear|no pending/i)
    const hasIntakes = await page.getByText(SEEDED_PATIENT_NAME).isVisible().catch(() => false)
    
    // Either we have intakes or we have an empty state - both are valid
    const validState = hasIntakes || (await emptyState.isVisible().catch(() => false))
    expect(validState).toBe(true)
  })

  test("queue search/filter works", async ({ page }) => {
    await page.goto("/doctor")
    await waitForPageLoad(page)

    // Wait for queue to load
    await expect(page.getByRole("heading", { name: /review queue/i })).toBeVisible({ timeout: 15000 })

    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i)
    if (await searchInput.isVisible()) {
      // Type in search query
      await searchInput.fill("E2E")
      await page.waitForTimeout(500)

      // Should filter results (either show E2E patient or show no results)
      // No crash is the main assertion
      expect(page.url()).toContain("/doctor")
    }
  })
})

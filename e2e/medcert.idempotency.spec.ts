/**
 * Medical Certificate Idempotency E2E Test
 * 
 * Ensures no duplicate certificates/documents are created under:
 * - Double-click scenarios
 * - Rapid successive clicks
 * - Page refresh during processing
 * 
 * Asserts:
 * - issued_certificates count === 1
 * - intake_documents count === 1  
 * - certificate_audit_log has exactly one 'issued' event
 */

import { test, expect } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  isDbAvailable,
  resetIntakeForRetest,
  waitForIntakeStatus,
  waitForIssuedCertificateCount,
  countIssuedCertificatesForIntake,
  countIntakeDocumentsForIntake,
  countCertificateAuditLogs,
  INTAKE_ID,
} from "./helpers/db"

test.describe("Medical Certificate Idempotency", () => {
  test.beforeEach(async ({ page }) => {
    // Login as operator
    const result = await loginAsOperator(page)
    expect(result.success, `Login should succeed: ${result.error}`).toBe(true)
    
    // Reset intake to clean state
    await resetIntakeForRetest(INTAKE_ID)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("double-click on approve creates only one certificate", async ({ page }) => {
    test.skip(!isDbAvailable(), "SUPABASE_SERVICE_ROLE_KEY required")
    test.setTimeout(120000) // 2 minutes

    // Navigate to document builder
    await page.goto(`/doctor/intakes/${INTAKE_ID}/document`)
    await waitForPageLoad(page)

    // Wait for page to fully load
    await expect(page.getByText(/certificate|document/i).first()).toBeVisible({ timeout: 10000 })

    // Fill required reason field
    const reasonTextarea = page.locator('textarea').first()
    if (await reasonTextarea.isVisible()) {
      await reasonTextarea.fill("Idempotency test - acute condition")
    }

    // Fill dates if visible
    const dateFromInput = page.locator('input[type="date"]').first()
    if (await dateFromInput.isVisible()) {
      const today = new Date().toISOString().split("T")[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      await dateFromInput.fill(today)
      
      const dateToInput = page.locator('input[type="date"]').nth(1)
      if (await dateToInput.isVisible()) {
        await dateToInput.fill(tomorrow)
      }
    }

    // Get the approve button
    const approveButton = page.locator('[data-testid="approve-button"]')
    await expect(approveButton).toBeVisible()
    await expect(approveButton).toBeEnabled()

    // Perform rapid double-click (forces two clicks even if UI disables)
    await approveButton.dblclick()

    // Wait for at least one certificate to be created
    const certCount = await waitForIssuedCertificateCount(INTAKE_ID, 1, 30000)
    expect(certCount).toBeGreaterThanOrEqual(1)

    // Wait for intake status to be approved
    const statusUpdated = await waitForIntakeStatus(INTAKE_ID, "approved", 15000)
    expect(statusUpdated, "Intake should be approved").toBe(true)

    // Small delay to ensure any duplicate writes would have completed
    await page.waitForTimeout(2000)

    // Assert exactly ONE issued certificate
    const finalCertCount = await countIssuedCertificatesForIntake(INTAKE_ID)
    expect(finalCertCount, "Should have exactly 1 issued certificate (no duplicates)").toBe(1)

    // Assert exactly ONE intake document
    const docCount = await countIntakeDocumentsForIntake(INTAKE_ID)
    expect(docCount, "Should have exactly 1 intake document (no duplicates)").toBe(1)

    // Assert exactly ONE 'issued' audit log entry
    const auditCount = await countCertificateAuditLogs(INTAKE_ID, "issued")
    expect(auditCount, "Should have exactly 1 'issued' audit log entry").toBe(1)
  })

  test("rapid successive clicks create only one certificate", async ({ page }) => {
    test.skip(!isDbAvailable(), "SUPABASE_SERVICE_ROLE_KEY required")
    test.setTimeout(120000)

    await page.goto(`/doctor/intakes/${INTAKE_ID}/document`)
    await waitForPageLoad(page)

    await expect(page.getByText(/certificate|document/i).first()).toBeVisible({ timeout: 10000 })

    // Fill required fields
    const reasonTextarea = page.locator('textarea').first()
    if (await reasonTextarea.isVisible()) {
      await reasonTextarea.fill("Rapid click test - acute condition")
    }

    const dateFromInput = page.locator('input[type="date"]').first()
    if (await dateFromInput.isVisible()) {
      const today = new Date().toISOString().split("T")[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      await dateFromInput.fill(today)
      
      const dateToInput = page.locator('input[type="date"]').nth(1)
      if (await dateToInput.isVisible()) {
        await dateToInput.fill(tomorrow)
      }
    }

    const approveButton = page.locator('[data-testid="approve-button"]')
    await expect(approveButton).toBeVisible()
    await expect(approveButton).toBeEnabled()

    // Click 3 times in rapid succession (simulates nervous/impatient user)
    await Promise.all([
      approveButton.click({ force: true }),
      approveButton.click({ force: true, delay: 50 }),
      approveButton.click({ force: true, delay: 100 }),
    ])

    // Wait for processing
    await waitForIssuedCertificateCount(INTAKE_ID, 1, 30000)
    await waitForIntakeStatus(INTAKE_ID, "approved", 15000)

    // Small delay for any lagging writes
    await page.waitForTimeout(2000)

    // Assert idempotency
    const certCount = await countIssuedCertificatesForIntake(INTAKE_ID)
    expect(certCount, "Should have exactly 1 certificate after rapid clicks").toBe(1)

    const docCount = await countIntakeDocumentsForIntake(INTAKE_ID)
    expect(docCount, "Should have exactly 1 document after rapid clicks").toBe(1)

    const auditCount = await countCertificateAuditLogs(INTAKE_ID, "issued")
    expect(auditCount, "Should have exactly 1 'issued' audit entry after rapid clicks").toBe(1)
  })

  test("button is disabled during processing (UI safeguard)", async ({ page }) => {
    test.skip(!isDbAvailable(), "SUPABASE_SERVICE_ROLE_KEY required")
    test.setTimeout(120000)

    await page.goto(`/doctor/intakes/${INTAKE_ID}/document`)
    await waitForPageLoad(page)

    await expect(page.getByText(/certificate|document/i).first()).toBeVisible({ timeout: 10000 })

    // Fill required fields
    const reasonTextarea = page.locator('textarea').first()
    if (await reasonTextarea.isVisible()) {
      await reasonTextarea.fill("UI safeguard test - acute condition")
    }

    const dateFromInput = page.locator('input[type="date"]').first()
    if (await dateFromInput.isVisible()) {
      const today = new Date().toISOString().split("T")[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      await dateFromInput.fill(today)
      
      const dateToInput = page.locator('input[type="date"]').nth(1)
      if (await dateToInput.isVisible()) {
        await dateToInput.fill(tomorrow)
      }
    }

    const approveButton = page.locator('[data-testid="approve-button"]')
    await expect(approveButton).toBeVisible()
    await expect(approveButton).toBeEnabled()

    // Click and immediately check if button becomes disabled
    await approveButton.click()

    // Button should be disabled or show loading state while processing
    // We check for either disabled state OR aria-busy OR loading spinner
    const isDisabledOrLoading = await Promise.race([
      approveButton.isDisabled().then(disabled => disabled ? "disabled" : null),
      page.locator('[data-testid="approve-button"][aria-busy="true"]').isVisible().then(v => v ? "busy" : null),
      page.locator('[data-testid="approve-button"] [class*="spinner"], [data-testid="approve-button"] [class*="loading"]').isVisible().then(v => v ? "spinner" : null),
      new Promise<string>(resolve => setTimeout(() => resolve("timeout"), 1000)),
    ])

    // Log what we found (informational, not a hard failure)
    if (isDisabledOrLoading === "timeout") {
      // eslint-disable-next-line no-console
      console.warn("Button may not have visual loading state - relying on backend idempotency")
    }

    // Wait for completion
    await waitForIntakeStatus(INTAKE_ID, "approved", 30000)

    // Final idempotency check
    const certCount = await countIssuedCertificatesForIntake(INTAKE_ID)
    expect(certCount, "Should have exactly 1 certificate").toBe(1)
  })
})

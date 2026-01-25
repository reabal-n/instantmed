/**
 * Operator End-to-End Journey Test
 * 
 * Proves the core platform loop works for a user who is both admin + doctor:
 * 
 * A) Login as operator (admin+doctor)
 * B) Visit /admin/clinic, update clinic phone, save → verify DB
 * C) Visit /admin/studio, edit template config, save → verify DB version increment
 * D) Visit /doctor queue, approve seeded intake → verify:
 *    - intakes.status='approved'
 *    - issued_certificates exists with correct snapshots
 *    - intake_documents exists with storage_path
 * 
 * This test uses a SINGLE operator session to verify the full journey.
 */

import { test, expect } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"
import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  isDbAvailable,
  getActiveClinicIdentity,
  updateClinicIdentity,
  getIntakeStatus,
  getIntakeDocumentForIntake,
  resetIntakeForRetest,
  waitForIntakeStatus,
  waitForIssuedCertificate,
  getLatestActiveTemplateByType,
  compareTemplateConfigMinimal,
  compareClinicIdentitySnapshot,
  INTAKE_ID,
  type CertificateTemplate,
  type ClinicIdentity,
} from "./helpers/db"

// E2E_RUN_ID for unique test values
const E2E_RUN_ID = process.env.E2E_RUN_ID || `run-${Date.now()}`

test.describe("Operator End-to-End Journey", () => {
  // Store values across test steps for snapshot verification
  let savedClinicPhone: string
  let savedClinicUpdatedAt: string
  let savedTemplate: CertificateTemplate | null
  let originalClinicPhone: string | null
  let clinicId: string | undefined

  test.beforeAll(async () => {
    // Get original clinic phone for restoration
    const clinic = await getActiveClinicIdentity()
    originalClinicPhone = clinic?.phone || null
    clinicId = clinic?.id
  })

  test.afterAll(async () => {
    // Restore original clinic phone
    if (clinicId && originalClinicPhone !== undefined) {
      await updateClinicIdentity(clinicId, { phone: originalClinicPhone })
    }
    // Reset intake for future test runs
    await resetIntakeForRetest(INTAKE_ID)
  })

  test("complete operator journey: clinic → studio → approve", async ({ page }) => {
    test.skip(!isDbAvailable(), "SUPABASE_SERVICE_ROLE_KEY required")
    
    // Increase timeout for this comprehensive test
    test.setTimeout(180000) // 3 minutes

    // ========================================================================
    // STEP A: Login as operator (admin+doctor)
    // ========================================================================
    const loginResult = await loginAsOperator(page)
    expect(loginResult.success, `Login should succeed: ${loginResult.error}`).toBe(true)

    // ========================================================================
    // STEP B: Update clinic identity phone
    // ========================================================================
    await test.step("Update clinic phone in /admin/clinic", async () => {
      await page.goto("/admin/clinic")
      await waitForPageLoad(page)

      // Wait for form to load
      const phoneInput = page.locator("#phone")
      await expect(phoneInput).toBeVisible({ timeout: 10000 })

      // Generate unique phone with E2E_RUN_ID suffix
      savedClinicPhone = `1300 E2E ${E2E_RUN_ID.slice(-6)}`
      
      // Update phone
      await phoneInput.clear()
      await phoneInput.fill(savedClinicPhone)

      // Save and wait for network response
      const saveButton = page.locator('[data-testid="save-clinic-button"]')
      await expect(saveButton).toBeEnabled()
      
      const [response] = await Promise.all([
        page.waitForResponse(resp => 
          resp.url().includes("/admin/clinic") && 
          resp.request().method() === "POST"
        ),
        saveButton.click()
      ])
      
      expect(response.ok()).toBe(true)

      // Verify success toast
      await expect(page.getByText(/saved successfully/i)).toBeVisible({ timeout: 10000 })

      // Verify DB update and capture updated_at for snapshot comparison
      const updatedClinic = await getActiveClinicIdentity()
      expect(updatedClinic?.phone).toBe(savedClinicPhone)
      savedClinicUpdatedAt = updatedClinic?.updated_at || new Date().toISOString()
    })

    // ========================================================================
    // STEP C: Update template config in studio
    // ========================================================================
    await test.step("Update template config in /admin/studio", async () => {
      // Get initial template state
      const initialTemplate = await getLatestActiveTemplateByType("med_cert_work")
      expect(initialTemplate).toBeTruthy()
      const initialVersion = initialTemplate?.version || 0

      await page.goto("/admin/studio")
      await waitForPageLoad(page)

      // Wait for studio to load
      await expect(page.getByRole("heading", { name: /template studio/i })).toBeVisible()

      // Select Work template type
      const workButton = page.getByRole("button", { name: /work/i }).first()
      if (await workButton.isVisible()) {
        await workButton.click()
      }

      await page.waitForLoadState("networkidle")

      // Find and toggle a switch to make a change
      const switches = page.locator('button[role="switch"]')
      const switchCount = await switches.count()
      
      if (switchCount > 0) {
        const firstSwitch = switches.first()
        await firstSwitch.click()
      } else {
        // Try changing a select option if no switches
        const selects = page.locator('button[role="combobox"]')
        if (await selects.count() > 0) {
          await selects.first().click()
          await page.waitForLoadState("networkidle")
          const options = page.locator('[role="option"]')
          if (await options.count() > 1) {
            await options.nth(1).click()
          }
        }
      }

      // Check for unsaved changes
      const unsavedBadge = page.getByText(/unsaved changes/i)
      const hasUnsavedChanges = await unsavedBadge.isVisible().catch(() => false)

      if (hasUnsavedChanges) {
        // Save and wait for network response
        const saveButton = page.getByRole("button", { name: /save version/i })
        await expect(saveButton).toBeEnabled()
        
        const [response] = await Promise.all([
          page.waitForResponse(resp => 
            resp.url().includes("/admin/studio") && 
            resp.request().method() === "POST"
          ),
          saveButton.click()
        ])
        
        expect(response.ok()).toBe(true)

        // Verify success toast
        await expect(page.getByText(/template saved/i)).toBeVisible({ timeout: 10000 })

        // Verify DB update - version should increment
        const updatedTemplate = await getLatestActiveTemplateByType("med_cert_work")
        expect(updatedTemplate?.version).toBeGreaterThan(initialVersion)
        savedTemplate = updatedTemplate
      } else {
        // No changes detected, capture current template for snapshot comparison
        savedTemplate = initialTemplate
      }
      
      // Ensure we have a template captured for comparison
      expect(savedTemplate, "Should have captured template for snapshot comparison").toBeTruthy()
    })

    // ========================================================================
    // STEP D: Approve intake and generate certificate
    // ========================================================================
    await test.step("Approve intake from /doctor queue", async () => {
      // Reset intake to paid status first
      await resetIntakeForRetest(INTAKE_ID)

      // Navigate to document builder for the seeded intake
      await page.goto(`/doctor/intakes/${INTAKE_ID}/document`)
      await waitForPageLoad(page)

      // Verify we're on the document builder
      await expect(page.getByText(/certificate|document/i).first()).toBeVisible({ timeout: 10000 })

      // Fill reason/condition (required field)
      const reasonTextarea = page.locator('textarea').first()
      if (await reasonTextarea.isVisible()) {
        await reasonTextarea.fill("E2E Test - Acute viral illness requiring rest")
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

      // Click approve button
      const approveButton = page.locator('[data-testid="approve-button"]')
      await expect(approveButton).toBeVisible()
      await expect(approveButton).toBeEnabled()
      await approveButton.click()

      // Wait for success message
      const successMessage = page.locator('[data-testid="success-message"]')
      await expect(successMessage).toBeVisible({ timeout: 30000 })

      // ========================================================================
      // DB Assertions
      // ========================================================================

      // D1: Verify intake status is 'approved'
      const statusUpdated = await waitForIntakeStatus(INTAKE_ID, "approved", 15000)
      expect(statusUpdated, "Intake status should be 'approved'").toBe(true)
      
      const finalStatus = await getIntakeStatus(INTAKE_ID)
      expect(finalStatus).toBe("approved")

      // D2: Verify issued_certificates exists
      const certificate = await waitForIssuedCertificate(INTAKE_ID, 15000)
      expect(certificate, "Issued certificate should exist").not.toBeNull()
      expect(certificate?.intake_id).toBe(INTAKE_ID)

      // D3: Verify template_config_snapshot matches saved template config (deep compare)
      const templateSnapshot = certificate?.template_config_snapshot
      expect(templateSnapshot, "Template config snapshot should exist").toBeTruthy()
      
      if (savedTemplate?.config && templateSnapshot) {
        const templateComparison = compareTemplateConfigMinimal(templateSnapshot, savedTemplate.config)
        expect(
          templateComparison.match, 
          `Template config snapshot should match saved template. Differences: ${templateComparison.differences.join(", ")}`
        ).toBe(true)
      }

      // D4: Verify clinic_identity_snapshot matches saved clinic (phone + updated_at)
      const clinicSnapshot = certificate?.clinic_identity_snapshot as Partial<ClinicIdentity> | null
      expect(clinicSnapshot, "Clinic identity snapshot should exist").toBeTruthy()
      
      const clinicComparison = compareClinicIdentitySnapshot(clinicSnapshot, {
        phone: savedClinicPhone,
        updated_at: savedClinicUpdatedAt,
      })
      expect(
        clinicComparison.match,
        `Clinic snapshot should match saved clinic. Differences: ${clinicComparison.differences.join(", ")}`
      ).toBe(true)

      // D5: Verify intake_documents exists with storage_path
      const document = await getIntakeDocumentForIntake(INTAKE_ID)
      expect(document, "Intake document should exist").not.toBeNull()
      expect(document?.storage_path, "Document should have storage_path").toBeTruthy()
    })

    // Cleanup: logout
    await logoutTestUser(page)
  })
})

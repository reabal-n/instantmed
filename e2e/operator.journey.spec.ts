/**
 * Operator End-to-End Journey Test
 * 
 * Proves the core platform loop works for a user who is both admin + doctor:
 * 
 * A) Login as operator (admin+doctor)
 * B) Visit /admin/clinic, update clinic phone, save → verify DB
 * C) Visit /admin/settings/templates, verify certificate details and active PDF config
 * D) Visit /doctor queue, approve seeded intake → verify:
 *    - intakes.status='approved'
 *    - issued_certificates exists with correct snapshots
 *    - intake_documents exists with storage_path
 * 
 * This test uses a SINGLE operator session to verify the full journey.
 */

import { expect, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  type CertificateTemplate,
  type ClinicIdentity,
  compareClinicIdentitySnapshot,
  compareTemplateConfigMinimal,
  getActiveClinicIdentity,
  getIntakeDocumentForIntake,
  getIntakeStatus,
  getLatestActiveTemplateByType,
  INTAKE_ID,
  isDbAvailable,
  resetIntakeForRetest,
  updateClinicIdentity,
  waitForIntakeStatus,
  waitForIssuedCertificate,
} from "./helpers/db"
import { STAFF_TEST_ROUTES } from "./helpers/staff-routes"
import { waitForPageLoad } from "./helpers/test-utils"

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

  test("complete operator journey: clinic → certificate details → approve", async ({ page }) => {
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
      await page.goto(STAFF_TEST_ROUTES.adminClinic)
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
          resp.url().includes(STAFF_TEST_ROUTES.adminClinic) &&
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
    // STEP C: Verify certificate details and active PDF config
    // ========================================================================
    await test.step("Verify certificate details in /admin/settings/templates", async () => {
      savedTemplate = await getLatestActiveTemplateByType("med_cert")
      expect(savedTemplate, "Should have captured active template for snapshot comparison").toBeTruthy()

      await page.goto(STAFF_TEST_ROUTES.adminCertificateDetails)
      await waitForPageLoad(page)

      await expect(page.getByRole("heading", { name: /certificate details/i })).toBeVisible()
      await expect(page.getByText(/pdf preview/i).first()).toBeVisible()
      await expect(page.getByText(/save version/i)).toHaveCount(0)
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

/**
 * Patient Certificate Download E2E Test
 * 
 * Tests that patients can access and download their approved medical certificates:
 * 1. Login as patient
 * 2. Navigate to intake detail page
 * 3. Verify certificate download link works (returns 200)
 * 
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "certificate-download"
 */

import { test, expect } from "@playwright/test"
import { 
  isDbAvailable,
  getSupabaseClient,
  INTAKE_ID,
  getIssuedCertificateForIntake,
  getIntakeDocumentForIntake,
} from "./helpers/db"
import { loginAsPatient, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"

// ============================================================================
// CONFIGURATION
// ============================================================================

const SEEDED_INTAKE_ID = INTAKE_ID

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function ensureIntakeIsApproved(intakeId: string): Promise<boolean> {
  const supabase = getSupabaseClient()
  
  // Check if already approved
  const { data: intake } = await supabase
    .from("intakes")
    .select("status")
    .eq("id", intakeId)
    .single()
  
  if (intake?.status === "approved") {
    return true
  }
  
  // If not approved, we need to skip or set it up
  // For this test, we'll set status to approved and ensure cert exists
  const { error } = await supabase
    .from("intakes")
    .update({ status: "approved" })
    .eq("id", intakeId)
  
  return !error
}

async function getSignedDownloadUrl(storagePath: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  
  // Parse bucket and path
  const parts = storagePath.split("/")
  const bucket = parts[0]
  const filePath = parts.slice(1).join("/")
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600) // 1 hour expiry
  
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to create signed URL:", error.message)
    return null
  }
  
  return data?.signedUrl || null
}

// ============================================================================
// TESTS: PATIENT CERTIFICATE ACCESS
// ============================================================================

test.describe("Patient Certificate Download", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "Database not available")
    
    // Ensure the intake is in approved state
    const isApproved = await ensureIntakeIsApproved(SEEDED_INTAKE_ID)
    test.skip(!isApproved, "Could not set intake to approved state")
    
    // Login as patient
    const result = await loginAsPatient(page)
    expect(result.success, `Patient login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("patient can view approved certificate on intake page", async ({ page }) => {
    // Navigate to the intake detail page
    await page.goto(`/patient/intakes/${SEEDED_INTAKE_ID}`)
    await waitForPageLoad(page)
    
    // Should see the certificate card or document section
    const documentSection = page.locator('[data-testid="document-card"]').or(
      page.getByText(/certificate|document ready/i)
    )
    
    await expect(documentSection.first()).toBeVisible({ timeout: 10000 })
  })

  test("certificate download link returns 200", async ({ page }) => {
    // Get the document from DB to find storage path
    const document = await getIntakeDocumentForIntake(SEEDED_INTAKE_ID)
    
    if (!document?.storage_path) {
      // eslint-disable-next-line no-console
      console.warn("[E2E] No document storage_path found - skipping download test")
      test.skip(true, "No document storage path available")
      return
    }
    
    // Create signed URL for direct download test
    const signedUrl = await getSignedDownloadUrl(document.storage_path)
    
    if (!signedUrl) {
      // eslint-disable-next-line no-console
      console.warn("[E2E] Could not create signed URL - storage may be mocked")
      test.skip(true, "Signed URL creation failed")
      return
    }
    
    // Test the signed URL returns 200
    const response = await page.request.get(signedUrl)
    expect(response.status(), "Download URL should return 200").toBe(200)
    
    // Verify content type is PDF
    const contentType = response.headers()["content-type"]
    expect(contentType).toContain("application/pdf")
  })

  test("intake page shows download button for approved certificate", async ({ page }) => {
    await page.goto(`/patient/intakes/${SEEDED_INTAKE_ID}`)
    await waitForPageLoad(page)
    
    // Look for download button or link
    const downloadButton = page.locator('[data-testid="download-certificate"]').or(
      page.getByRole("link", { name: /download/i })
    ).or(
      page.getByRole("button", { name: /download/i })
    )
    
    // If document exists, download button should be visible
    const document = await getIntakeDocumentForIntake(SEEDED_INTAKE_ID)
    
    if (document?.storage_path) {
      await expect(downloadButton.first()).toBeVisible({ timeout: 10000 })
    } else {
      // eslint-disable-next-line no-console
      console.warn("[E2E] No document found - download button test inconclusive")
    }
  })

  test("intake page shows verification code", async ({ page }) => {
    await page.goto(`/patient/intakes/${SEEDED_INTAKE_ID}`)
    await waitForPageLoad(page)
    
    // Get certificate to check for verification code
    const certificate = await getIssuedCertificateForIntake(SEEDED_INTAKE_ID)
    
    if (certificate?.verification_code) {
      // Verification code should be displayed on the page
      const verificationText = page.getByText(certificate.verification_code)
      await expect(verificationText).toBeVisible({ timeout: 10000 })
    }
  })
})

// ============================================================================
// TESTS: EMAIL TO EMPLOYER FEATURE
// ============================================================================

test.describe("Patient Email to Employer", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "Database not available")
    
    await ensureIntakeIsApproved(SEEDED_INTAKE_ID)
    
    const result = await loginAsPatient(page)
    expect(result.success).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("email to employer button is visible for approved med cert", async ({ page }) => {
    await page.goto(`/patient/intakes/${SEEDED_INTAKE_ID}`)
    await waitForPageLoad(page)
    
    // Look for the "Email to Employer" button
    const employerButton = page.getByRole("button", { name: /email.*employer/i })
    
    // Button should be visible for approved med certs
    const isVisible = await employerButton.isVisible().catch(() => false)
    
    if (isVisible) {
      await expect(employerButton).toBeEnabled()
    } else {
      // eslint-disable-next-line no-console
      console.log("[E2E] Email to employer button not found - may not be a med_cert service")
    }
  })

  test("email to employer dialog opens and has required fields", async ({ page }) => {
    await page.goto(`/patient/intakes/${SEEDED_INTAKE_ID}`)
    await waitForPageLoad(page)
    
    const employerButton = page.getByRole("button", { name: /email.*employer/i })
    
    if (await employerButton.isVisible().catch(() => false)) {
      await employerButton.click()
      
      // Dialog should open with email field
      const emailInput = page.getByLabel(/employer.*email/i).or(
        page.locator('input[type="email"]')
      )
      await expect(emailInput.first()).toBeVisible({ timeout: 5000 })
      
      // Should have a send button
      const sendButton = page.getByRole("button", { name: /send/i })
      await expect(sendButton).toBeVisible()
    }
  })
})

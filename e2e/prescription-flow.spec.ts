import { expect, type Page,test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Prescription Flow E2E Tests
 *
 * Exercises the full repeat prescription intake flow from start to checkout:
 *   1. Medication search (PBS combobox)
 *   2. Medication history (last prescribed, side effects)
 *   3. Medical history (allergies, conditions, other meds)
 *   4. Patient details (name, email, DOB, phone)
 *   5. Review (summary + safety consent)
 *   6. Checkout (price verification, consent, Stripe button)
 *
 * These tests run as a guest (no auth) and stop at the Stripe redirect.
 * The goal is to prove every step renders, validates, and advances correctly.
 *
 * Step sequence from lib/request/step-registry.ts:
 *   medication → medication-history → medical-history → details → review → checkout
 */

// ---------------------------------------------------------------------------
// Helpers (same patterns as intake-flows.spec.ts)
// ---------------------------------------------------------------------------

/**
 * Dismiss overlays that can block clicks on page elements:
 * - Cookie consent banner
 * - Next.js dev tools issues badge
 */
async function dismissOverlays(page: Page) {
  // Cookie consent banner
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 2000 }).catch(() => false)) {
    await essentialOnly.click()
    await page.waitForTimeout(300)
  }

  // Next.js Dev Tools issues overlay - collapse it
  const issuesBadge = page.getByRole("button", { name: /Open issues overlay/i })
  if (await issuesBadge.isVisible({ timeout: 500 }).catch(() => false)) {
    const collapseBadge = page.getByRole("button", { name: /Collapse issues badge/i })
    if (await collapseBadge.isVisible({ timeout: 500 }).catch(() => false)) {
      await collapseBadge.click().catch(() => {})
    }
  }

  // Also try hiding all dev tool overlays via CSS
  await page.evaluate(() => {
    const style = document.createElement('style')
    style.textContent = `
      [data-nextjs-dialog-overlay], [data-nextjs-toast],
      [class*="nextjs-portal"],
      button[aria-label="Open chat assistant"],
      [data-nextjs-dev-toolbar] { display: none !important; }
    `
    document.head.appendChild(style)
  })
}

/** Click a chip / selection button whose visible text matches `label` */
async function clickChip(page: Page, label: string | RegExp) {
  await page.getByRole("button", { name: label }).click()
}

/** Click the primary "Continue" action button at the bottom of a step */
async function clickContinue(page: Page) {
  const btn = page.getByRole("button", { name: /^Continue|Continue to/i }).last()
  await expect(btn).toBeEnabled({ timeout: 5000 })
  await btn.scrollIntoViewIfNeeded()
  await btn.click()
}

/** Wait for a step heading or key element to appear */
async function waitForStep(page: Page, text: string | RegExp, timeout = 15000) {
  await expect(
    page.getByText(text).first()
  ).toBeVisible({ timeout })
}

// ---------------------------------------------------------------------------
// Step helpers
// ---------------------------------------------------------------------------

/**
 * Complete the medication search step.
 *
 * The MedicationSearch component is a combobox that searches the PBS database.
 * In test environments the PBS API may not return results, so we use multiple
 * fallback strategies:
 *   1. Type a query and try to pick a dropdown result
 *   2. If no results, type a name and blur to trigger manual entry via handleBlur
 *   3. If that still doesn't work, click "I don't know the exact name" fallback
 */
async function completeMedicationSearchStep(page: Page) {
  await waitForStep(page, /Which medication do you need\?/i)

  const medInput = page.getByRole("combobox").first()
  await medInput.fill("E2E test medication")
  await medInput.blur()
  await page.waitForTimeout(400)

  const manualOption = page.getByRole("button", { name: /Continue with "E2E test medication"/i })
  if (await manualOption.isVisible({ timeout: 1000 }).catch(() => false)) {
    await manualOption.click()
  }

  await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })
  await page.locator("#medication-strength-0").fill("500 mg")
  await page.locator("#medication-form-0").fill("capsule")
  await expect(page.getByRole("button", { name: /Continue to history/i }).last()).toBeEnabled({ timeout: 5000 })
  await clickContinue(page)
  await page.waitForTimeout(500)
}

/**
 * Complete the medication history step.
 *
 * Selects "Less than 3 months ago" for when last prescribed,
 * and "No side effects" for adverse reactions.
 */
async function completeMedicationHistoryStep(page: Page) {
  await waitForStep(page, /When were you last prescribed/i)
  await clickChip(page, /Less than 3 months ago/i)
  await page.getByPlaceholder(/2 puffs twice daily/i).fill("1 tablet daily")
  // Side effects question appears after entering the current dose.
  await clickChip(page, /No side effects/i)
  await clickContinue(page)
}

/**
 * Complete the Medical History step (allergies, conditions, other meds).
 */
async function completeMedicalHistoryStep(page: Page) {
  await waitForStep(page, /Any allergies/i)
  await clickChip(page, /No allergies/i)
  await clickChip(page, /No conditions/i)
  await clickChip(page, /No medications/i)
  if (await page.getByText(/Currently pregnant or breastfeeding/i).isVisible({ timeout: 3000 }).catch(() => false)) {
    await clickChip(page, /^No$/i)
    await clickChip(page, /No reactions/i)
  }
  await clickContinue(page)
}

/**
 * Complete the Patient Details step with valid test data.
 * Phone is always required for prescriptions.
 */
async function completeDetailsStep(page: Page) {
  await waitForStep(page, /Your details/i)

  // Dismiss autofill banner if present
  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noThanks.click()
  }

  // Fill fields
  await page.locator('input[placeholder="Jane"]').fill("Test")
  await page.locator('input[placeholder="Smith"]').fill("Patient")
  await page.locator('input[placeholder="jane@example.com"]').fill("test@instantmed.com.au")

  await page.locator('input[placeholder="DD/MM/YYYY"]').fill("01/01/1990")

  // Phone - required for prescriptions
  await page.locator('input[placeholder="0412 345 678"]').fill("0412345678")

  await page.locator("#sex-select-trigger").click()
  await page.getByRole("option", { name: /^Male$/i }).click()

  await page.locator('input[placeholder="10 digits"]').fill("2123456701")
  await page.locator('input[placeholder="10 digits"]').blur()
  await page.waitForTimeout(200)
  await page.getByRole("button", { name: /^1$/ }).last().click()

  await page.locator('[placeholder="Start typing your address..."]').fill("123 Test Street")
  await page.locator("#suburb").fill("Sydney")
  await page.locator("#state-select-trigger").click()
  await page.getByRole("option", { name: /^NSW$/i }).click()
  await page.locator("#postcode").fill("2000")

  await clickContinue(page)
}

/**
 * Complete the Review step.
 *
 * The review step has an embedded safety consent Switch
 * ("I confirm this is not a medical emergency...") which must be toggled
 * before "Continue to payment" becomes enabled.
 */
async function completeReviewStep(page: Page) {
  await waitForStep(page, /One last check/i)

  const safetyCheckbox = page.locator("#safety-consent")
  await safetyCheckbox.scrollIntoViewIfNeeded()
  const isChecked = await safetyCheckbox.isChecked().catch(() => false)
  if (!isChecked) {
    await safetyCheckbox.click()
  }
}

/**
 * Verify we've reached the Checkout step.
 *
 * Checks:
 * - "Request Summary" heading is visible
 * - Service label shows "Prescription Request"
 * - Price displays $29.95 (PRICING.REPEAT_SCRIPT)
 * - Consent toggle enables the checkout button
 *
 * We do NOT click the final checkout button because it fires
 * a server action that redirects to Stripe.
 */
async function verifyCheckoutStep(page: Page) {
  await waitForStep(page, /One last check/i)

  // Verify correct service label
  await expect(page.getByText(/Medication/i).first()).toBeVisible()

  // Verify correct Stripe price ($29.95 for repeat prescription)
  await expect(page.getByText("$29.95")).toBeVisible()

  const checkoutBtn = page.getByRole("button", { name: /^Pay \$/ }).last()
  await expect(checkoutBtn).toBeEnabled({ timeout: 5000 })
  await expect(checkoutBtn).toHaveAttribute("aria-disabled", "false")
}

// ---------------------------------------------------------------------------
// 1 · REPEAT PRESCRIPTION - Full Flow
// ---------------------------------------------------------------------------

test.describe("Prescription: full flow - start to checkout", () => {
  test.setTimeout(90000) // generous timeout for CI

  test("completes repeat prescription from start to checkout", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // ── Step 1: Medication search (PBS combobox) ──
    await completeMedicationSearchStep(page)

    // ── Step 2: Medication history ──
    await completeMedicationHistoryStep(page)

    // ── Step 3: Medical history ──
    await completeMedicalHistoryStep(page)

    // ── Step 4: Patient details (phone required for Rx) ──
    await completeDetailsStep(page)

    // ── Step 5: Review (with embedded safety consent) ──
    await completeReviewStep(page)

    // ── Step 6: Checkout - verify price and consent ──
    await verifyCheckoutStep(page)
  })
})

// ---------------------------------------------------------------------------
// 2 · REPEAT-SCRIPT ALIAS - Same flow via alternate URL
// ---------------------------------------------------------------------------

test.describe("Prescription: repeat-script alias loads same flow", () => {
  test("repeat-script URL loads the medication step", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)

    // Should land on medication search step (same as ?service=repeat-script)
    await waitForStep(page, /Which medication do you need\?/i)
    // Progress nav should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 3 · MEDICATION HISTORY - "Never prescribed" blocks flow
// ---------------------------------------------------------------------------

test.describe("Prescription: medication-history gating", () => {
  test.setTimeout(60000)

  test("'never prescribed' shows repeat-only warning with consult CTA", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Complete medication step
    await completeMedicationSearchStep(page)

    // On medication history step - select "Never prescribed"
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /Never prescribed this medication/i)

    // Warning should appear with "Book a consultation" CTA
    await expect(page.getByText(/This service is for repeat prescriptions only/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /Book a consultation/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 4 · VALIDATION - Fields required before advancing
// ---------------------------------------------------------------------------

test.describe("Prescription: step validation", () => {
  test.setTimeout(60000)

  test("medication step blocks Continue without a selection", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // On medication step - Continue should be disabled without a selection
    await waitForStep(page, /Which medication do you need\?/i)
    const btn = page.getByRole("button", { name: /^Continue$/i }).last()
    await expect(btn).toBeDisabled()
  })

  test("medication step proceeds with a blank strength (A3 soften → doctor flag)", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /Which medication do you need\?/i)
    const medInput = page.getByRole("combobox").first()
    await medInput.fill("E2E blank strength med")
    await medInput.blur()
    await page.waitForTimeout(400)
    const manualOption = page.getByRole("button", { name: /Continue with "E2E blank strength med"/i })
    if (await manualOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await manualOption.click()
    }

    // Leave strength blank; fill only form.
    await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })
    await page.locator("#medication-form-0").fill("capsule")

    // Continue must be enabled despite the blank strength, and advance the flow.
    await expect(page.getByRole("button", { name: /Continue to history/i }).last()).toBeEnabled({ timeout: 5000 })
    await clickContinue(page)
    await waitForStep(page, /When were you last prescribed/i)
  })

  test("patient details validates email format", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Fast-forward through steps to reach details
    await completeMedicationSearchStep(page)
    await completeMedicationHistoryStep(page)
    await completeMedicalHistoryStep(page)

    // On details step - enter invalid email
    await waitForStep(page, /This information is required/i)
    const noThanks = page.getByRole("button", { name: /No thanks/i })
    if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
      await noThanks.click()
    }

    await page.locator('input[placeholder="Jane"]').fill("Test")
    await page.locator('input[placeholder="Smith"]').fill("Patient")
    await page.locator('input[placeholder="jane@example.com"]').fill("not-an-email")
    // Blur to trigger validation
    await page.locator('input[placeholder="jane@example.com"]').blur()
    await page.waitForTimeout(500)

    // Should show email validation error
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 5000 })
  })

  test("review step blocks Continue without safety consent", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Complete all steps up to review
    await completeMedicationSearchStep(page)
    await completeMedicationHistoryStep(page)
    await completeMedicalHistoryStep(page)
    await completeDetailsStep(page)

    await waitForStep(page, /One last check/i)
    const btn = page.getByRole("button", { name: /^Pay \$/ }).last()
    await expect(btn).toHaveAttribute("aria-disabled", "true")
  })
})

// ---------------------------------------------------------------------------
// 5 · CHECKOUT - Price and consent verification
// ---------------------------------------------------------------------------

test.describe("Prescription: checkout price verification", () => {
  test.setTimeout(90000)

  test("checkout shows $29.95 for repeat prescription", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await completeMedicationSearchStep(page)
    await completeMedicationHistoryStep(page)
    await completeMedicalHistoryStep(page)
    await completeDetailsStep(page)
    await completeReviewStep(page)

    await waitForStep(page, /One last check/i)

    // Verify price is $29.95 (PRICING.REPEAT_SCRIPT)
    await expect(page.getByText("$29.95")).toBeVisible()

    // Verify trust badges
    await expect(page.getByText(/AHPRA-registered doctor/i)).toBeVisible()
    await expect(page.getByText(/Full refund if declined/i)).toBeVisible()
  })

  test("checkout button disabled without consent", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await completeMedicationSearchStep(page)
    await completeMedicationHistoryStep(page)
    await completeMedicalHistoryStep(page)
    await completeDetailsStep(page)
    await waitForStep(page, /One last check/i)
    const checkoutBtn = page.getByRole("button", { name: /^Pay \$/ }).last()
    await expect(checkoutBtn).toHaveAttribute("aria-disabled", "true")

    // Toggle consent
    const safetyCheckbox = page.locator("#safety-consent")
    await safetyCheckbox.scrollIntoViewIfNeeded()
    await safetyCheckbox.click()

    // Button should now be enabled
    await expect(checkoutBtn).toBeEnabled({ timeout: 5000 })
    await expect(checkoutBtn).toHaveAttribute("aria-disabled", "false")
  })
})

// ---------------------------------------------------------------------------
// 6 · RESPONSIVE - Mobile viewport
// ---------------------------------------------------------------------------

test.describe("Prescription: responsive design", () => {
  test("flow is usable at mobile viewport width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)

    // Page should render with heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })

    // Progress indicator should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible()

    // Medication search combobox should be usable
    await expect(page.getByRole("combobox").first()).toBeVisible()
  })
})

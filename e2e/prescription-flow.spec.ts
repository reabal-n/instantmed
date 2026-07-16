import { expect, type Page, test } from "@playwright/test"

import { enterManualTestAddress, waitForPageLoad } from "./helpers/test-utils"

/**
 * Prescription Flow E2E Tests
 *
 * Exercises the full repeat prescription intake flow from start to checkout:
 *   1. Medication (free-text name + optional strength/form)
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

function collectBrowserErrors(page: Page) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`)
  })
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
  return errors
}

/** Click a chip / selection button whose visible text matches `label` */
async function clickChip(page: Page, label: string | RegExp) {
  const radio = page.getByRole("radio", { name: label })
  if (await radio.isVisible({ timeout: 1500 }).catch(() => false)) {
    await radio.click()
    return
  }
  await page.getByRole("button", { name: label }).click()
}

/** Click the primary "Continue" action button at the bottom of a step */
async function clickContinue(page: Page) {
  const primaryAction = page.locator('[data-intake-primary-action="true"]').last()
  if (await primaryAction.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(primaryAction).toBeEnabled({ timeout: 5000 })
    await primaryAction.scrollIntoViewIfNeeded()
    await primaryAction.click()
    return
  }
  const btn = page.getByRole("button", { name: /^Continue|Continue to|Review your request|Pay \$/i }).last()
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
 * Complete the medication step.
 *
 * Since #208 the PBS combobox is retired — the medication step is a plain
 * free-text name box (`#medication-name-0`). Optional strength/form fields
 * (`#medication-strength-0` / `#medication-form-0`) reveal once a name is typed.
 */
async function completeMedicationStep(page: Page) {
  await waitForStep(page, /Which medication do you need\?/i)

  await page.locator("#medication-name-0").fill("E2E test medication")

  // Strength + form are optional; they appear once the name is entered.
  await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })
  await page.locator("#medication-strength-0").fill("500 mg")
  await page.locator("#medication-form-0").fill("capsule")

  await clickContinue(page)
  await page.waitForTimeout(500)
}

/**
 * Complete the medication history step.
 *
 * Selects "Under 3 months" for when last prescribed, confirms the dose and
 * directions are unchanged, and reports no side effects.
 */
async function completeMedicationHistoryStep(page: Page) {
  await waitForStep(page, /When were you last prescribed/i)
  await clickChip(page, /Under 3 months/i)
  await page.getByPlaceholder(/2 puffs twice daily/i).fill("1 tablet daily")
  await page
    .getByRole("radiogroup", { name: /dose or the way you take this medicine changed/i })
    .getByRole("radio", { name: /No, unchanged/i })
    .click()
  await page.getByPlaceholder(/e\.g\., asthma/i).fill("asthma")
  // Side effects question appears after entering the current dose + indication.
  await clickChip(page, /No side effects/i)
  await clickContinue(page)
}

/**
 * Complete the Medical History step (allergies, conditions, other meds).
 */
async function completeMedicalHistoryStep(page: Page) {
  await waitForStep(page, /Anything the doctor should know/i)
  // Each question is a Yes/No radiogroup labelled by its question text. #209
  // folded the old "previous medication reactions?" toggle into the allergies
  // question, so there is no separate reactions question to answer.
  await page.getByRole("radiogroup", { name: /allerg/i }).getByRole("radio", { name: /^None$/i }).click()
  await page.getByRole("radiogroup", { name: /medical conditions/i }).getByRole("radio", { name: /^No conditions$/i }).click()
  await page.getByRole("radiogroup", { name: /other medications/i }).getByRole("radio", { name: /^No medications$/i }).click()
  // Prescribing flows add a single pregnancy/breastfeeding check.
  const pregnancy = page.getByRole("radiogroup", { name: /pregnant or breastfeeding/i })
  if (await pregnancy.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pregnancy.getByRole("radio", { name: /^No$/i }).click()
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
  await page.locator("#medicare-irn").fill("1")

  await enterManualTestAddress(page)

  await clickContinue(page)
}

/**
 * Complete the Review step.
 *
 * The review step has an embedded safety consent Checkbox card
 * ("I confirm this is not a medical emergency...") which must be ticked before
 * payment can continue.
 */
async function completeReviewStep(page: Page) {
  await waitForStep(page, /One last check/i)

  // Repeat prescriptions surface the "what to expect" repeats note before payment
  // (lib/clinical/repeats-policy.ts) — assert the standard reaches the patient.
  await expect(page.getByText(/What to expect/i).first()).toBeVisible()
  await expect(page.getByText(/up to 2 repeats/i).first()).toBeVisible()

  const safetyCheckbox = page.locator("#safety-consent")
  await safetyCheckbox.scrollIntoViewIfNeeded()
  const isChecked = await safetyCheckbox.isChecked().catch(() => false)
  if (!isChecked) {
    await safetyCheckbox.click()
  }
}

/**
 * Verify the Review & pay step is ready to hand off to Stripe.
 *
 * Checks:
 * - The visible medication summary is present
 * - Price displays $29.95 (PRICING.REPEAT_SCRIPT)
 * - Consent toggle enables the checkout button
 *
 * We do NOT click the final checkout button because it fires
 * a server action that redirects to Stripe.
 */
async function verifyCheckoutStep(page: Page) {
  await waitForStep(page, /One last check/i)

  // Scope this to the visible summary heading. The progress nav carries a
  // separate mobile-hidden "Medication" label by design.
  await expect(
    page.getByRole("heading", { level: 3, name: "Medication", exact: true }),
  ).toBeVisible()

  // Verify correct Stripe price ($29.95 for repeat prescription)
  await expect(page.getByText("$29.95", { exact: true }).first()).toBeVisible()

  const checkoutBtn = page
    .getByRole("button", { name: /^Pay \$/ })
    .filter({ visible: true })
  await expect(checkoutBtn).toHaveCount(1)
  await expect(checkoutBtn).toBeEnabled({ timeout: 5000 })
  const checkoutReady = await checkoutBtn.evaluate((button) => (
    button.getAttribute("data-intake-primary-ready") ??
    button.getAttribute("data-intake-mobile-action-ready")
  ))
  expect(checkoutReady).toBe("true")
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

    // ── Step 1: Medication (free-text name + optional strength/form) ──
    await completeMedicationStep(page)

    // ── Step 2: Medication history ──
    await completeMedicationHistoryStep(page)

    // ── Step 3: Medical history ──
    await completeMedicalHistoryStep(page)

    // ── Step 4: Patient details (phone required for Rx) ──
    await completeDetailsStep(page)

    // ── Step 5: Review (with embedded safety consent) ──
    await completeReviewStep(page)

    // ── Review & pay: verify price and enabled Stripe handoff ──
    await verifyCheckoutStep(page)
  })

  test("review shows complete prescription details and edits the saved history", async ({ page }) => {
    const browserErrors = collectBrowserErrors(page)

    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await completeMedicationStep(page)
    await completeMedicationHistoryStep(page)
    await completeMedicalHistoryStep(page)
    await completeDetailsStep(page)

    await waitForStep(page, /One last check/i)
    await expect(page.getByRole("heading", { name: "Medication", level: 3 })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Prescription details", level: 3 })).toBeVisible()
    await expect(page.getByText("Used for", { exact: true })).toBeVisible()
    await expect(page.getByText("asthma", { exact: true })).toBeVisible()
    await expect(page.getByText("No side effects reported", { exact: true })).toBeVisible()

    const editPrescriptionDetails = page.getByRole("button", {
      name: "Edit Prescription details",
      exact: true,
    })
    await expect(editPrescriptionDetails).toBeVisible()
    await editPrescriptionDetails.click()

    await expect(page.getByRole("heading", { name: "Your prescription history", level: 2 })).toBeVisible()
    await expect(page.getByPlaceholder(/2 puffs twice daily/i)).toHaveValue("1 tablet daily")
    await expect(page.getByPlaceholder(/e\.g\., asthma/i)).toHaveValue("asthma")
    await expect(
      page
        .getByRole("radiogroup", { name: /dose or the way you take this medicine changed/i })
        .getByRole("radio", { name: /No, unchanged/i }),
    ).toHaveAttribute("aria-checked", "true")
    await expect(page.getByRole("radio", { name: "No side effects", exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    expect(browserErrors).toEqual([])
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
    await completeMedicationStep(page)

    // On medication history step - take the "never prescribed" escape (#210
    // renamed the "Never" chip to "I have not been prescribed this before").
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /I have not been prescribed this before/i)

    // Warning should appear with "Browse other services" CTA
    await expect(page.getByText(/This service is for repeat prescriptions only/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /Browse other services/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 4 · VALIDATION - Fields required before advancing
// ---------------------------------------------------------------------------

test.describe("Prescription: step validation", () => {
  test.setTimeout(60000)

  test("medication step explains missing selection without advancing", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Continue stays clickable so the mobile sticky action can explain what is missing.
    await waitForStep(page, /Which medication do you need\?/i)
    const btn = page.getByRole("button", { name: /^Continue$/i }).last()
    await expect(btn).toBeEnabled()
    await btn.click()
    await expect(page.getByText(/Enter the name of the medication you need/i).first()).toBeVisible()
    await expect(page.getByRole("heading", { name: /Which medication do you need/i })).toBeVisible()
  })

  test("medication step proceeds with a blank strength (A3 soften → doctor flag)", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /Which medication do you need\?/i)
    await page.locator("#medication-name-0").fill("E2E blank strength med")

    // Leave strength blank; fill only form.
    await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })
    await page.locator("#medication-form-0").fill("capsule")

    // Continue advances despite the blank strength (doctor sees a missing-strength flag).
    await clickContinue(page)
    await waitForStep(page, /When were you last prescribed/i)
  })

  test("medication step proceeds with a name only — no strength, no form (A3 boundary 2)", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /Which medication do you need\?/i)
    await page.locator("#medication-name-0").fill("E2E name only med")

    // A name alone is enough to advance; strength/form stay optional.
    await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })
    await clickContinue(page)
    await waitForStep(page, /When were you last prescribed/i)
  })

  test("medication history requires an unchanged dose-and-directions confirmation", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await completeMedicationStep(page)
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /Under 3 months/i)
    await page.getByPlaceholder(/2 puffs twice daily/i).fill("1 tablet daily")
    await page.getByPlaceholder(/e\.g\., asthma/i).fill("asthma")
    await clickChip(page, /No side effects/i)

    await clickContinue(page)
    await expect(page.getByText(/Please confirm whether the dose or the way you take this medicine has changed/i).first()).toBeVisible()

    const regimenQuestion = page.getByRole("radiogroup", {
      name: /dose or the way you take this medicine changed/i,
    })
    await regimenQuestion.getByRole("radio", { name: /Yes, changed/i }).click()
    await expect(page.getByText(/needs review by your regular GP or specialist/i).first()).toBeVisible()
    await expect(page.getByText(/Your prescription history/i).first()).toBeVisible()

    await regimenQuestion.getByRole("radio", { name: /No, unchanged/i }).click()
    await clickContinue(page)
    await waitForStep(page, /Anything the doctor should know/i)
  })

  test("editing the medication clears the unchanged-regimen confirmation", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await completeMedicationStep(page)
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /Under 3 months/i)
    await page.getByPlaceholder(/2 puffs twice daily/i).fill("1 tablet daily")
    await page.getByPlaceholder(/e\.g\., asthma/i).fill("asthma")
    await clickChip(page, /No side effects/i)
    const regimenQuestion = page.getByRole("radiogroup", {
      name: /dose or the way you take this medicine changed/i,
    })
    await regimenQuestion.getByRole("radio", { name: /No, unchanged/i }).click()

    await page.getByRole("button", { name: /Go back/i }).click()
    await waitForStep(page, /Which medication do you need/i)
    await page.locator("#medication-name-0").fill("E2E changed medication")
    await clickContinue(page)
    await waitForStep(page, /When were you last prescribed/i)

    const unchangedOption = page
      .getByRole("radiogroup", { name: /dose or the way you take this medicine changed/i })
      .getByRole("radio", { name: /No, unchanged/i })
    await expect(unchangedOption).toHaveAttribute("aria-checked", "false")
    await clickContinue(page)
    await expect(page.getByText(/Please confirm whether the dose or the way you take this medicine has changed/i).first()).toBeVisible()

    await unchangedOption.click()
    await page.getByPlaceholder(/2 puffs twice daily/i).fill("2 tablets daily")
    await expect(unchangedOption).toHaveAttribute("aria-checked", "false")
    await expect(page.getByText(/Please confirm whether the dose or the way you take this medicine has changed/i).first()).toBeVisible()
  })

  test("patient details validates email format", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Fast-forward through steps to reach details
    await completeMedicationStep(page)
    await completeMedicationHistoryStep(page)
    await completeMedicalHistoryStep(page)

    // On details step - enter invalid email
    await waitForStep(page, /^Your details$/i)
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
    await completeMedicationStep(page)
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

    await completeMedicationStep(page)
    await completeMedicationHistoryStep(page)
    await completeMedicalHistoryStep(page)
    await completeDetailsStep(page)
    await completeReviewStep(page)

    await waitForStep(page, /One last check/i)

    // Verify price is $29.95 (PRICING.REPEAT_SCRIPT)
    await expect(page.getByText("$29.95", { exact: true }).first()).toBeVisible()

    // Verify trust badges (review step shows "Secure Stripe checkout · Full refund if declined")
    await expect(page.getByText(/Secure Stripe checkout/i)).toBeVisible()
    await expect(page.getByText(/Full refund if declined/i)).toBeVisible()
  })

  test("checkout button disabled without consent", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await completeMedicationStep(page)
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

    // Medication free-text name box should be usable
    await expect(page.locator("#medication-name-0")).toBeVisible()
  })
})

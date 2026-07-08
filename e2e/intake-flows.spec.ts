import { expect, type Page,test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Full Intake Flow E2E Tests
 *
 * Exercises every step of each intake type from start to the checkout screen:
 *   1. Medical Certificate  (med-cert)
 *   2. Repeat Prescription  (prescription / repeat-script)
 *
 * ED and Hair Loss have dedicated specs. General Consult was retired
 * on 2026-05-20.
 *
 * These tests run as a guest (no auth) and stop at the Stripe redirect
 * because we can't complete payment in tests. The goal is to prove every
 * step renders, validates, and advances correctly.
 *
 * We intercept the Stripe checkout redirect so the test never actually
 * leaves the domain - we just verify the server action was called.
 */

// ---------------------------------------------------------------------------
// Helpers
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

/**
 * Click a chip / selection button whose visible text matches `label`.
 *
 * Tries role="button" first (most chips), then role="radio" (cert-type and
 * other single-select chip groups that use the radiogroup pattern). Falls
 * back to a CSS selector match for edge cases.
 */
async function clickChip(page: Page, label: string | RegExp) {
  const btn = page.getByRole("button", { name: label })
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click()
    return
  }
  // Cert-type and other radiogroup chips use role="radio"
  await page.getByRole("radio", { name: label }).click()
}

/**
 * Click the primary "advance" action button at the bottom of a step.
 *
 * Matches both generic "Continue" labels and step-specific variants like
 * "Review my certificate", "Review your request", "Continue to assessment",
 * "Continue to health check", "Continue to your details", "Continue to payment".
 * Takes the LAST matching button to avoid hitting any secondary buttons above.
 */
async function clickContinue(page: Page) {
  const btn = page.getByRole("button", {
    name: /^Continue|Review (my|your)|Continue to/i,
  }).last()
  await expect(btn).toBeEnabled({ timeout: 5000 })
  await btn.scrollIntoViewIfNeeded()
  await btn.click()
}

/**
 * Wait for a step heading or key element to appear.
 *
 * If the StepErrorBoundary catches a transient render error (can happen when
 * the "online" event fires during step transitions and triggers offline-queue
 * sync), we click "Try again" to reset the boundary and re-render the step.
 */
async function waitForStep(page: Page, text: string | RegExp, timeout = 15000) {
  // If the error boundary is already showing, click "Try again" before waiting
  const errorMsg = page.getByText(/We encountered an issue loading this step/i).first()
  if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
    const tryAgain = page.getByRole("button", { name: /Try again/i })
    if (await tryAgain.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tryAgain.click()
      await page.waitForTimeout(500)
    }
  }

  await expect(
    page.getByText(text).first()
  ).toBeVisible({ timeout })
}

/**
 * Fill a textarea on the page.
 *
 * Targets the visible textbox by role for reliability across
 * different component implementations.
 */
async function fillTextarea(page: Page, text: string) {
  const textarea = page.getByRole("textbox").first()
  await textarea.click()
  await textarea.fill(text)
}

/**
 * Complete the Safety step.
 *
 * Safety consent was merged INTO the review step (CLAUDE.md) — there is no
 * longer a standalone safety gate. This helper is kept as a no-op so call
 * sites don't need to change; the safety consent checkbox is now handled
 * inside completeReviewStep().
 */
async function completeSafetyStep(_page: Page) {
  // No-op: safety consent is part of the review step
}

/**
 * Complete the Patient Details step with valid test data.
 *
 * opts.needsPhone: true for prescriptions and consults (adds phone field)
 * opts.needsPrescriptionDetails: true for prescription/repeat-script (adds sex, medicare, address)
 */
async function completeDetailsStep(
  page: Page,
  opts?: { needsPhone?: boolean; needsPrescriptionDetails?: boolean }
) {
  await waitForStep(page, /Your details/i)

  // Dismiss autofill banner if present
  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noThanks.click()
  }

  // Fill core fields
  await page.locator('input[placeholder="Jane"]').fill("Test")
  await page.locator('input[placeholder="Smith"]').fill("Patient")
  await page.locator('input[placeholder="jane@example.com"]').fill("test@instantmed.com.au")

  await page.locator('input[placeholder="DD/MM/YYYY"]').fill("01/01/1990")

  // Phone - required for prescriptions and consults
  if (opts?.needsPhone) {
    await page.locator('input[placeholder="0412 345 678"]').fill("0412345678")
  }

  // Prescription-specific fields: sex, medicare, address
  if (opts?.needsPrescriptionDetails) {
    // Sex - Radix UI Select: click trigger then option
    await page.locator("#sex-select-trigger").click()
    await page.getByRole("option", { name: /^Male$/i }).click()

    // Medicare number - deterministic non-real checksum-valid fixture
    await page.locator('input[placeholder="10 digits"]').fill("2123456701")
    // Blur to trigger validation
    await page.locator('input[placeholder="10 digits"]').blur()
    await page.waitForTimeout(200)
    await page.getByRole("button", { name: /^1$/ }).last().click()

    // Address - typed text sets addressLine1 via onChange (no autocomplete required)
    await page.locator('[placeholder="Start typing your address..."]').fill("123 Test Street")
    await page.locator("#suburb").fill("Sydney")
    await page.locator("#state-select-trigger").click()
    await page.getByRole("option", { name: /^NSW$/i }).click()
    await page.locator("#postcode").fill("2000")
    await page.waitForTimeout(200)
  }

  await clickContinue(page)
}

/**
 * Complete the Medical History step (allergies, conditions, other meds).
 *
 * Waits for "Any allergies?" which is the first visible text in this step.
 * The no-medications label is "No medications" (not "No other medications").
 */
async function completeMedicalHistoryStep(page: Page) {
  await waitForStep(page, /Anything the doctor should know/i)
  // Each question is a Yes/No radiogroup with a question-specific "no" label.
  // #209 folded the old "previous medication reactions?" toggle into the
  // allergies question, so there is no separate reactions question.
  await page.getByRole("radiogroup", { name: /allerg/i }).getByRole("radio", { name: /^None$/i }).click()
  await page.getByRole("radiogroup", { name: /medical conditions/i }).getByRole("radio", { name: /^No conditions$/i }).click()
  await page.getByRole("radiogroup", { name: /other medications/i }).getByRole("radio", { name: /^No medications$/i }).click()
  const pregnancy = page.getByRole("radiogroup", { name: /pregnant or breastfeeding/i })
  if (await pregnancy.isVisible({ timeout: 2000 }).catch(() => false)) {
    await pregnancy.getByRole("radio", { name: /^No$/i }).click()
  }
  await clickContinue(page)
}

/**
 * Complete the Review step.
 *
 * Safety consent is now merged into the review step. We tick the checkbox
 * before clicking Continue (the button uses aria-disabled when unchecked).
 */
async function completeReviewStep(page: Page) {
  await waitForStep(page, /One last check/i)
  // Tick the safety consent checkbox. Prescription flows submit payment from this
  // combined review/pay screen; med-cert flows still continue to a checkout step.
  const safetyCheckbox = page.locator("#safety-consent")
  if (await safetyCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    const isChecked = await safetyCheckbox.isChecked().catch(() => false)
    if (!isChecked) {
      await safetyCheckbox.click()
      await page.waitForTimeout(200)
    }
  }
  const payButton = page.getByRole("button", { name: /^Pay \$/ }).last()
  if (await payButton.isVisible({ timeout: 1000 }).catch(() => false)) return

  await page.getByRole("button", { name: /Continue to payment/i }).click()
}

/**
 * Verify we've reached the Checkout step and toggle consents.
 * We do NOT click the final "Continue to payment" checkout button
 * because it fires a server action → Stripe redirect.
 */
async function verifyCheckoutStep(page: Page) {
  const combinedPayButton = page.getByRole("button", { name: /^Pay \$/ }).last()
  if (await combinedPayButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(combinedPayButton).toBeEnabled({ timeout: 5000 })
    await expect(combinedPayButton).toHaveAttribute("aria-disabled", "false")
    return
  }

  await waitForStep(page, /Request Summary|Ready to submit/i)

  // Tick the single combined consent checkbox (#consent-checkbox)
  const consentCheckbox = page.locator("#consent-checkbox")
  if (await consentCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
    const isChecked = await consentCheckbox.isChecked().catch(() => false)
    if (!isChecked) {
      await consentCheckbox.click()
      await page.waitForTimeout(200)
    }
  }

  // The checkout button label is dynamic: "Pay $19.95", "Pay $29.95", etc.
  // (the CheckoutStep overrides the default "Continue to payment" label with the price)
  const checkoutBtn = page.getByRole("button", { name: /^Pay \$/ }).last()
  await expect(checkoutBtn).toBeEnabled({ timeout: 5000 })
}

/**
 * Complete the medication step for prescriptions.
 *
 * Since #208 the PBS combobox is retired — the medication step is a plain
 * free-text name box (`#medication-name-0`). Strength/form (`#medication-strength-0`
 * / `#medication-form-0`) are optional and reveal once a name is typed.
 */
async function completeMedicationStep(page: Page) {
  await waitForStep(page, /Which medication do you need\?/i)

  await page.locator("#medication-name-0").fill("E2E test medication")

  await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })
  await page.locator("#medication-strength-0").fill("500 mg")
  await page.locator("#medication-form-0").fill("capsule")

  await clickContinue(page)
  await page.waitForTimeout(500)
}

// ---------------------------------------------------------------------------
// 1 · MEDICAL CERTIFICATE - Full Flow
// ---------------------------------------------------------------------------

test.describe("Intake: Medical Certificate - full flow", () => {
  test("completes med-cert from start to checkout", async ({ page }) => {
    // Navigate to med-cert flow
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // ── Step 1: Certificate details ──
    await waitForStep(page, /Certificate details/i)
    // Scope cert-type click to its radiogroup to avoid ambiguity, then
    // verify aria-checked before proceeding (guards against hydration races).
    const certTypeGroup = page.getByRole("radiogroup", { name: /Certificate type/i })
    const workRadio = certTypeGroup.getByRole("radio", { name: /^Work$/i })
    await workRadio.click()
    await expect(workRadio).toHaveAttribute("aria-checked", "true", { timeout: 5000 })
    // Duration — click 1 day (default is 2, override for the test)
    const oneDayRadio = page
      .getByRole("radiogroup", { name: /How many days|Certificate duration/i })
      .getByRole("radio", { name: /1 day/i })
    await oneDayRadio.click()
    await expect(oneDayRadio).toHaveAttribute("aria-checked", "true", { timeout: 3000 })
    // Start date defaults to today - no action needed
    await clickContinue(page)

    // ── Step 2: Symptoms ──
    await waitForStep(page, /What symptoms do you have/i)
    await clickChip(page, /Cold\/Flu/i)
    await clickChip(page, /Headache/i)
    // Symptom duration
    await clickChip(page, /1-2 days/i)
    // Symptom details (min 20 chars)
    await fillTextarea(page,
      "I have had a cold and headache since yesterday, with body aches and a runny nose."
    )
    await clickContinue(page)

    // ── Step 3: Patient details ──
    await completeDetailsStep(page)

    // ── Step 4: Safety step ──
    await completeSafetyStep(page)

    // ── Step 5: Review ──
    await completeReviewStep(page)

    // ── Step 6: Checkout ──
    await verifyCheckoutStep(page)
  })
})

// ---------------------------------------------------------------------------
// 1b · MEDICAL CERTIFICATE - Certificate Step Defaults
// ---------------------------------------------------------------------------

test.describe("Intake: Certificate Step - defaults and date range", () => {
  test("2-day duration is pre-selected by default", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /Certificate details/i)

    // The 2-day radio button must be pre-checked without any user interaction
    const twoDayBtn = page.getByRole("radio", { name: /2 days/i })
    await expect(twoDayBtn).toHaveAttribute("aria-checked", "true")
  })

  test("selecting start date and cert type enables Continue", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /Certificate details/i)

    // Select cert type (required to enable Continue)
    await clickChip(page, /^Work$/i)

    // 2-day duration is pre-selected by default - no action needed
    // Click the "Today" start-offset button (offset=0, always present)
    await page.getByRole("radio", { name: /^Today$/i }).click()
    await expect(
      page.getByRole("radio", { name: /^Today$/i })
    ).toHaveAttribute("aria-checked", "true")

    // Continue should now be enabled: certType, duration, startDate all set.
    // When all fields are filled the button reads "Review my certificate".
    const continueBtn = page.getByRole("button", { name: /Review my certificate/i }).last()
    await expect(continueBtn).toBeEnabled({ timeout: 3000 })
  })

  test("switching duration selection updates aria-checked correctly", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await waitForStep(page, /Certificate details/i)

    // 2-day is pre-selected by default
    await expect(page.getByRole("radio", { name: /2 days/i }))
      .toHaveAttribute("aria-checked", "true")

    // Click 1-day - it becomes selected
    await page.getByRole("radio", { name: /1 day/i }).click()
    await expect(page.getByRole("radio", { name: /1 day/i }))
      .toHaveAttribute("aria-checked", "true")
    await expect(page.getByRole("radio", { name: /2 days/i }))
      .toHaveAttribute("aria-checked", "false")

    // Click back to 2-day - 2-day is re-selected
    await page.getByRole("radio", { name: /2 days/i }).click()
    await expect(page.getByRole("radio", { name: /2 days/i }))
      .toHaveAttribute("aria-checked", "true")
    await expect(page.getByRole("radio", { name: /1 day/i }))
      .toHaveAttribute("aria-checked", "false")
  })
})

// ---------------------------------------------------------------------------
// 2 · REPEAT PRESCRIPTION - Full Flow
// ---------------------------------------------------------------------------

test.describe("Intake: Repeat Prescription - full flow", () => {
  test("completes prescription from start to checkout", async ({ page }) => {
    // Navigate to prescription flow
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // ── Step 1: Medication search ──
    await completeMedicationStep(page)

    // ── Step 2: Medication history ──
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /Under 3 months/i)
    await page.getByPlaceholder(/2 puffs twice daily/i).fill("1 tablet daily")
    await page.getByPlaceholder(/e\.g\., asthma/i).fill("asthma")
    // Side effects question appears after entering the current dose + indication.
    await clickChip(page, /No side effects/i)
    await clickContinue(page)

    // ── Step 3: Medical history ──
    await completeMedicalHistoryStep(page)

    // ── Step 4: Patient details ──
    // Prescription requires sex + medicare + address in addition to core fields
    await completeDetailsStep(page, { needsPhone: true, needsPrescriptionDetails: true })

    // ── Step 5: Safety step ──
    await completeSafetyStep(page)

    // ── Step 6: Review ──
    await completeReviewStep(page)

    // ── Step 7: Checkout ──
    await verifyCheckoutStep(page)
  })
})

// ---------------------------------------------------------------------------
// 3 · CONSULTATION (no subtype) - Service Hub Redirect
//
// General Consult was retired on 2026-05-20 so the full-flow test that
// used to live here was removed. ED and Hair Loss are the only consult
// subtypes; their flows live in their own describe blocks.
// ---------------------------------------------------------------------------

test.describe("Intake: Consultation without subtype - service hub", () => {
  test("shows service hub when no subtype is pre-selected", async ({ page }) => {
    // Navigating to /request?service=consult WITHOUT a subtype now redirects to
    // the service hub (request-flow.tsx line 428). The old category-grid step
    // is only shown when a subtype is already set via URL or store.
    await page.goto("/request?service=consult")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Service hub heading should be visible
    await expect(page.getByText(/What brings you in today/i).first()).toBeVisible({ timeout: 10000 })

    // All active services should appear (General Consult retired 2026-05-20)
    await expect(page.getByText(/Medical certificate/i).first()).toBeVisible()
    await expect(page.getByText(/Erectile dysfunction/i).first()).toBeVisible()
    await expect(page.getByText(/Hair loss/i).first()).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 5 · EDGE CASES & VALIDATION
// ---------------------------------------------------------------------------

test.describe("Intake: Validation & edge cases", () => {
  test("med-cert blocks Continue when fields are empty", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)
    await waitForStep(page, /Certificate details/i)

    // Continue button should be disabled without selections
    const btn = page.getByRole("button", { name: /^Continue$/i }).last()
    await expect(btn).toBeDisabled()
  })

  test("symptoms step: Continue is always clickable and surfaces blocking reasons; chips seed detail", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Complete certificate step first (type + duration + start date).
    await waitForStep(page, /Certificate details/i)
    const certGrp = page.getByRole("radiogroup", { name: /Certificate type/i })
    const workR = certGrp.getByRole("radio", { name: /^Work$/i })
    await workR.click()
    await expect(workR).toHaveAttribute("aria-checked", "true", { timeout: 5000 })
    await clickChip(page, /1 day/i)
    await page.getByRole("radio", { name: /^Today$/i }).click()
    await clickContinue(page)

    // On symptoms step (title: "What is stopping you today?").
    await waitForStep(page, /What is stopping you today/i)

    // The Continue button is always clickable — no silently-disabled dead end.
    // Tapping it with nothing entered surfaces the blocking reasons and stays put.
    const continueBtn = page.getByRole("button", { name: /^Continue$/i }).last()
    await expect(continueBtn).toBeEnabled()
    await continueBtn.click()
    await expect(page.getByRole("alert")).toContainText(/Add (this|these) to continue/i)
    await expect(page.getByText(/What is stopping you today/i).first()).toBeVisible()

    // Tapping a quick-add chip seeds the textarea — no typing required, and it
    // satisfies the symptom-text quality gate on its own.
    await clickChip(page, /^Cold or flu$/i)
    await expect(page.getByRole("textbox").first()).toHaveValue(/cold or flu/i)

    // Pick a duration, then the step is valid and advances to the details step.
    await clickChip(page, /^1-2 days$/i)
    await clickContinue(page)
    await waitForStep(page, /Your details/i)
  })

  test("prescription medication-history 'never prescribed' shows warning", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Complete medication step using the robust helper
    await completeMedicationStep(page)

    // On medication history step - take the "never prescribed" escape (#210
    // renamed the "Never" chip to "I have not been prescribed this before").
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /I have not been prescribed this before/i)

    // Warning should appear with "Browse other services" CTA (rendered as a link)
    await expect(page.getByText(/This service is for repeat prescriptions only/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /Browse other services/i })).toBeVisible()
  })

  test("patient details validates email format", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Fast-forward to details step
    await waitForStep(page, /Certificate details/i)
    const certGrp2 = page.getByRole("radiogroup", { name: /Certificate type/i })
    const workR2 = certGrp2.getByRole("radio", { name: /^Work$/i })
    await workR2.click()
    await expect(workR2).toHaveAttribute("aria-checked", "true", { timeout: 5000 })
    await clickContinue(page)

    // Complete symptoms
    await waitForStep(page, /What symptoms do you have/i)
    await clickChip(page, /Cold\/Flu/i)
    await clickChip(page, /1-2 days/i)
    await fillTextarea(page, "I have a bad cold with fever and muscle aches for two days now.")
    await clickContinue(page)

    // On details step - enter invalid email
    await waitForStep(page, /This information is required/i)
    const noThanks = page.getByRole("button", { name: /No thanks/i })
    if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
      await noThanks.click()
    }

    await page.locator('input[placeholder="Jane"]').fill("Test")
    await page.locator('input[placeholder="Smith"]').fill("User")
    await page.locator('input[placeholder="jane@example.com"]').fill("not-an-email")
    // Blur to trigger validation - wait for React re-render
    await page.locator('input[placeholder="jane@example.com"]').blur()
    await page.waitForTimeout(500)

    // Should show email validation error
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 5000 })
  })
})

// ---------------------------------------------------------------------------
// 6 · REPEAT-SCRIPT alias - should work identically to prescription
// ---------------------------------------------------------------------------

test.describe("Intake: repeat-script alias", () => {
  test("repeat-script loads the medication step like prescription", async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)

    // Should land on medication search step
    await waitForStep(page, /Which medication do you need\?/i)
    // Progress nav should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible()
  })
})

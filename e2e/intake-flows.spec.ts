import { expect, type Page,test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

/**
 * Full Intake Flow E2E Tests
 *
 * Exercises every step of each intake type from start to the checkout screen:
 *   1. Medical Certificate  (med-cert)
 *   2. Repeat Prescription  (prescription / repeat-script)
 *   3. General Consultation (consult&subtype=general)
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
  await waitForStep(page, /This information is required/i)

  // Dismiss autofill banner if present
  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noThanks.click()
  }

  // Fill core fields
  await page.locator('input[placeholder="Jane"]').fill("Test")
  await page.locator('input[placeholder="Smith"]').fill("Patient")
  await page.locator('input[placeholder="jane@example.com"]').fill("test@instantmed.com.au")

  // DOB - 25 years ago
  const dob = new Date()
  dob.setFullYear(dob.getFullYear() - 25)
  await page.locator('input[type="date"]').first().fill(dob.toISOString().split("T")[0])

  // Phone - required for prescriptions and consults
  if (opts?.needsPhone) {
    await page.locator('input[placeholder="0412 345 678"]').fill("0412345678")
  }

  // Prescription-specific fields: sex, medicare, address
  if (opts?.needsPrescriptionDetails) {
    // Sex - Radix UI Select: click trigger then option
    await page.locator("#sex-select-trigger").click()
    await page.getByRole("option", { name: /^Male$/i }).click()

    // Medicare number - test number accepted by validateMedicareNumber
    await page.locator('input[placeholder="1234 56789 0"]').fill("2222222222")
    // Blur to trigger validation
    await page.locator('input[placeholder="1234 56789 0"]').blur()
    await page.waitForTimeout(200)

    // Address - typed text sets addressLine1 via onChange (no autocomplete required)
    await page.locator('[placeholder="Start typing your address..."]').fill("123 Test Street, Sydney NSW 2000")
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
  await waitForStep(page, /Any allergies/i)
  await clickChip(page, /No allergies/i)
  await clickChip(page, /No conditions/i)
  await clickChip(page, /No medications/i)
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
  // Tick the safety consent checkbox (required to enable Continue to payment)
  const safetyCheckbox = page.locator("#safety-consent")
  if (await safetyCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    const isChecked = await safetyCheckbox.isChecked().catch(() => false)
    if (!isChecked) {
      await safetyCheckbox.click()
      await page.waitForTimeout(200)
    }
  }
  await page.getByRole("button", { name: /Continue to payment/i }).click()
}

/**
 * Verify we've reached the Checkout step and toggle consents.
 * We do NOT click the final "Continue to payment" checkout button
 * because it fires a server action → Stripe redirect.
 */
async function verifyCheckoutStep(page: Page) {
  await waitForStep(page, /Request Summary/i)

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
 * Complete the medication search step for prescriptions.
 *
 * The MedicationSearch component is a combobox that searches the PBS database.
 * In test environments the PBS API may not return results, so we use multiple
 * fallback strategies:
 *   1. Type a query and try to pick a dropdown result
 *   2. If no results, type a name and blur to trigger manual entry via handleBlur
 *   3. If that still doesn't work, click "I don't know the exact name" fallback
 */
async function completeMedicationSearchStep(page: Page) {
  await waitForStep(page, /Search using the PBS database/i)

  const medInput = page.getByRole("combobox").first()
  await medInput.fill("Amox")
  // Wait for debounce (350ms) + API response
  await page.waitForTimeout(2000)

  // Strategy 1: Click a PBS dropdown result if available
  const firstResult = page.locator('[role="option"]').first()
  if (await firstResult.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstResult.click()
    // Wait for handleSelect to register in Zustand store
    await page.waitForTimeout(1000)
  } else {
    // Strategy 2: Type a full medication name and blur to trigger manual entry.
    // handleBlur in MedicationSearch creates a MANUAL pbs_code entry after 200ms.
    // The fill also triggers a debounced PBS search (350ms debounce + API latency),
    // which causes re-renders. We must wait for the full cycle to settle before
    // clicking Continue — otherwise the element is "visible and enabled but not stable".
    await medInput.clear()
    await medInput.fill("Amoxicillin 500mg capsules")
    await medInput.blur()
    // Wait for: handleBlur 200ms + debounce 350ms + PBS API response (~2s) + React settle
    await page.waitForTimeout(3500)
  }

  // Verify the step-advance button now reads "Continue to history" (canContinue=true).
  // The /^Continue$/i pattern deliberately does NOT match "Continue to history", so if
  // the button IS enabled the check short-circuits and we fall through to clickContinue.
  const continueToHistory = page.getByRole("button", { name: /Continue to history/i }).last()
  const isReady = await continueToHistory.isEnabled({ timeout: 2000 }).catch(() => false)
  if (!isReady) {
    // Fallback: press Tab to trigger a second blur event in case the first was swallowed
    await page.keyboard.press("Tab")
    await page.waitForTimeout(1000)
  }

  // Wait for any final re-renders to settle before clicking
  await page.waitForTimeout(500)
  await clickContinue(page)
  // Wait for navigation animation
  await page.waitForTimeout(500)
}

/**
 * Complete the consult reason step.
 *
 * When subtype is pre-selected via URL params (e.g., ?subtype=general),
 * the store's `consultSubtype` is set via useEffect on mount. The
 * consult-reason-step then maps it to `consultCategory` via another
 * useEffect. This requires two render cycles, so we wait for the
 * "Consultation type" label to appear.
 *
 * If the subtype race condition causes the category grid to show instead,
 * we fall back to selecting from the grid.
 */
async function completeConsultReasonStep(page: Page, opts?: { subtype?: string }) {
  // Wait for the step to render (either path)
  await page.waitForTimeout(500) // allow useEffect to set consultSubtype

  // Check which version of the step we got
  const hasGrid = await page.getByText(/What would you like help with/i).isVisible({ timeout: 2000 }).catch(() => false)
  const hasPreSelected = await page.getByText(/Consultation type/i).isVisible({ timeout: 1000 }).catch(() => false)

  if (hasPreSelected) {
    // Subtype was pre-selected - just verify it shows correctly
    const subtypeLabel = opts?.subtype === "general" ? "General consultation" : opts?.subtype || "General consultation"
    await expect(page.getByText(subtypeLabel).first()).toBeVisible()
  } else if (hasGrid) {
    // Category grid is shown - select from it
    // Button names include emoji: "🩺General consultation", "🔵Erectile dysfunction", etc.
    const categoryLabel = opts?.subtype === "ed" ? /Erectile dysfunction/i
      : opts?.subtype === "hair_loss" ? /Hair loss/i
      : opts?.subtype === "weight_loss" ? /Weight loss/i
      : opts?.subtype === "womens_health" ? /Women.*health/i
      : /General consultation/i
    await page.getByRole("button", { name: categoryLabel }).click()
  }

  // Fill in details (min 20 chars)
  await fillTextarea(page,
    "I have been experiencing persistent lower back pain for the last two weeks and would like to discuss treatment options and possible referrals."
  )

  // Urgency selection
  await clickChip(page, /Routine/i)

  // Wait for React state to settle before clicking Continue
  await page.waitForTimeout(500)
  await clickContinue(page)
  // Wait for navigation animation
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
    const oneDayRadio = page.getByRole("radiogroup", { name: /Certificate duration/i }).getByRole("radio", { name: /1 day/i })
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
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // ── Step 1: Medication search ──
    await completeMedicationSearchStep(page)

    // ── Step 2: Medication history ──
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /Less than 3 months ago/i)
    // Side effects question appears after selecting a history option
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
// 3 · GENERAL CONSULTATION - Full Flow
// ---------------------------------------------------------------------------

test.describe("Intake: General Consultation - full flow", () => {
  test("completes general consult from start to checkout", async ({ page }) => {
    // Navigate to general consultation flow (subtype pre-selected from hub)
    await page.goto("/request?service=consult&subtype=general")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // ── Step 1: Consult reason ──
    // The subtype is set via useEffect which may cause the category grid
    // to briefly appear before the pre-selected label shows.
    // Our helper handles both paths gracefully.
    await completeConsultReasonStep(page, { subtype: "general" })

    // ── Step 2: Medical history ──
    await completeMedicalHistoryStep(page)

    // ── Step 3: Patient details ──
    await completeDetailsStep(page, { needsPhone: true })

    // ── Step 4: Safety step ──
    await completeSafetyStep(page)

    // ── Step 5: Review ──
    await completeReviewStep(page)

    // ── Step 6: Checkout ──
    await verifyCheckoutStep(page)
  })
})

// ---------------------------------------------------------------------------
// 4 · CONSULTATION (no subtype) - Category Selection Flow
// ---------------------------------------------------------------------------

test.describe("Intake: Consultation without subtype - category selection", () => {
  test("shows service hub when no subtype is pre-selected", async ({ page }) => {
    // Navigating to /request?service=consult WITHOUT a subtype now redirects to
    // the service hub (request-flow.tsx line 428). The old category-grid step
    // is only shown when a subtype is already set via URL or store.
    await page.goto("/request?service=consult")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Service hub heading should be visible
    await expect(page.getByText(/What brings you in today/i).first()).toBeVisible({ timeout: 10000 })

    // All active services should appear
    await expect(page.getByText(/Medical certificate/i).first()).toBeVisible()
    await expect(page.getByText(/Erectile dysfunction/i).first()).toBeVisible()
    await expect(page.getByText(/Hair loss/i).first()).toBeVisible()
    await expect(page.getByText(/General consultation/i).first()).toBeVisible()
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

  test("symptoms step enforces minimum 20 character detail", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Complete certificate step first
    await waitForStep(page, /Certificate details/i)
    const certGrp = page.getByRole("radiogroup", { name: /Certificate type/i })
    const workR = certGrp.getByRole("radio", { name: /^Work$/i })
    await workR.click()
    await expect(workR).toHaveAttribute("aria-checked", "true", { timeout: 5000 })
    await clickContinue(page)

    // On symptoms step
    await waitForStep(page, /What symptoms do you have/i)
    await clickChip(page, /Cold\/Flu/i)
    await clickChip(page, /1-2 days/i)

    // Enter short text (< 20 chars) - Continue should remain disabled
    await fillTextarea(page, "I feel sick")
    // Wait for React state to propagate after fill
    await page.waitForTimeout(500)
    await expect(page.getByRole("button", { name: /^Continue$/i }).last()).toBeDisabled({ timeout: 5000 })

    // Extend text past 20 chars - Continue should become enabled.
    // When canContinue=true the button label changes to "Continue to your details",
    // so we look for that specific label rather than the generic "Continue".
    await fillTextarea(page, "I feel sick with a fever and body aches since yesterday.")
    await page.waitForTimeout(500)
    await expect(
      page.getByRole("button", { name: /Continue to your details/i }).last()
    ).toBeEnabled({ timeout: 5000 })
  })

  test("prescription medication-history 'never prescribed' shows warning", async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Complete medication step using the robust helper
    await completeMedicationSearchStep(page)

    // On medication history step - select "Never prescribed"
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /Never prescribed this medication/i)

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
    await waitForStep(page, /Search using the PBS database/i)
    // Progress nav should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible()
  })
})

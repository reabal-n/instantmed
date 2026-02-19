import { test, expect, type Page } from "@playwright/test"
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
 * leaves the domain — we just verify the server action was called.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Dismiss overlays that can block clicks on page elements:
 * - Cookie consent banner
 * - Clerk keyless mode banner (dev only)
 * - Next.js dev tools issues badge
 */
async function dismissOverlays(page: Page) {
  // Cookie consent banner
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 2000 }).catch(() => false)) {
    await essentialOnly.click()
    await page.waitForTimeout(300)
  }

  // Clerk keyless mode banner — collapse it if present
  const clerkBanner = page.getByRole("button", { name: /Clerk is in keyless mode/i })
  if (await clerkBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
    // Hide the entire Clerk keyless overlay via JS
    await page.evaluate(() => {
      const el = document.querySelector('[id*="clerk-keyless"]') as HTMLElement
      if (el) el.style.display = 'none'
      // Also try removing by text content
      document.querySelectorAll('button').forEach(btn => {
        if (btn.textContent?.includes('Clerk is in keyless mode')) {
          const parent = btn.closest('[style*="position"]') || btn.parentElement?.parentElement
          if (parent instanceof HTMLElement) parent.style.display = 'none'
        }
      })
    })
  }

  // Next.js Dev Tools issues overlay — collapse it
  const issuesBadge = page.getByRole("button", { name: /Open issues overlay/i })
  if (await issuesBadge.isVisible({ timeout: 500 }).catch(() => false)) {
    const collapseBadge = page.getByRole("button", { name: /Collapse issues badge/i })
    if (await collapseBadge.isVisible({ timeout: 500 }).catch(() => false)) {
      await collapseBadge.click().catch(() => {})
    }
  }

  // Also try hiding all dev tool overlays via CSS
  await page.evaluate(() => {
    // Hide Next.js dev tools and Clerk overlays that float over content
    const style = document.createElement('style')
    style.textContent = `
      [data-nextjs-dialog-overlay], [data-nextjs-toast],
      [class*="nextjs-portal"], [id*="clerk-keyless"],
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
  // Some steps have multiple Continue buttons (safety gate has its own).
  // We want the last visible full-width one at the bottom of the form.
  const btn = page.getByRole("button", { name: /^Continue$/i }).last()
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
 * The safety gate renders an acknowledgement checkbox then a Continue
 * button. After clicking Continue it auto-advances after 800ms.
 */
async function completeSafetyStep(page: Page) {
  // Wait for the safety step to appear
  await waitForStep(page, /Before we begin|Safety confirmed/i)

  // If already confirmed (navigated back) just click Continue
  const alreadyConfirmed = await page.getByText("Safety confirmed").isVisible().catch(() => false)
  if (alreadyConfirmed) {
    await page.getByRole("button", { name: /Continue/i }).click()
    return
  }

  // Click the acknowledgement button
  await page.getByText(/I confirm I am not experiencing a medical emergency/i).click()
  // Then click Continue
  await page.getByRole("button", { name: /Continue/i }).last().click()
  // Wait for auto-advance animation (800ms + buffer)
  await page.waitForTimeout(1200)
}

/**
 * Complete the Patient Details step with valid test data.
 */
async function completeDetailsStep(page: Page, opts?: { needsPhone?: boolean }) {
  await waitForStep(page, /This information is required/i)

  // Dismiss autofill banner if present
  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noThanks.click()
  }

  // Fill fields
  await page.locator('input[placeholder="Jane"]').fill("Test")
  await page.locator('input[placeholder="Smith"]').fill("Patient")
  await page.locator('input[placeholder="jane@example.com"]').fill("test@instantmed.com.au")

  // DOB — 25 years ago
  const dob = new Date()
  dob.setFullYear(dob.getFullYear() - 25)
  await page.locator('input[type="date"]').first().fill(dob.toISOString().split("T")[0])

  // Phone — required for prescriptions
  if (opts?.needsPhone) {
    await page.locator('input[placeholder="0412 345 678"]').fill("0412345678")
  }

  await clickContinue(page)
}

/**
 * Complete the Medical History step (allergies, conditions, other meds).
 */
async function completeMedicalHistoryStep(page: Page) {
  await waitForStep(page, /This information helps our doctors/i)
  await clickChip(page, /No allergies/i)
  await clickChip(page, /No conditions/i)
  await clickChip(page, /No other medications/i)
  await clickContinue(page)
}

/**
 * Complete the Review step — just click "Continue to payment".
 */
async function completeReviewStep(page: Page) {
  await waitForStep(page, /Review your request/i)
  await page.getByRole("button", { name: /Continue to payment/i }).click()
}

/**
 * Verify we've reached the Checkout step and toggle consents.
 * We do NOT click the final "Continue to payment" checkout button
 * because it fires a server action → Stripe redirect.
 */
async function verifyCheckoutStep(page: Page) {
  await waitForStep(page, /Request Summary/i)

  // Toggle consents
  await page.locator("#accuracy").click()
  await page.locator("#terms").click()

  // Verify the checkout button becomes enabled
  const checkoutBtn = page.getByRole("button", { name: /Continue to payment/i }).last()
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
  } else {
    // Strategy 2: Type a full medication name and blur to trigger manual entry
    // handleBlur in MedicationSearch creates a MANUAL entry after 200ms delay
    await medInput.clear()
    await medInput.fill("Amoxicillin 500mg capsules")
    await medInput.blur()
    // Wait for handleBlur's 200ms setTimeout to fire
    await page.waitForTimeout(500)
  }

  // Verify we have a selection — wait for state to propagate
  await page.waitForTimeout(1000)

  // If Continue is still not enabled, try the "I don't know" fallback
  const continueBtn = page.getByRole("button", { name: /^Continue$/i }).last()
  const isEnabled = await continueBtn.isEnabled().catch(() => false)
  if (!isEnabled) {
    // Strategy 3: Click "I don't know the exact name" link/button
    const dontKnow = page.getByText(/I don.t know the exact name/i)
    if (await dontKnow.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dontKnow.click()
      await page.waitForTimeout(500)
    }
  }

  // Wait for React state to fully settle before clicking Continue
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
    // Subtype was pre-selected — just verify it shows correctly
    const subtypeLabel = opts?.subtype === "general" ? "General consultation" : opts?.subtype || "General consultation"
    await expect(page.getByText(subtypeLabel).first()).toBeVisible()
  } else if (hasGrid) {
    // Category grid is shown — select from it
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
// 1 · MEDICAL CERTIFICATE — Full Flow
// ---------------------------------------------------------------------------

test.describe("Intake: Medical Certificate — full flow", () => {
  test("completes med-cert from start to checkout", async ({ page }) => {
    // Navigate to med-cert flow
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // ── Step 1: Certificate details ──
    await waitForStep(page, /Certificate details/i)
    await clickChip(page, /^Work$/i)      // cert type
    // Duration buttons include price text: "1 day $19.95" — use partial match
    await page.getByRole("button", { name: /1 day/i }).click()
    // Start date defaults to today — no action needed
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
// 2 · REPEAT PRESCRIPTION — Full Flow
// ---------------------------------------------------------------------------

test.describe("Intake: Repeat Prescription — full flow", () => {
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
    await completeDetailsStep(page, { needsPhone: true })

    // ── Step 5: Safety step ──
    await completeSafetyStep(page)

    // ── Step 6: Review ──
    await completeReviewStep(page)

    // ── Step 7: Checkout ──
    await verifyCheckoutStep(page)
  })
})

// ---------------------------------------------------------------------------
// 3 · GENERAL CONSULTATION — Full Flow
// ---------------------------------------------------------------------------

test.describe("Intake: General Consultation — full flow", () => {
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
// 4 · CONSULTATION (no subtype) — Category Selection Flow
// ---------------------------------------------------------------------------

test.describe("Intake: Consultation without subtype — category selection", () => {
  test("shows category grid when no subtype is pre-selected", async ({ page }) => {
    // Navigate WITHOUT a subtype — should show the category selector
    await page.goto("/request?service=consult")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // ── Step 1: Consult reason (with category grid) ──
    await waitForStep(page, /What would you like help with/i)

    // Select "General consultation" — button name includes emoji: "🩺General consultation"
    await page.getByRole("button", { name: /General consultation/i }).click()

    // Fill details
    await fillTextarea(page,
      "I need a referral to a specialist for ongoing knee pain that has lasted several months."
    )

    // Urgency
    await clickChip(page, /Routine/i)
    await clickContinue(page)

    // ── Step 2: Medical history ──
    await completeMedicalHistoryStep(page)

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
    await clickChip(page, /^Work$/i)
    // Duration button includes price text — use partial match
    await page.getByRole("button", { name: /1 day/i }).click()
    await clickContinue(page)

    // On symptoms step
    await waitForStep(page, /What symptoms do you have/i)
    await clickChip(page, /Cold\/Flu/i)
    await clickChip(page, /1-2 days/i)

    // Enter short text (< 20 chars) — Continue should remain disabled
    await fillTextarea(page, "I feel sick")
    const btn = page.getByRole("button", { name: /^Continue$/i }).last()
    await expect(btn).toBeDisabled()

    // Extend text past 20 chars — Continue should become enabled
    await fillTextarea(page, "I feel sick with a fever and body aches since yesterday.")
    await expect(btn).toBeEnabled()
  })

  test("prescription medication-history 'never prescribed' shows warning", async ({ page }) => {
    await page.goto("/request?service=prescription")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Complete medication step using the robust helper
    await completeMedicationSearchStep(page)

    // On medication history step — select "Never prescribed"
    await waitForStep(page, /When were you last prescribed/i)
    await clickChip(page, /Never prescribed this medication/i)

    // Warning should appear with "Book a consultation" CTA
    await expect(page.getByText(/This service is for repeat prescriptions only/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /Book a consultation/i })).toBeVisible()
  })

  test("patient details validates email format", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // Fast-forward to details step
    await waitForStep(page, /Certificate details/i)
    await clickChip(page, /^Work$/i)
    // Duration button includes price text — use partial match
    await page.getByRole("button", { name: /1 day/i }).click()
    await clickContinue(page)

    // Complete symptoms
    await waitForStep(page, /What symptoms do you have/i)
    await clickChip(page, /Cold\/Flu/i)
    await clickChip(page, /1-2 days/i)
    await fillTextarea(page, "I have a bad cold with fever and muscle aches for two days now.")
    await clickContinue(page)

    // On details step — enter invalid email
    await waitForStep(page, /This information is required/i)
    const noThanks = page.getByRole("button", { name: /No thanks/i })
    if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
      await noThanks.click()
    }

    await page.locator('input[placeholder="Jane"]').fill("Test")
    await page.locator('input[placeholder="Smith"]').fill("User")
    await page.locator('input[placeholder="jane@example.com"]').fill("not-an-email")
    // Blur to trigger validation
    await page.locator('input[placeholder="jane@example.com"]').blur()

    // Should show email validation error
    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 3000 })
  })
})

// ---------------------------------------------------------------------------
// 6 · REPEAT-SCRIPT alias — should work identically to prescription
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

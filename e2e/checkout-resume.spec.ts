import { randomUUID } from "node:crypto"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"

import { expect, type Locator, type Page, test } from "@playwright/test"

import { signCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import {
  decryptJSONB,
  encryptJSONB,
  isEncryptedPHI,
} from "@/lib/security/phi-encryption"

import { loginAsPatient } from "./helpers/auth"
import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"

const HIGH_STAKES_ANSWERS = {
  certificateType: "study",
  symptomDetails: "I need an exam deferral certificate.",
}

const STALE_PLAINTEXT_ANSWERS = {
  certificateType: "work",
  symptomDetails: "Routine sick-day certificate for a mild cold.",
}

const B3_PROOF_DIR = "/tmp/instantmed-money-pages-sdd/proofs/task-2c-b3"
const PAYMENT_RECOVERY_ACTIONS = [
  "Resume secure checkout",
  "Complete payment",
  "Try payment again",
  "Retry payment",
  "Pay now",
] as const

function isStripeNavigation(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return hostname === "stripe.com" || hostname.endsWith(".stripe.com")
  } catch {
    return false
  }
}

async function prepareDarkMobilePage(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: "dark" })
  await page.addInitScript(() => {
    window.localStorage.setItem("theme", "dark")
  })
}

async function expectNoPaymentRecoveryActions(page: Page): Promise<void> {
  for (const actionName of PAYMENT_RECOVERY_ACTIONS) {
    const exactName = new RegExp(`^${actionName}$`, "i")
    await expect(page.getByRole("link", { name: exactName })).toHaveCount(0)
    await expect(page.getByRole("button", { name: exactName })).toHaveCount(0)
  }
  await expect(page.getByText("Opening secure checkout...", { exact: true })).toHaveCount(0)
}

async function expectKeyboardFocusVisible(page: Page, target: Locator): Promise<void> {
  await page.locator("body").evaluate((body) => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) activeElement.blur()

    body.setAttribute("tabindex", "-1")
    body.focus()
    body.removeAttribute("tabindex")
  })

  let reachedTarget = false
  for (let tabIndex = 0; tabIndex < 40; tabIndex += 1) {
    await page.keyboard.press("Tab")
    reachedTarget = await target.evaluate((element) => element === document.activeElement)
    if (reachedTarget) break
  }

  expect(reachedTarget).toBe(true)
  await expect(target).toBeFocused()
  await expect.poll(() => target.evaluate((element) => element.matches(":focus-visible"))).toBe(true)
  await expect(target).toHaveCSS("outline-style", "solid")
  await expect(target).toHaveCSS("outline-width", "2px")
  await expect(target).toHaveCSS("outline-offset", "2px")
}

async function expectSafeRecoveryActions(page: Page): Promise<void> {
  const freshRequest = page.getByRole("link", { name: "Start a fresh request", exact: true }).first()
  const contactSupport = page.getByRole("link", { name: "Contact support", exact: true }).first()

  await expect(freshRequest).toBeVisible()
  await expect(contactSupport).toBeVisible()
  await expect(freshRequest).toHaveCSS("height", "48px")
  await expect(contactSupport).toHaveCSS("height", "48px")
  await expectKeyboardFocusVisible(page, freshRequest)
  await expectKeyboardFocusVisible(page, contactSupport)

  const [freshBox, supportBox] = await Promise.all([
    freshRequest.boundingBox(),
    contactSupport.boundingBox(),
  ])
  expect(freshBox).not.toBeNull()
  expect(supportBox).not.toBeNull()
  if (!freshBox || !supportBox) return

  expect(freshBox.height).toBeGreaterThanOrEqual(48)
  expect(supportBox.height).toBeGreaterThanOrEqual(48)

  const overlaps = !(
    freshBox.x + freshBox.width <= supportBox.x ||
    supportBox.x + supportBox.width <= freshBox.x ||
    freshBox.y + freshBox.height <= supportBox.y ||
    supportBox.y + supportBox.height <= freshBox.y
  )
  expect(overlaps).toBe(false)
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
}

test.describe("Checkout recovery notices", () => {
  test("keeps an unresolved payment state non-actionable on mobile dark mode", async ({
    page,
  }) => {
    await prepareDarkMobilePage(page)
    await page.goto("/checkout/cancelled?reason=payment_state_unresolved")

    await expect(page).toHaveURL(/\/checkout\/cancelled\?reason=payment_state_unresolved$/)
    await expect(page.locator("html")).toHaveClass(/dark/)
    await expect(
      page.getByRole("heading", { name: "Please don’t try payment again yet" }),
    ).toBeVisible()
    await expect(page.getByText(/avoid a duplicate charge/i)).toBeVisible()
    await expect(page.getByText(/support can check the earlier payment state/i)).toBeVisible()

    for (const actionName of ["Contact support", "Return home"]) {
      await expect(page.getByRole("link", { name: actionName, exact: true })).toHaveCSS(
        "height",
        "48px",
      )
    }

    await expect(page.locator('a[href^="/request"], a[href^="/resume/"]')).toHaveCount(0)
  })

  test("does not claim payment success without exact completion proof", async ({ page }) => {
    await prepareDarkMobilePage(page)
    const missingIntakeId = randomUUID()

    await page.goto(
      `/auth/complete-account?intake_id=${missingIntakeId}&session_id=cs_missing`,
    )

    await expect(page.locator("html")).toHaveClass(/dark/)
    await expect(
      page.getByRole("heading", { name: "We can’t confirm payment yet" }),
    ).toBeVisible()
    await expect(page.getByText(/please don.t try payment again/i)).toBeVisible()
    await expect(page.getByText("Payment successful", { exact: true })).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: /create account|track request/i }),
    ).toHaveCount(0)

    for (const actionName of ["Contact support", "Return home"]) {
      await expect(page.getByRole("link", { name: actionName, exact: true })).toHaveCSS(
        "height",
        "48px",
      )
    }
  })
})

test.describe("Signed guest checkout resume safety", () => {
  test.skip(!isDbAvailable(), "Database required for signed checkout-resume E2E")

  let intakeId: string | null = null

  test.afterEach(async () => {
    if (!intakeId) return

    const cleanupIntakeId = intakeId
    const supabase = getSupabaseClient()
    const { error: auditCleanupError } = await supabase
      .from("safety_audit_log")
      .delete()
      .eq("request_id", cleanupIntakeId)

    await cleanupTestIntake(cleanupIntakeId)
    intakeId = null

    if (auditCleanupError) {
      throw new Error(`Could not clean checkout-resume safety audit: ${auditCleanupError.message}`)
    }
  })

  test("blocks encrypted high-stakes truth without handing out checkout or inviting a duplicate request", async ({
    page,
  }, testInfo) => {
    await prepareDarkMobilePage(page)

    expect(
      process.env.INTERNAL_API_SECRET,
      "INTERNAL_API_SECRET is required to sign the real checkout-resume token",
    ).toBeTruthy()

    const seeded = await seedTestIntake({
      category: "medical_certificate",
      payment_status: "unpaid",
      status: "pending_payment",
    })
    expect(seeded.success, seeded.error).toBe(true)
    expect(seeded.intakeId).toBeTruthy()
    intakeId = seeded.intakeId!

    const supabase = getSupabaseClient()
    const fixtureId = randomUUID()
    const encryptedAnswers = await encryptJSONB(HIGH_STAKES_ANSWERS)

    const { error: intakeUpdateError } = await supabase
      .from("intakes")
      .update({
        guest_email: `e2e-resume-${fixtureId}@instantmed-e2e.test`,
        payment_id: null,
        stripe_price_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    if (intakeUpdateError) {
      throw new Error(`Could not prepare signed checkout-resume intake: ${intakeUpdateError.message}`)
    }

    const { error: answersInsertError } = await supabase.from("intake_answers").insert({
      answers: STALE_PLAINTEXT_ANSWERS,
      answers_encrypted: encryptedAnswers,
      encryption_metadata: {
        encryptedAt: new Date().toISOString(),
        keyId: encryptedAnswers.keyId,
        version: encryptedAnswers.version,
      },
      intake_id: intakeId,
    })

    if (answersInsertError) {
      throw new Error(`Could not persist checkout-resume answers: ${answersInsertError.message}`)
    }

    const { data: persistedAnswers, error: answersReadError } = await supabase
      .from("intake_answers")
      .select("answers, answers_encrypted")
      .eq("intake_id", intakeId)
      .single()

    if (answersReadError || !persistedAnswers) {
      throw new Error(
        `Could not verify checkout-resume answers: ${answersReadError?.message || "missing row"}`,
      )
    }

    expect(persistedAnswers.answers).toEqual(STALE_PLAINTEXT_ANSWERS)
    expect(isEncryptedPHI(persistedAnswers.answers_encrypted)).toBe(true)
    if (!isEncryptedPHI(persistedAnswers.answers_encrypted)) {
      throw new Error("Persisted checkout-resume answers were not encrypted")
    }

    const decryptedAnswers = await decryptJSONB<Record<string, unknown>>(
      persistedAnswers.answers_encrypted,
    )
    expect(decryptedAnswers).toEqual(HIGH_STAKES_ANSWERS)
    expect(decryptedAnswers).not.toEqual(persistedAnswers.answers)

    const token = signCheckoutResumeToken(intakeId)
    const mainNavigationUrls: string[] = []
    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        mainNavigationUrls.push(request.url())
      }
    })

    await page.goto(`/resume/${encodeURIComponent(token)}`, {
      waitUntil: "domcontentloaded",
    })

    await page.waitForURL((url) => {
      return (
        url.pathname === "/checkout/cancelled" &&
        url.searchParams.get("reason") === "safety_blocked"
      )
    })

    const destination = new URL(page.url())
    const baseUrl = testInfo.project.use.baseURL
    expect(baseUrl, "Playwright baseURL should be configured").toBeTruthy()
    expect(destination.origin).toBe(new URL(baseUrl as string).origin)
    expect(Object.fromEntries(destination.searchParams.entries())).toEqual({
      reason: "safety_blocked",
    })
    expect(mainNavigationUrls.some(isStripeNavigation)).toBe(false)

    await expect(
      page.getByRole("heading", { name: /this request can.t continue online/i }),
    ).toBeVisible()
    await expect(page.locator("html")).toHaveClass(/dark/)
    await expect(page.getByText(/no payment is due/i)).toBeVisible()
    await expect(
      page.getByText(/contact support before submitting another request/i),
    ).toBeVisible()
    await expect(
      page.getByRole("link", {
        name: /resume secure checkout|complete payment|start a new request|get your certificate/i,
      }),
    ).toHaveCount(0)
    await expect(page.locator('a[href^="/request"], a[href^="/resume/"]')).toHaveCount(0)

    const { data: cancelledIntake, error: intakeReadError } = await supabase
      .from("intakes")
      .select(
        "id, status, payment_status, payment_id, cancelled_at, checkout_error, triage_result, triage_reasons, requires_live_consult, live_consult_reason",
      )
      .eq("id", intakeId)
      .single()

    if (intakeReadError || !cancelledIntake) {
      throw new Error(
        `Could not verify cancelled checkout-resume intake: ${intakeReadError?.message || "missing row"}`,
      )
    }

    expect(cancelledIntake).toMatchObject({
      checkout_error: "safety_blocked_high_stakes",
      live_consult_reason: null,
      payment_id: null,
      payment_status: "unpaid",
      requires_live_consult: false,
      status: "cancelled",
      triage_reasons: ["high_stakes_use_case"],
      triage_result: "decline",
    })
    expect(cancelledIntake.cancelled_at).toBeTruthy()

    const { data: retainedAnswers, error: retainedAnswersError } = await supabase
      .from("intake_answers")
      .select("id")
      .eq("intake_id", intakeId)
      .single()

    expect(retainedAnswersError).toBeNull()
    expect(retainedAnswers?.id).toBeTruthy()
  })

  test("projects a missing-information hold across patient recovery without retrying payment", async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(240_000)

    expect(
      process.env.INTERNAL_API_SECRET,
      "INTERNAL_API_SECRET is required to sign the real checkout-resume token",
    ).toBeTruthy()

    await mkdir(B3_PROOF_DIR, { recursive: true })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.emulateMedia({ colorScheme: "light" })

    const seeded = await seedTestIntake({
      category: "medical_certificate",
      payment_status: "unpaid",
      status: "pending_payment",
    })
    expect(seeded.success, seeded.error).toBe(true)
    expect(seeded.intakeId).toBeTruthy()
    intakeId = seeded.intakeId!

    const supabase = getSupabaseClient()
    const { error: holdFixtureError } = await supabase
      .from("intakes")
      .update({
        checkout_error: "safety_missing_required_information",
        live_consult_reason: "Required medical information is missing.",
        payment_id: null,
        payment_status: "unpaid",
        requires_live_consult: false,
        status: "checkout_failed",
        triage_reasons: ["missing_safety_fields"],
        triage_result: "request_more_info",
        updated_at: new Date().toISOString(),
      })
      .eq("id", intakeId)

    if (holdFixtureError) {
      throw new Error(`Could not prepare missing-information hold: ${holdFixtureError.message}`)
    }

    const stripeRequests: string[] = []
    const stripeMainNavigations: string[] = []
    const retryActionRequests: string[] = []
    const consoleErrors: string[] = []
    const pageErrors: string[] = []

    page.on("request", (request) => {
      if (isStripeNavigation(request.url())) {
        stripeRequests.push(request.url())
      }
      if (
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame() &&
        isStripeNavigation(request.url())
      ) {
        stripeMainNavigations.push(request.url())
      }
      if (
        request.url().includes("/api/patient/retry-payment") ||
        (request.method() === "POST" && Boolean(request.headers()["next-action"]))
      ) {
        retryActionRequests.push(request.url())
      }
    })
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text())
    })
    page.on("pageerror", (error) => pageErrors.push(error.message))
    await page.route(/https?:\/\/(?:[^/]+\.)?stripe\.com\/.*/, async (route) => {
      await route.abort("blockedbyclient")
    })

    const token = signCheckoutResumeToken(intakeId)
    await page.goto(`/resume/${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded" })
    await page.waitForURL((url) => (
      url.pathname === "/checkout/cancelled" &&
      url.searchParams.get("reason") === "more_information_required"
    ))

    const cancelledDestination = new URL(page.url())
    const baseUrl = testInfo.project.use.baseURL
    expect(baseUrl, "Playwright baseURL should be configured").toBeTruthy()
    expect(cancelledDestination.origin).toBe(new URL(baseUrl as string).origin)
    expect(Object.fromEntries(cancelledDestination.searchParams.entries())).toEqual({
      reason: "more_information_required",
    })
    await expect(page.locator("html")).not.toHaveClass(/dark/)
    await expect(page.getByRole("heading", {
      name: "We need a little more medical information before payment",
      exact: true,
    })).toBeVisible()
    await expectSafeRecoveryActions(page)
    await expectNoPaymentRecoveryActions(page)
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: join(B3_PROOF_DIR, "desktop-light-cancelled.png"),
    })

    const patientLogin = await loginAsPatient(page)
    expect(patientLogin.success, patientLogin.error).toBe(true)

    await page.goto("/patient", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", {
      name: "We need a little more medical information before payment.",
      exact: true,
    })).toBeVisible()
    await expect(page.getByText("More information needed", { exact: true }).first()).toBeVisible()
    await expectSafeRecoveryActions(page)
    await expectNoPaymentRecoveryActions(page)
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: join(B3_PROOF_DIR, "desktop-light-dashboard.png"),
    })

    const activityCard = page.getByRole("link", {
      name: /View E2E .*More information needed/i,
    }).first()
    await expect(activityCard).toBeVisible()
    await activityCard.click()
    const drawer = page.getByRole("dialog", { name: "Request Details" })
    await expect(drawer.getByText("More information needed", { exact: true })).toBeVisible()
    await expect(drawer.getByText(/start a fresh secure form/i)).toBeVisible()
    await expect(drawer.getByText("Try payment again", { exact: true })).toHaveCount(0)
    await drawer.getByRole("button", { name: "Close drawer" }).click()

    await page.goto(`/patient/intakes/${intakeId}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "More information needed", exact: true })).toBeVisible()
    await expectSafeRecoveryActions(page)
    await expectNoPaymentRecoveryActions(page)
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: join(B3_PROOF_DIR, "desktop-light-detail.png"),
    })

    const desktopRetryRequestCount = retryActionRequests.length
    await page.goto(`/patient/intakes/${intakeId}?retry=true`, { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "More information needed", exact: true })).toBeVisible()
    await page.waitForTimeout(250)
    expect(retryActionRequests).toHaveLength(desktopRetryRequestCount)
    await expectNoPaymentRecoveryActions(page)

    await page.goto("/patient/intakes", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("More information needed", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Checkout Failed", { exact: true })).toHaveCount(0)

    await prepareDarkMobilePage(page)
    await page.goto("/checkout/cancelled?reason=more_information_required", {
      waitUntil: "domcontentloaded",
    })
    await expect(page.locator("html")).toHaveClass(/dark/)
    await expectSafeRecoveryActions(page)
    await expectNoPaymentRecoveryActions(page)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: join(B3_PROOF_DIR, "mobile-dark-cancelled-390x844.png"),
    })

    await page.goto("/patient", { waitUntil: "domcontentloaded" })
    await expect(page.locator("html")).toHaveClass(/dark/)
    await expect(page.getByRole("heading", {
      name: "We need a little more medical information before payment.",
      exact: true,
    })).toBeVisible()
    await expectSafeRecoveryActions(page)
    await expectNoPaymentRecoveryActions(page)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: join(B3_PROOF_DIR, "mobile-dark-dashboard-390x844.png"),
    })

    const mobileActivityCard = page.getByRole("link", {
      name: /View E2E .*More information needed/i,
    }).first()
    await mobileActivityCard.click()
    const mobileDrawer = page.getByRole("dialog", { name: "Request Details" })
    await expect(mobileDrawer.getByText("More information needed", { exact: true })).toBeVisible()
    await expect(mobileDrawer.getByText("Try payment again", { exact: true })).toHaveCount(0)
    await mobileDrawer.getByRole("button", { name: "Close drawer" }).click()

    await page.goto(`/patient/intakes/${intakeId}`, { waitUntil: "domcontentloaded" })
    await expect(page.locator("html")).toHaveClass(/dark/)
    await expect(page.getByRole("heading", { name: "More information needed", exact: true })).toBeVisible()
    await expectSafeRecoveryActions(page)
    await expectNoPaymentRecoveryActions(page)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: join(B3_PROOF_DIR, "mobile-dark-detail-390x844.png"),
    })

    const mobileRetryRequestCount = retryActionRequests.length
    await page.goto(`/patient/intakes/${intakeId}?retry=true`, { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "More information needed", exact: true })).toBeVisible()
    await page.waitForTimeout(250)
    expect(retryActionRequests).toHaveLength(mobileRetryRequestCount)
    await expectNoPaymentRecoveryActions(page)
    await expectNoHorizontalOverflow(page)

    const { data: heldIntake, error: heldIntakeError } = await supabase
      .from("intakes")
      .select("status, payment_status, payment_id, checkout_error, triage_result, triage_reasons, requires_live_consult, live_consult_reason, cancelled_at, declined_at, expired_at, refunded_at")
      .eq("id", intakeId)
      .single()

    if (heldIntakeError || !heldIntake) {
      throw new Error(`Could not verify missing-information hold: ${heldIntakeError?.message || "missing row"}`)
    }

    expect(heldIntake).toMatchObject({
      cancelled_at: null,
      checkout_error: "safety_missing_required_information",
      declined_at: null,
      expired_at: null,
      live_consult_reason: "Required medical information is missing.",
      payment_id: null,
      payment_status: "unpaid",
      refunded_at: null,
      requires_live_consult: false,
      status: "checkout_failed",
      triage_reasons: ["missing_safety_fields"],
      triage_result: "request_more_info",
    })
    expect(stripeRequests).toEqual([])
    expect(stripeMainNavigations).toEqual([])
    expect(retryActionRequests).toEqual([])
    expect(consoleErrors).toEqual([])
    expect(pageErrors).toEqual([])
  })
})

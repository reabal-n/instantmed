import { randomUUID } from "node:crypto"

import { expect, type Page, test } from "@playwright/test"

import { signCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import {
  decryptJSONB,
  encryptJSONB,
  isEncryptedPHI,
} from "@/lib/security/phi-encryption"

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
})

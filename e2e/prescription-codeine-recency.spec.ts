import { randomUUID } from "node:crypto"

import { expect, type Page, test } from "@playwright/test"

import { loginAsTestUser, logoutTestUser } from "./helpers/auth"
import { getSupabaseClient, isDbAvailable } from "./helpers/db"
import { enterManualTestAddress, waitForPageLoad } from "./helpers/test-utils"

/**
 * Codeine combination repeat gate (operator decision 2026-09-19).
 *
 * A repeat request for Panadeine Forte inside 7 days of a prior codeine script
 * must stop BEFORE payment on both the guest and the signed-in checkout path:
 * no Stripe redirect, no intake, and the patient told why (signed in) or asked
 * to sign in (guest). The prior script is seeded against the shared E2E
 * patient and removed again afterwards.
 */

const PATIENT_PROFILE_ID = "e2e00000-0000-0000-0000-000000000002"
const PATIENT_EMAIL = "e2e-patient@test.instantmed.com.au"
const GUEST_BLOCK_COPY = "Please sign in to request this medicine again."

test.describe.configure({ mode: "serial" })

async function dismissOverlays(page: Page) {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 2000 }).catch(() => false)) {
    await essentialOnly.click()
    await page.waitForTimeout(300)
  }
  await page.evaluate(() => {
    const style = document.createElement("style")
    style.textContent = `
      [data-nextjs-dialog-overlay], [data-nextjs-toast],
      [class*="nextjs-portal"],
      button[aria-label="Open chat assistant"],
      [data-nextjs-dev-toolbar] { display: none !important; }
    `
    document.head.appendChild(style)
  })
}

async function waitForStep(page: Page, text: string | RegExp, timeout = 15000) {
  await expect(page.getByRole("heading", { name: text }).first()).toBeVisible({ timeout })
}

async function clickContinue(page: Page) {
  const primaryAction = page.locator('[data-intake-primary-action="true"]').last()
  await expect(primaryAction).toBeEnabled({ timeout: 5000 })
  await primaryAction.scrollIntoViewIfNeeded()
  await primaryAction.click()
}

async function completeMedicationStep(page: Page) {
  await waitForStep(page, /Your medication/i)
  await page.locator("#medication-name-0").fill("Panadeine Forte")
  await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })
  await page.locator("#medication-strength-0").fill("500 mg/30 mg")
  await page.getByRole("radio", { name: /Within 12 months/i }).click()
  await page.locator("#current-dose").fill("1 tablet twice daily")
  await page
    .getByRole("radiogroup", { name: "Same dose and directions as last time?" })
    .getByRole("radio", { name: "Same", exact: true })
    .click()
  await page.getByPlaceholder(/e\.g\. asthma/i).fill("back pain")
  await page
    .getByRole("radiogroup", { name: "Any side effects?" })
    .getByRole("radio", { name: "No", exact: true })
    .click()

  // The existing pre-payment likely-decline note for this brand must be
  // acknowledged before the step is ready; the recency gate sits behind it.
  const acknowledge = page.getByRole("button", { name: /I understand, continue/i })
  if (await acknowledge.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acknowledge.click()
  }
  await clickContinue(page)
  await page.waitForTimeout(500)
}

async function completeMedicalHistoryStep(page: Page) {
  await waitForStep(page, /Anything the doctor should know/i)
  await page.getByRole("button", { name: /None of these apply/i }).click()
  await clickContinue(page)
}

async function fillIfVisible(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
    await input.fill(value)
  }
}

async function completeDetailsStep(page: Page) {
  await waitForStep(page, /Your details/i)
  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noThanks.click()
  }
  // Names must pass the Unicode letters-only validator, so no "E2E" prefix.
  // The seeded patient is still matched through the email (guest profile
  // reuse) and, for the signed-in run, through the session itself.
  await fillIfVisible(page, 'input[placeholder="Jane"]', "Test")
  await fillIfVisible(page, 'input[placeholder="Smith"]', "Patient")
  await fillIfVisible(page, 'input[placeholder="jane@example.com"]', PATIENT_EMAIL)
  await fillIfVisible(page, 'input[placeholder="DD/MM/YYYY"]', "20/06/1990")
  await fillIfVisible(page, 'input[placeholder="0412 345 678"]', "0498765432")

  const sexTrigger = page.locator("#sex-select-trigger")
  if (await sexTrigger.isVisible({ timeout: 1500 }).catch(() => false)) {
    await sexTrigger.click()
    await page.getByRole("option", { name: /^Male$/i }).click()
  }

  const medicare = page.locator('input[placeholder="10 digits"]')
  if (await medicare.isVisible({ timeout: 1500 }).catch(() => false)) {
    await medicare.fill("2123456701")
    await medicare.blur()
    await page.waitForTimeout(200)
    await page.locator("#medicare-irn").fill("1")
  }

  await enterManualTestAddress(page)
  await clickContinue(page)
}

async function attemptPayment(page: Page) {
  await waitForStep(page, /One last check/i)
  const confirmButton = page.getByRole("button", { name: "Review & confirm" }).last()
  await expect(confirmButton).toBeEnabled()
  await confirmButton.click()

  const safetyCheckbox = page.locator("#safety-consent")
  await safetyCheckbox.scrollIntoViewIfNeeded()
  if (!(await safetyCheckbox.isChecked().catch(() => false))) {
    await safetyCheckbox.click()
  }

  const payButton = page.getByRole("button", { name: /^Pay \$/ }).last()
  await expect(payButton).toBeEnabled({ timeout: 5000 })
  await payButton.click()
}

test.describe("Prescription: codeine combination repeat inside 7 days", () => {
  test.skip(!isDbAvailable(), "Requires Supabase credentials to seed the prior script")
  test.setTimeout(120_000)

  const priorScriptId = randomUUID()

  test.beforeAll(async () => {
    const issuedDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { error } = await getSupabaseClient().from("prescriptions").insert({
      id: priorScriptId,
      patient_id: PATIENT_PROFILE_ID,
      medication_name: "Panadeine Forte",
      medication_strength: "500 mg/30 mg",
      status: "active",
      issued_date: issuedDate,
    })
    if (error) throw new Error(`Failed to seed prior codeine script: ${error.message}`)
  })

  test.afterAll(async () => {
    await getSupabaseClient().from("prescriptions").delete().eq("id", priorScriptId)
  })

  test("guest checkout that matches the patient is asked to sign in, and nothing is charged", async ({ page }) => {
    await logoutTestUser(page).catch(() => {})
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    await completeMedicationStep(page)
    await completeMedicalHistoryStep(page)
    await completeDetailsStep(page)
    await attemptPayment(page)

    await expect(page.getByRole("alert").filter({ hasText: GUEST_BLOCK_COPY })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole("link", { name: /Sign in to continue/i })).toBeVisible()
    await expect(page).toHaveURL(/\/request/)
    await expect(page.locator("iframe[src*='stripe']")).toHaveCount(0)
  })

  test("signed-in patient is stopped at the medication step with the request-again date", async ({ page }) => {
    const login = await loginAsTestUser(page, "patient")
    expect(login.success, login.error).toBe(true)

    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
    await dismissOverlays(page)

    // The early warning fires from the typed medicine alone; the checkout
    // gate behind it is covered by the guest run above and by unit tests.
    await waitForStep(page, /Your medication/i)
    await page.locator("#medication-name-0").fill("Panadeine Forte")
    await expect(page.locator("#medication-strength-0")).toBeVisible({ timeout: 5000 })
    await page.locator("#medication-strength-0").fill("500 mg/30 mg")

    const block = page.getByTestId("codeine-repeat-window-early-block")
    await expect(block).toBeVisible({ timeout: 20_000 })
    await expect(block).toContainText(/at most once every 7 days/i)
    await expect(block).toContainText(/You can request it again from/i)
    await expect(block).toContainText(/No payment is taken/i)
    // The likely-decline acknowledgement is moot while the window blocks.
    await expect(page.getByRole("button", { name: /I understand, continue/i })).toHaveCount(0)
    await expect(page.locator('button[data-intake-primary-action="true"]').last()).toHaveAttribute("data-intake-primary-ready", "false")
    await expect(page).toHaveURL(/\/request/)

    // Trigger the blocked summary, then replace the candidate while still blocked.
    await page.locator('button[data-intake-primary-action="true"]').last().click()
    const staleReason = page.getByText("This medicine was prescribed for you within the last 7 days, so it can't be requested again yet.", { exact: true })
    await expect(staleReason).toBeVisible()
    await page.locator("#medication-name-0").fill("Sertraline")
    await expect(block).toHaveCount(0)
    await expect(staleReason).toHaveCount(0)
    await page.locator("#medication-name-0").fill("Panadeine Forte")
    await expect(block).toBeVisible({ timeout: 20_000 })

    // A sleeping tab must release yesterday's advisory block at the allowed date.
    const realNow = new Date()
    await page.clock.install({ time: realNow })
    await page.clock.setSystemTime(new Date(realNow.getTime() + 8 * 24 * 60 * 60 * 1000))
    await page.clock.runFor(30_001)
    await expect(block).toHaveCount(0)
    await page.clock.setSystemTime(realNow)

    // A terminally unsupported product must never receive a request-again date.
    await page.locator("#medication-name-0").fill("codeine phosphate")
    await page.clock.runFor(600)
    await expect(block).toHaveCount(0)
    await expect(page.locator('button[data-intake-primary-action="true"]').last()).toHaveAttribute("data-intake-primary-ready", "false")

    await page.locator("#medication-name-0").fill("Sertraline")
    await expect(block).toHaveCount(0)
    await expect(page.getByText("This medicine was prescribed for you within the last 7 days, so it can't be requested again yet.", { exact: true })).toHaveCount(0)

    await logoutTestUser(page).catch(() => {})
  })
})

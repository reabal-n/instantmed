import { expect, type Page, test } from "@playwright/test"

import {
  generateTestAddress,
  generateTestMedicare,
  generateTestPhone,
  waitForPageLoad,
} from "./helpers/test-utils"

// General Consult was retired publicly on 2026-05-20 (see CLAUDE.md). The
// `consult` service type stays in code as the parent category for ED and
// hair-loss, but `general` is no longer an active hub action or URL flow.
const ACTIVE_CONSULT_SUBTYPES = ["ed", "hair_loss", "womens_health"] as const

async function clearDrafts(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem("instantmed-draft-med-cert")
    localStorage.removeItem("instantmed-draft-prescription")
    localStorage.removeItem("instantmed-draft-consult")
    localStorage.removeItem("instantmed-request-draft")
    localStorage.removeItem("instantmed-preferences")
  })
}

async function dismissOverlays(page: Page) {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 2000 }).catch(() => false)) {
    await essentialOnly.click()
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

async function clickContinue(page: Page) {
  let lastError: unknown

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const button = page.locator('button[data-intake-primary-action="true"]').last()
    try {
      await expect(button).toBeEnabled({ timeout: 5000 })
      await button.click()
      return
    } catch (error) {
      lastError = error
      await page.waitForTimeout(250)
    }
  }

  throw lastError
}

async function selectUtiCleanSafetyPath(page: Page) {
  await expect(page.getByText(/Which symptoms do you have/i)).toBeVisible({ timeout: 10000 })
  await page
    .getByRole("group", { name: /UTI symptoms/i })
    .getByRole("button", { name: /Burning or stinging/i })
    .click()
  await page
    .getByRole("radiogroup", { name: /fever, flank or back pain/i })
    .getByRole("radio", { name: /^No$/ })
    .click()
  await page
    .getByRole("radiogroup", { name: /pregnant/i })
    .getByRole("radio", { name: /^No$/ })
    .click()
}

async function completeConsultMedicalHistory(page: Page) {
  await expect(page.getByText(/Any allergies/i)).toBeVisible({ timeout: 10000 })
  await page.getByRole("radio", { name: /No allergies/i }).click()
  await page.getByRole("radio", { name: /No conditions/i }).click()
  await page.getByRole("radio", { name: /No medications/i }).click()
  await clickContinue(page)
}

async function completeConsultDetailsWithTestMedicare(page: Page) {
  const medicare = generateTestMedicare()
  const address = generateTestAddress()

  await expect(page.getByText(/Your details/i)).toBeVisible({ timeout: 10000 })

  const noThanks = page.getByRole("button", { name: /No thanks/i })
  if (await noThanks.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noThanks.click()
  }

  await page.locator('input[placeholder="Jane"]').fill("Test")
  await page.locator('input[placeholder="Smith"]').fill("Patient")
  await page.locator('input[placeholder="jane@example.com"]').fill("test@instantmed.com.au")
  await page.locator('input[placeholder="DD/MM/YYYY"]').fill("01/01/1990")
  await page.locator('input[placeholder="0412 345 678"]').fill(generateTestPhone())
  await page.locator("#sex-select-trigger").click()
  await page.getByRole("option", { name: /^Female$/i }).click()
  await page.locator('input[placeholder="10 digits"]').fill(medicare.number)
  await page.locator('input[placeholder="10 digits"]').blur()
  await page.getByRole("button", { name: new RegExp(`^${medicare.irn}$`) }).last().click()
  await page.locator('[placeholder="Start typing your address..."]').fill(address.line1)
  await page.locator("#suburb").fill(address.suburb)
  await page.locator("#state-select-trigger").click()
  await page.getByRole("option", { name: new RegExp(`^${address.state}$`, "i") }).click()
  await page.locator("#postcode").fill(address.postcode)

  await clickContinue(page)
}

async function expectEnabledWomensHealthCheckout(page: Page) {
  await expect(page.getByText(/One last check/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText("Total today")).toBeVisible()
  await expect(page.getByText("$49.95").first()).toBeVisible()
  const safetyCheckbox = page.locator("#safety-consent")
  if (await safetyCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await safetyCheckbox.click()
  }

  const reviewContinue = page.getByRole("button", { name: /Continue to payment/i })
  if (await reviewContinue.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(reviewContinue).toBeEnabled({ timeout: 5000 })
    await reviewContinue.click()
  }

  const payButton = page.getByRole("button", { name: /^Pay \$49\.95$/ }).last()
  await expect(payButton).toBeVisible({ timeout: 10000 })
  const checkoutConsent = page.locator("#consent-checkbox")
  if (await checkoutConsent.isVisible({ timeout: 5000 }).catch(() => false)) {
    const isChecked = await checkoutConsent.isChecked().catch(() => false)
    if (!isChecked) {
      await checkoutConsent.click()
    }
  }
  await expect(payButton).toBeEnabled({ timeout: 5000 })
  await expect(payButton).toHaveAttribute("aria-disabled", "false")
}

test.describe("Consult Sub-Services", () => {
  test.beforeEach(async ({ page }) => {
    await clearDrafts(page)
  })

  for (const subtype of ACTIVE_CONSULT_SUBTYPES) {
    test(`subtype=${subtype} renders an active consult request flow`, async ({ page }) => {
      await page.goto(`/request?service=consult&subtype=${subtype}`)
      await waitForPageLoad(page)

      await page.waitForURL(new RegExp(`service=consult.*subtype=${subtype}`), { timeout: 15000 })
      await expect(page.getByRole("heading", { name: /What brings you in today/i })).not.toBeVisible()
      await expect(page.getByRole("main")).toBeVisible()
    })
  }

  test("women's health is live; only weight management stays coming-soon", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)

    const comingSoonStrip = page.locator("[data-coming-soon-strip='true']")

    // Women's health launched 2026-06-15 - it is an active hub action now.
    await expect(page.getByRole("button", { name: /Women's health/i })).toBeVisible()
    await expect(comingSoonStrip.getByText("Women's health")).not.toBeVisible()
    // Weight management remains gated.
    await expect(page.getByRole("button", { name: /Weight management/i })).not.toBeVisible()
    await expect(comingSoonStrip.getByText("Weight management")).toBeVisible()
  })

  test("women's health UTI clean case advances past the safety screen", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)
    await page.waitForURL(/subtype=womens_health/, { timeout: 15000 })

    // Type step: only UTI + contraception are live; morning-after / period-pain
    // render as disabled "coming soon".
    await expect(page.getByText(/What do you need today/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole("radio", { name: /UTI symptoms/i }).click()
    await page.getByRole("button", { name: /^Continue$/i }).last().click()

    // UTI assessment: pick a symptom, no red flags, not pregnant.
    await selectUtiCleanSafetyPath(page)

    // Continue is enabled and the flow advances out of the assessment.
    const continueBtn = page.getByRole("button", { name: /^Continue$/i }).last()
    await expect(continueBtn).toBeEnabled({ timeout: 5000 })
    await continueBtn.click()
    await expect(page.getByText(/Which symptoms do you have/i)).not.toBeVisible({ timeout: 10000 })
  })

  test("women's health UTI clean case reaches enabled checkout with test Medicare", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)
    await dismissOverlays(page)
    await page.waitForURL(/subtype=womens_health/, { timeout: 15000 })

    await expect(page.getByText(/What do you need today/i)).toBeVisible({ timeout: 10000 })
    await page.getByRole("radio", { name: /UTI symptoms/i }).click()
    await clickContinue(page)

    await selectUtiCleanSafetyPath(page)
    await clickContinue(page)
    await completeConsultMedicalHistory(page)
    await completeConsultDetailsWithTestMedicare(page)
    await expectEnabledWomensHealthCheckout(page)
  })

  test("hub rows route to current active consult subtypes", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)

    await page.getByRole("button", { name: /Erectile dysfunction/i }).click()
    await page.waitForURL(/service=consult.*subtype=ed/, { timeout: 15000 })

    await page.goto("/request")
    await page.getByRole("button", { name: /Hair loss treatment/i }).click()
    await page.waitForURL(/service=consult.*subtype=hair_loss/, { timeout: 15000 })

    // General Consult was retired publicly on 2026-05-20, and the hub no longer
    // exposes a "General consultation" button. The /consult route renders a
    // services-overview page and /general-consult 301s into it. Do not
    // reintroduce an assertion for this without first updating
    // docs/BUSINESS_PLAN.md and the service hub copy.
  })

  test("subtype mismatch draft path does not crash", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=ed")
    await waitForPageLoad(page)

    await page.evaluate(() => {
      localStorage.setItem(
        "instantmed-draft-consult",
        JSON.stringify({
          state: {
            serviceType: "consult",
            currentStepId: "ed-assessment",
            lastSavedAt: new Date().toISOString(),
            answers: {
              consultSubtype: "ed",
              edOnset: "gradual",
            },
          },
        }),
      )
    })

    await page.goto("/request?service=consult&subtype=hair_loss")
    await waitForPageLoad(page)

    await expect(page.locator("body")).toBeVisible()
  })
})

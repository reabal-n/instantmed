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

function clearBrowserDrafts() {
  localStorage.removeItem("instantmed-draft-med-cert")
  localStorage.removeItem("instantmed-draft-prescription")
  localStorage.removeItem("instantmed-draft-consult")
  localStorage.removeItem("instantmed-request-draft")
  localStorage.removeItem("instantmed-preferences")
  localStorage.removeItem("instantmed-server-draft-med-cert")
  localStorage.removeItem("instantmed-server-draft-prescription")
  localStorage.removeItem("instantmed-server-draft-consult")
}

async function clearDrafts(page: Page) {
  await page.addInitScript(clearBrowserDrafts)
  await page.goto("/")
  await page.evaluate(clearBrowserDrafts)
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
      await expect(button).toHaveAttribute("data-intake-primary-ready", "true", { timeout: 5000 })
      await button.click()
      return
    } catch (error) {
      lastError = error
      await page.waitForTimeout(250)
    }
  }

  throw lastError
}

async function waitForIntakeStateToSettle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      }),
  )
}

async function ensureRadioChecked(page: Page, groupName: RegExp, radioName: RegExp) {
  const radio = page
    .getByRole("radiogroup", { name: groupName })
    .getByRole("radio", { name: radioName })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await radio.getAttribute("aria-checked").catch(() => null)) !== "true") {
      await radio.click()
    }

    try {
      await expect(radio).toHaveAttribute("aria-checked", "true", { timeout: 2000 })
      await waitForIntakeStateToSettle(page)
      return
    } catch (error) {
      if (attempt === 2) throw error
      await page.waitForTimeout(250)
    }
  }
}

async function ensureChipPressed(page: Page, groupName: RegExp, chipName: RegExp) {
  const chip = page
    .getByRole("group", { name: groupName })
    .getByRole("button", { name: chipName })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await chip.getAttribute("aria-pressed").catch(() => null)) !== "true") {
      await chip.click()
    }

    try {
      await expect(chip).toHaveAttribute("aria-pressed", "true", { timeout: 2000 })
      await waitForIntakeStateToSettle(page)
      return
    } catch (error) {
      if (attempt === 2) throw error
      await page.waitForTimeout(250)
    }
  }
}

async function selectUtiCleanSafetyPath(page: Page) {
  await expect(page.getByText(/Which symptoms do you have/i)).toBeVisible({ timeout: 10000 })
  await ensureChipPressed(page, /UTI symptoms/i, /Burning or stinging/i)
  await ensureRadioChecked(page, /fever, flank or back pain/i, /^No$/)
  await ensureRadioChecked(page, /pregnant/i, /^No$/)
}

async function completeConsultMedicalHistory(page: Page) {
  await expect(page.getByText(/Any allergies/i)).toBeVisible({ timeout: 10000 })
  await ensureRadioChecked(page, /Any allergies/i, /^None$/i)
  await ensureRadioChecked(page, /Any medical conditions/i, /No conditions/i)
  await ensureRadioChecked(page, /Taking any other medications/i, /No medications/i)
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
  // Unified review+pay step (2026-06-28): the single #safety-consent tick enables
  // the Pay CTA on the same screen — there is no separate "Continue to payment"
  // hand-off or second checkout step anymore.
  const safetyCheckbox = page.locator("#safety-consent")
  await expect(safetyCheckbox).toBeVisible({ timeout: 5000 })
  await safetyCheckbox.click()

  const payButton = page.getByRole("button", { name: /^Pay \$49\.95$/ }).last()
  await expect(payButton).toBeVisible({ timeout: 10000 })
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
    await clickContinue(page)
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

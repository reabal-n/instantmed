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
    const mobileButton = page
      .locator('[data-intake-mobile-action-bar="true"]')
      .getByRole("button")
      .last()
    const useMobileButton = await mobileButton.isVisible().catch(() => false)
    const button = useMobileButton
      ? mobileButton
      : page.locator('button[data-intake-primary-action="true"]').last()

    try {
      await expect(button).toBeEnabled({ timeout: 5000 })
      await expect(button).toHaveAttribute(
        useMobileButton ? "data-intake-mobile-action-ready" : "data-intake-primary-ready",
        "true",
        { timeout: 5000 },
      )
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

async function completeConsultDetailsWithTestMedicare(
  page: Page,
  sex: "Female" | "Male",
) {
  const medicare = generateTestMedicare()
  const address = generateTestAddress()

  await expect(page.getByRole("heading", { name: "Your details", level: 2 })).toBeVisible({ timeout: 10000 })

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
  await page.getByRole("option", { name: new RegExp(`^${sex}$`, "i") }).click()
  await page.locator('input[placeholder="10 digits"]').fill(medicare.number)
  await page.locator('input[placeholder="10 digits"]').blur()
  await page.locator("#medicare-irn").fill(medicare.irn)
  await page.locator('[placeholder="Start typing your address..."]').fill(address.line1)
  await page.locator("#suburb").fill(address.suburb)
  await page.locator("#state-select-trigger").click()
  await page.getByRole("option", { name: new RegExp(`^${address.state}$`, "i") }).click()
  await page.locator("#postcode").fill(address.postcode)

  await clickContinue(page)
}

async function expectConsultPayState(page: Page, ready: boolean) {
  const canonicalPayButton = page.locator('button[data-intake-primary-action="true"]').last()
  await expect(canonicalPayButton).toHaveAttribute(
    "data-intake-primary-ready",
    ready ? "true" : "false",
  )
  await expect(canonicalPayButton).toHaveAttribute(
    "aria-disabled",
    ready ? "false" : "true",
  )

  const mobileActionBar = page.locator('[data-intake-mobile-action-bar="true"]')
  if (await mobileActionBar.isVisible().catch(() => false)) {
    const mobilePayButton = mobileActionBar.getByRole("button", { name: /^Pay \$49\.95$/ })
    await expect(mobilePayButton).toBeVisible()
    await expect(mobilePayButton).toHaveAttribute(
      "data-intake-mobile-action-ready",
      ready ? "true" : "false",
    )
    // Even while not ready, the review action stays natively clickable so it
    // can focus the missing-consent guidance. Readiness is the source of truth.
    await expect(mobilePayButton).toBeEnabled()
  } else {
    await expect(canonicalPayButton).toBeVisible()
  }
}

async function expectEnabledConsultCheckout(page: Page) {
  await expect(page.getByText(/One last check/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByText("Total today")).toBeVisible()
  await expect(page.getByText("$49.95").first()).toBeVisible()
  // Unified review+pay step (2026-06-28): the single #safety-consent tick enables
  // the Pay CTA on the same screen — there is no separate "Continue to payment"
  // hand-off or second checkout step anymore.
  const safetyCheckbox = page.locator("#safety-consent")
  await expect(safetyCheckbox).toBeVisible({ timeout: 5000 })
  await safetyCheckbox.click()

  await expectConsultPayState(page, true)
}

async function selectEdSafePath(page: Page) {
  await expect(page.getByText(/What matters most right now/i)).toBeVisible({ timeout: 10000 })

  const ageConfirmation = page.getByRole("switch", {
    name: /I confirm I am 18 years or older/i,
  })
  await ageConfirmation.click()
  await expect(ageConfirmation).toBeChecked()

  await ensureRadioChecked(page, /Treatment goal/i, /Improve erections/i)
  await ensureRadioChecked(page, /How long this has been a concern/i, /< 3 months/i)
  await clickContinue(page)

  await expect(page.getByText(/A few questions about your experience/i)).toBeVisible({ timeout: 10000 })
  for (let question = 1; question <= 5; question += 1) {
    await ensureRadioChecked(page, new RegExp(`^iief${question}$`, "i"), /^3 out of 5$/i)
  }
  await clickContinue(page)

  await expect(page.getByText(/A quick safety check/i)).toBeVisible({ timeout: 10000 })
  for (const groupName of [
    /Do you take nitrates/i,
    /Do you take alpha-blockers/i,
    /Heart attack, stroke, or unstable angina/i,
    /Severe heart disease, very low blood pressure, or HOCM/i,
    /Taking any medications/i,
    /Any allergies/i,
    /Any other medical conditions/i,
    /Have you tried ED treatment before/i,
  ]) {
    await ensureRadioChecked(page, groupName, /^No$/i)
  }
  await clickContinue(page)

  await expect(page.getByText(/How should treatment fit your life/i)).toBeVisible({ timeout: 10000 })
  await ensureRadioChecked(page, /Treatment preference/i, /Let the doctor decide/i)
  await clickContinue(page)
}

async function selectHairLossSafePath(page: Page) {
  await expect(page.getByText(/What matters most right now/i)).toBeVisible({ timeout: 10000 })
  await ensureRadioChecked(page, /Hair loss goal/i, /Both \(stop \+ regrow\)/i)
  await ensureRadioChecked(page, /When did you first notice changes/i, /Under 6 months/i)
  await clickContinue(page)

  await expect(page.getByText(/Which pattern looks closest/i)).toBeVisible({ timeout: 10000 })
  await ensureRadioChecked(page, /Hair loss pattern/i, /Thinning \/ recession/i)
  await ensureRadioChecked(page, /family history of hair loss/i, /No or not sure/i)
  await clickContinue(page)

  await expect(page.getByText(/A quick safety check/i)).toBeVisible({ timeout: 10000 })
  await ensureRadioChecked(page, /Partner pregnancy or conception status/i, /^N\/A$/i)
  await ensureRadioChecked(page, /Low blood pressure or dizziness on standing/i, /^No$/i)
  await ensureRadioChecked(page, /heart conditions or heart medication/i, /^No$/i)
  await ensureChipPressed(page, /Scalp conditions/i, /^None$/i)
  await ensureRadioChecked(page, /Taking any medications/i, /^No$/i)
  await ensureRadioChecked(page, /Any allergies/i, /^No$/i)
  await ensureRadioChecked(page, /Any other medical conditions/i, /^No$/i)
  await clickContinue(page)

  await expect(page.getByText(/How should treatment fit your routine/i)).toBeVisible({ timeout: 10000 })
  await ensureRadioChecked(page, /Treatment preference/i, /Let the doctor decide/i)
  await clickContinue(page)
}

async function selectNewPillSafePath(page: Page) {
  await expect(page.getByText(/What do you need today/i)).toBeVisible({ timeout: 10000 })
  await ensureRadioChecked(page, /Women's health option/i, /Start or switch pill/i)
  await clickContinue(page)

  await expect(page.getByText(/A few safety checks/i)).toBeVisible({ timeout: 10000 })
  await ensureRadioChecked(page, /What would you like/i, /^Start$/i)
  await ensureRadioChecked(page, /currently using contraception/i, /^None$/i)
  await ensureRadioChecked(page, /pregnant or could you be pregnant/i, /^No$/i)
  await ensureRadioChecked(page, /migraines with aura/i, /^No$/i)
  await ensureRadioChecked(page, /blood clot/i, /^No$/i)
  await ensureRadioChecked(page, /Do you smoke/i, /^No$/i)
  await clickContinue(page)

  await completeConsultMedicalHistory(page)
}

async function expectFreshConfirmedPregnancyTerminalBlock(page: Page) {
  await page.goto("/request?service=consult&subtype=womens_health")
  await waitForPageLoad(page)
  await dismissOverlays(page)
  await page.waitForURL(/subtype=womens_health/, { timeout: 15000 })

  await ensureRadioChecked(page, /Women's health option/i, /Start or switch pill/i)
  await clickContinue(page)
  await expect(page.getByText(/A few safety checks/i)).toBeVisible({ timeout: 10000 })

  await ensureRadioChecked(page, /What would you like/i, /^Start$/i)
  await ensureRadioChecked(page, /currently using contraception/i, /^None$/i)
  await page
    .getByRole("radiogroup", { name: /pregnant or could you be pregnant/i })
    .getByRole("radio", { name: "Yes", exact: true })
    .click()

  const title = page.getByText("This service is not suitable during pregnancy")
  const reason = page.getByText(/The contraceptive pill is not started during pregnancy/i)
  await expect(title).toBeVisible({ timeout: 10000 })
  await expect(reason).toBeVisible()
  await expect(reason).toHaveCSS("font-size", "16px")
  await expect(page.locator('button[data-intake-primary-action="true"]')).toHaveCount(0)
  await expect(page.locator('[data-intake-mobile-action-bar="true"]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  const terminalActions = page.getByRole("main")
  for (const actionName of ["Return home", "I need to correct this answer", "Go back"]) {
    await expect(terminalActions.getByRole("button", { name: actionName, exact: true })).toHaveCSS("height", "48px")
  }

  await terminalActions.getByRole("button", { name: "I need to correct this answer", exact: true }).click()
  await expect(page.getByRole("heading", { name: "A few safety checks" })).toBeVisible()
  await expect(title).toHaveCount(0)
  await expect(reason).toHaveCount(0)

  const pregnancyGroup = page.getByRole("radiogroup", { name: /pregnant or could you be pregnant/i })
  await expect(pregnancyGroup.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
  await expect(pregnancyGroup.getByRole("radio", { name: "Not sure", exact: true })).toHaveAttribute("aria-checked", "false")
  await expect(pregnancyGroup.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
}

async function expectReviewAttestationEditContract(page: Page) {
  const safetyCheckbox = page.locator("#safety-consent")

  const editDetails = page.getByRole("button", { name: /^Edit Your Details$/i })
  await expect(editDetails).toHaveCount(1)
  await expect(editDetails).toBeVisible()
  await editDetails.click()
  await expect(page.getByRole("heading", { name: "Your details", level: 2 })).toBeVisible({ timeout: 10000 })
  await clickContinue(page)

  await expect(page.getByText(/One last check/i)).toBeVisible({ timeout: 10000 })
  await expect(safetyCheckbox).toBeChecked()
  await expectConsultPayState(page, true)

  await expect(editDetails).toHaveCount(1)
  await expect(editDetails).toBeVisible()
  await editDetails.click()
  await expect(page.getByRole("heading", { name: "Your details", level: 2 })).toBeVisible({ timeout: 10000 })
  await page.locator('input[placeholder="Smith"]').fill("Updated")
  await clickContinue(page)

  await expect(page.getByText(/One last check/i)).toBeVisible({ timeout: 10000 })
  await expect(safetyCheckbox).not.toBeChecked()
  await expectConsultPayState(page, false)
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

  test("new-pill safety controls start neutral and keep Continue not ready", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)
    await page.waitForURL(/subtype=womens_health/, { timeout: 15000 })

    await expect(page.getByText(/What do you need today/i)).toBeVisible({ timeout: 10000 })
    await ensureRadioChecked(page, /Women's health option/i, /Start or switch pill/i)
    await clickContinue(page)

    await expect(page.getByText(/A few safety checks/i)).toBeVisible({ timeout: 10000 })

    const pregnancyGroup = page.getByRole("radiogroup", { name: /pregnant or could you be pregnant/i })
    await expect(pregnancyGroup.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(pregnancyGroup.getByRole("radio", { name: "Not sure", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(pregnancyGroup.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")

    for (const groupName of [/migraines with aura/i, /blood clot/i, /Do you smoke/i]) {
      const group = page.getByRole("radiogroup", { name: groupName })
      await expect(group.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
      await expect(group.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")
    }

    await expect(page.locator('button[data-intake-primary-action="true"]').last()).toHaveAttribute(
      "data-intake-primary-ready",
      "false",
    )
  })

  test("confirmed pregnancy hard-stops a fresh pill request and correction returns neutral", async ({ page }) => {
    await expectFreshConfirmedPregnancyTerminalBlock(page)
  })

  test("confirmed pregnancy hard-stops a fresh pill request at 390x844 without a sticky action", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await expectFreshConfirmedPregnancyTerminalBlock(page)
  })

  test("an invalid persisted pill safety value stays neutral and keeps Continue not ready", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("instantmed-draft-consult", JSON.stringify({
        serviceType: "consult",
        currentStepId: "womens-health-assessment",
        answers: {
          consultSubtype: "womens_health",
          womensHealthOption: "ocp_new",
          contraceptionType: "start",
          contraceptionCurrent: "none",
          pregnancyStatus: "no",
          womens_migraine_aura: "no",
          womens_blood_clot_history: "no",
          womens_smoker: "legacy-value",
        },
        lastSavedAt: new Date().toISOString(),
      }))
    })

    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)

    const smokingGroup = page.getByRole("radiogroup", { name: /Do you smoke/i })
    await expect(smokingGroup.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(smokingGroup.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(page.locator('button[data-intake-primary-action="true"]').last()).toHaveAttribute(
      "data-intake-primary-ready",
      "false",
    )
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
    await completeConsultDetailsWithTestMedicare(page, "Female")
    await expectEnabledConsultCheckout(page)
    await expectReviewAttestationEditContract(page)
  })

  test("ED safe guest case reaches enabled checkout with test Medicare", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=ed")
    await waitForPageLoad(page)
    await dismissOverlays(page)
    await page.waitForURL(/subtype=ed/, { timeout: 15000 })

    await selectEdSafePath(page)
    await completeConsultDetailsWithTestMedicare(page, "Male")
    await expectEnabledConsultCheckout(page)
  })

  test("hair-loss safe guest case reaches enabled checkout with test Medicare", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=hair_loss")
    await waitForPageLoad(page)
    await dismissOverlays(page)
    await page.waitForURL(/subtype=hair_loss/, { timeout: 15000 })

    await selectHairLossSafePath(page)
    await completeConsultDetailsWithTestMedicare(page, "Male")
    await expectEnabledConsultCheckout(page)
  })

  test("women's health new-pill safe guest case reaches enabled checkout with test Medicare", async ({ page }) => {
    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)
    await dismissOverlays(page)
    await page.waitForURL(/subtype=womens_health/, { timeout: 15000 })

    await selectNewPillSafePath(page)
    await completeConsultDetailsWithTestMedicare(page, "Female")
    await expectEnabledConsultCheckout(page)
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

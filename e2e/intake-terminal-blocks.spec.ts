import { expect, type Page, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

type ScopedDraftSeed = {
  serviceType: "consult" | "prescription"
  currentStepId: string
  answers: Record<string, unknown>
}

async function seedScopedDraft(
  page: Page,
  key: "instantmed-draft-consult" | "instantmed-draft-prescription",
  seed: ScopedDraftSeed,
): Promise<void> {
  await page.addInitScript(({ draftKey, draft }) => {
    localStorage.removeItem("instantmed-request-draft")
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        ...draft,
        lastSavedAt: new Date().toISOString(),
      }),
    )
  }, { draftKey: key, draft: seed })
}

async function dismissCookieBanner(page: Page): Promise<void> {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await essentialOnly.click()
  }
}

async function clickContinue(page: Page): Promise<void> {
  const mobileAction = page
    .locator('[data-intake-mobile-action-bar="true"]')
    .getByRole("button")
    .last()
  if (await mobileAction.isVisible().catch(() => false)) {
    await expect(mobileAction).toBeEnabled()
    await expect(mobileAction).toHaveAttribute("data-intake-mobile-action-ready", "true")
    await mobileAction.click()
    return
  }

  const canonicalAction = page.locator('button[data-intake-primary-action="true"]').last()
  await expect(canonicalAction).toHaveAttribute("data-intake-primary-ready", "true")
  await canonicalAction.click()
}

async function exercisePersistedPillRedirect(
  page: Page,
  options: { mobileDark: boolean },
): Promise<void> {
  const browserErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console: ${message.text()}`)
  })
  page.on("pageerror", (error) => {
    browserErrors.push(`pageerror: ${error.message}`)
  })

  if (options.mobileDark) {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: "dark" })
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark")
    })
  }

  await seedScopedDraft(page, "instantmed-draft-consult", {
    serviceType: "consult",
    currentStepId: "womens-health-assessment",
    answers: {
      consultSubtype: "womens_health",
      womensHealthOption: "ocp_new",
      contraceptionType: "start",
      contraceptionCurrent: "none",
      pregnancyStatus: "not_sure",
      requiresCall: true,
      womens_migraine_aura: "yes",
      womens_blood_clot_history: "yes",
      womens_smoker: "yes",
      lastPeriod: "2 weeks ago",
    },
  })

  await page.goto("/request?service=consult&subtype=womens_health")
  await waitForPageLoad(page)

  const title = page.getByText("This paid pathway cannot continue")
  await expect(title).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/Pregnancy needs to be ruled out/i)).toBeVisible()
  await expect(page.getByText(/migraines with aura/i)).toBeVisible()
  await expect(page.getByText(/blood clot/i)).toBeVisible()
  await expect(page.getByText(/Smoking changes which contraceptive pills may be safe/i)).toBeVisible()
  await expect(page.getByText(/doctor will (call|contact)/i)).toHaveCount(0)
  await expect(page.locator('button[data-intake-primary-action="true"]')).toHaveCount(0)
  await expect(page.locator('[data-intake-mobile-action-bar="true"]')).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: "I need to correct these answers", exact: true }),
  ).toHaveCSS("height", "48px")

  if (options.mobileDark) {
    await expect(page.locator("html")).toHaveClass(/dark/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  await page.reload()
  await waitForPageLoad(page)
  await dismissCookieBanner(page)

  await expect(title).toBeVisible({ timeout: 15_000 })
  await page.getByRole("button", { name: "I need to correct these answers", exact: true }).click()

  await expect(page.getByRole("heading", { name: "A few safety checks" })).toBeVisible()
  await expect(title).toHaveCount(0)

  const pregnancyGroup = page.getByRole("radiogroup", { name: /pregnant or could you be pregnant/i })
  for (const label of ["No", "Not sure", "Yes"]) {
    await expect(pregnancyGroup.getByRole("radio", { name: label, exact: true })).toHaveAttribute(
      "aria-checked",
      "false",
    )
  }

  for (const groupName of [/migraines with aura/i, /blood clot/i, /Do you smoke/i]) {
    const group = page.getByRole("radiogroup", { name: groupName })
    await expect(group.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(group.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")
  }

  await expect(
    page
      .getByRole("radiogroup", { name: /What would you like/i })
      .getByRole("radio", { name: "Start", exact: true }),
  ).toHaveAttribute("aria-checked", "true")
  await expect(page.locator("#womens-last-period")).toHaveValue("2 weeks ago")

  await expect.poll(async () => page.evaluate(() => {
    const rawDraft = localStorage.getItem("instantmed-draft-consult")
    const answers = rawDraft
      ? (JSON.parse(rawDraft) as { answers?: Record<string, unknown> }).answers ?? {}
      : {}
    const clearedKeys = [
      "pregnancyStatus",
      "requiresCall",
      "womens_migraine_aura",
      "womens_blood_clot_history",
      "womens_smoker",
    ]

    return {
      cleared: clearedKeys.every((key) => !Object.prototype.hasOwnProperty.call(answers, key)),
      lastPeriod: answers.lastPeriod,
    }
  })).toEqual({ cleared: true, lastPeriod: "2 weeks ago" })

  expect(browserErrors, `Unexpected browser errors:\n${browserErrors.join("\n\n")}`).toEqual([])
}

test.describe("persisted intake terminal blocks", () => {
  test("restores the ED nitrate block after resume and full reload", async ({ page }) => {
    await seedScopedDraft(page, "instantmed-draft-consult", {
      serviceType: "consult",
      currentStepId: "ed-health",
      answers: {
        consultSubtype: "ed",
        edNitrates: true,
      },
    })

    await page.goto("/request?service=consult&subtype=ed")
    await waitForPageLoad(page)

    await expect(page.getByText("This service is not suitable for you")).toBeVisible({ timeout: 15_000 })
    const nitrateExplanation = page.getByText(/dangerous drop in blood pressure/i)
    await expect(nitrateExplanation).toBeVisible()
    await expect(nitrateExplanation).toHaveCSS("font-size", "16px")

    await page.reload()
    await waitForPageLoad(page)

    await expect(page.getByText("This service is not suitable for you")).toBeVisible({ timeout: 15_000 })
    await dismissCookieBanner(page)
    for (const actionName of ["Return home", "I need to correct this answer"]) {
      await expect(page.getByRole("button", { name: actionName, exact: true })).toHaveCSS("height", "48px")
    }
    await page.getByRole("button", { name: "I need to correct this answer", exact: true }).click()

    await expect(page.getByRole("heading", { name: "A quick safety check" })).toBeVisible()
    await expect(
      page
        .getByRole("radiogroup", { name: "Do you take nitrates?" })
        .getByRole("radio", { name: "No" }),
    ).toHaveAttribute("aria-checked", "true")
  })

  test("restores UTI red-flag priority after reload and back, then clears active triggers to unanswered", async ({ page }) => {
    await seedScopedDraft(page, "instantmed-draft-consult", {
      serviceType: "consult",
      currentStepId: "womens-health-assessment",
      answers: {
        consultSubtype: "womens_health",
        womensHealthOption: "uti",
        utiSymptoms: ["burning"],
        utiRedFlags: "yes",
        utiPregnant: "not_sure",
      },
    })

    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)

    await expect(page.getByText("Please seek urgent care")).toBeVisible({ timeout: 15_000 })
    const kidneyInfectionExplanation = page.getByText(/kidney infection/i)
    await expect(kidneyInfectionExplanation).toBeVisible()
    await expect(kidneyInfectionExplanation).toHaveCSS("font-size", "16px")
    for (const actionName of ["Return home", "I need to correct these answers"]) {
      await expect(page.getByRole("button", { name: actionName, exact: true })).toHaveCSS("height", "48px")
    }
    await expect(page.getByRole("main").getByText("Go back", { exact: true })).toHaveCSS("height", "48px")
    await expect(page.getByText(/UTIs during pregnancy need in-person assessment/i)).toHaveCount(0)

    await page.reload()
    await waitForPageLoad(page)
    await dismissCookieBanner(page)

    await expect(kidneyInfectionExplanation).toBeVisible({ timeout: 15_000 })
    await page.getByRole("main").getByRole("button", { name: "Go back" }).click()
    await expect(page.getByRole("heading", { name: "What do you need today?" })).toBeVisible()

    await clickContinue(page)
    await expect(page.getByText(/kidney infection/i)).toBeVisible({ timeout: 10_000 })

    await page.getByRole("button", { name: "I need to correct these answers" }).click()
    await expect(page.getByRole("heading", { name: "Check this is safe for telehealth" })).toBeVisible()

    const redFlagGroup = page.getByRole("radiogroup", { name: /Fever, flank or back pain/i })
    await expect(redFlagGroup.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(redFlagGroup.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")

    const pregnancyGroup = page.getByRole("radiogroup", { name: "Pregnant or possibly pregnant?" })
    await expect(pregnancyGroup.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(pregnancyGroup.getByRole("radio", { name: "Not sure", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(pregnancyGroup.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")
  })

  test("restores a pregnancy-only UTI block and clears only the pregnancy answer", async ({ page }) => {
    await seedScopedDraft(page, "instantmed-draft-consult", {
      serviceType: "consult",
      currentStepId: "womens-health-assessment",
      answers: {
        consultSubtype: "womens_health",
        womensHealthOption: "uti",
        utiSymptoms: ["burning"],
        utiRedFlags: "no",
        utiPregnant: "not_sure",
      },
    })

    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)

    const pregnancyExplanation = page.getByText(/UTIs during pregnancy need in-person assessment/i)
    await expect(pregnancyExplanation).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/kidney infection/i)).toHaveCount(0)

    await page.reload()
    await waitForPageLoad(page)
    await dismissCookieBanner(page)

    await expect(pregnancyExplanation).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "I need to correct this answer" }).click()

    await expect(page.getByRole("heading", { name: "Check this is safe for telehealth" })).toBeVisible()
    await expect(pregnancyExplanation).toHaveCount(0)
    await expect(page.getByText("Please seek urgent care")).toHaveCount(0)

    const redFlagGroup = page.getByRole("radiogroup", { name: /Fever, flank or back pain/i })
    await expect(redFlagGroup.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "true")
    await expect(redFlagGroup.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")

    const pregnancyGroup = page.getByRole("radiogroup", { name: "Pregnant or possibly pregnant?" })
    await expect(pregnancyGroup.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(pregnancyGroup.getByRole("radio", { name: "Not sure", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(pregnancyGroup.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")
  })

  test("restores a confirmed-pregnancy pill block and clears pregnancy plus stale call state", async ({ page }) => {
    await seedScopedDraft(page, "instantmed-draft-consult", {
      serviceType: "consult",
      currentStepId: "womens-health-assessment",
      answers: {
        consultSubtype: "womens_health",
        womensHealthOption: "ocp_new",
        contraceptionType: "start",
        contraceptionCurrent: "none",
        pregnancyStatus: "yes",
        requiresCall: true,
        womens_migraine_aura: "no",
        womens_blood_clot_history: "no",
        womens_smoker: "no",
      },
    })

    await page.goto("/request?service=consult&subtype=womens_health")
    await waitForPageLoad(page)

    const pregnancyExplanation = page.getByText(
      /The contraceptive pill is not started during pregnancy/i,
    )
    await expect(page.getByText("This service is not suitable during pregnancy")).toBeVisible({ timeout: 15_000 })
    await expect(pregnancyExplanation).toBeVisible()

    await page.reload()
    await waitForPageLoad(page)
    await dismissCookieBanner(page)

    await expect(pregnancyExplanation).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: "I need to correct this answer" }).click()

    await expect(page.getByRole("heading", { name: "A few safety checks" })).toBeVisible()
    await expect(pregnancyExplanation).toHaveCount(0)
    await expect(page.getByText("This service is not suitable during pregnancy")).toHaveCount(0)

    const pregnancyGroup = page.getByRole("radiogroup", { name: /pregnant or could you be pregnant/i })
    await expect(pregnancyGroup.getByRole("radio", { name: "No", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(pregnancyGroup.getByRole("radio", { name: "Not sure", exact: true })).toHaveAttribute("aria-checked", "false")
    await expect(pregnancyGroup.getByRole("radio", { name: "Yes", exact: true })).toHaveAttribute("aria-checked", "false")

    await expect(
      page
        .getByRole("radiogroup", { name: /What would you like/i })
        .getByRole("radio", { name: "Start", exact: true }),
    ).toHaveAttribute("aria-checked", "true")
    await expect(
      page
        .getByRole("radiogroup", { name: /currently using contraception/i })
        .getByRole("radio", { name: "None", exact: true }),
    ).toHaveAttribute("aria-checked", "true")

    for (const groupName of [/migraines with aura/i, /blood clot/i, /Do you smoke/i]) {
      await expect(
        page
          .getByRole("radiogroup", { name: groupName })
          .getByRole("radio", { name: "No", exact: true }),
      ).toHaveAttribute("aria-checked", "true")
    }

    await expect.poll(async () => page.evaluate(() => {
      const rawDraft = localStorage.getItem("instantmed-draft-consult")
      const answers = rawDraft
        ? (JSON.parse(rawDraft) as { answers?: Record<string, unknown> }).answers ?? {}
        : {}

      return {
        hasPregnancyStatus: Object.prototype.hasOwnProperty.call(answers, "pregnancyStatus"),
        hasRequiresCall: Object.prototype.hasOwnProperty.call(answers, "requiresCall"),
      }
    })).toEqual({
      hasPregnancyStatus: false,
      hasRequiresCall: false,
    })
  })

  for (const mode of [
    { label: "desktop", mobileDark: false },
    { label: "390x844 dark mode", mobileDark: true },
  ]) {
    test(`restores a multi-trigger pill redirect at ${mode.label} and clears every active answer`, async ({ page }) => {
      await exercisePersistedPillRedirect(page, mode)
    })
  }

  test("restores a controlled repeat-medication block and removes it after a safe edit", async ({ page }) => {
    await seedScopedDraft(page, "instantmed-draft-prescription", {
      serviceType: "prescription",
      currentStepId: "medication",
      answers: {
        medications: [{ name: "Oxycodone", strength: "5 mg", pbsCode: "MANUAL" }],
        medicationName: "Oxycodone",
        medicationStrength: "5 mg",
      },
    })

    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)

    await expect(page.getByText("This medication cannot be prescribed online")).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('button[data-intake-primary-action="true"]')).toHaveAttribute("data-intake-primary-ready", "false")

    await page.reload()
    await waitForPageLoad(page)
    await dismissCookieBanner(page)

    await expect(page.getByText("This medication cannot be prescribed online")).toBeVisible({ timeout: 15_000 })
    await page.locator("#medication-name-0").fill("Atorvastatin")

    await expect(page.getByText("This medication cannot be prescribed online")).toHaveCount(0)
    await expect(page.locator('button[data-intake-primary-action="true"]')).toHaveAttribute("data-intake-primary-ready", "true")
  })
})

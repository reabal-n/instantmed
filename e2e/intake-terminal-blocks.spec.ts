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
    await expect(page.getByText(/dangerous drop in blood pressure/i)).toBeVisible()

    await page.reload()
    await waitForPageLoad(page)

    await expect(page.getByText("This service is not suitable for you")).toBeVisible({ timeout: 15_000 })
    await dismissCookieBanner(page)
    await page.getByRole("button", { name: /I made a mistake/i }).click()

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
    await expect(page.getByText(/kidney infection/i)).toBeVisible()
    await expect(page.getByText(/UTIs during pregnancy need in-person assessment/i)).toHaveCount(0)

    await page.reload()
    await waitForPageLoad(page)
    await dismissCookieBanner(page)

    await expect(page.getByText(/kidney infection/i)).toBeVisible({ timeout: 15_000 })
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

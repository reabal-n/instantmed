import { expect, type Page, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

async function dismissOverlays(page: Page) {
  const essentialOnly = page.getByRole("button", { name: /Essential only/i })
  if (await essentialOnly.isVisible({ timeout: 1500 }).catch(() => false)) {
    await essentialOnly.click()
  }
}

async function expectNoRequestCrash(page: Page) {
  await expect(page.getByText(/We encountered an issue loading this step/i)).toHaveCount(0)
  await expect(page.getByRole("heading", { name: /^Something went wrong$/i })).toHaveCount(0)
}

async function openRequest(page: Page, path: string) {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  const response = await page.goto(path)
  expect(response?.status(), `${path} should return 200`).toBe(200)
  await waitForPageLoad(page)
  await dismissOverlays(page)
  await expect(page.getByRole("main")).toBeVisible({ timeout: 15000 })
  await expectNoRequestCrash(page)
  expect(pageErrors, `${path} should not throw client runtime errors`).toEqual([])
}

test.describe("Production request-flow synthetic", () => {
  test.describe.configure({ mode: "serial" })

  test("med-cert first step can select certificate type, duration, and start date", async ({ page }) => {
    await openRequest(page, "/request?service=med-cert")

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    const certTypeGroup = page.getByRole("radiogroup", { name: /Certificate type/i })
    const workRadio = certTypeGroup.getByRole("radio", { name: /^Work$/i })
    await workRadio.click()
    await expect(workRadio).toHaveAttribute("aria-checked", "true", { timeout: 5000 })

    const durationGroup = page.getByRole("radiogroup", { name: /Certificate duration/i })
    const oneDayRadio = durationGroup.getByRole("radio", { name: /1 day/i })
    await oneDayRadio.click()
    await expect(oneDayRadio).toHaveAttribute("aria-checked", "true", { timeout: 5000 })

    const todayRadio = page.getByRole("radio", { name: /^Today$/i })
    await todayRadio.click()
    await expect(todayRadio).toHaveAttribute("aria-checked", "true", { timeout: 5000 })

    const primaryAction = page.getByRole("button", { name: /^Continue$/i }).last()
    await expect(primaryAction).toBeVisible({ timeout: 5000 })
    await expect(primaryAction).toBeEnabled({ timeout: 5000 })
    await primaryAction.click()

    await expect(page.getByText(/What is stopping you today|What is happening/i).first()).toBeVisible({ timeout: 15000 })
    await expectNoRequestCrash(page)
  })

  test("active request pathways render their first actionable step", async ({ page }) => {
    const pathways = [
      { path: "/request?service=prescription", text: /Which medication do you need/i },
      { path: "/request?service=repeat-script", text: /Which medication do you need/i },
      { path: "/request?service=consult&subtype=general", text: /What do you need help with/i },
      { path: "/request?service=consult&subtype=ed", text: /What matters most right now/i },
      { path: "/request?service=consult&subtype=hair_loss", text: /What's your main goal|Hair loss goal/i },
    ]

    for (const { path, text } of pathways) {
      await openRequest(page, path)
      await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 })
      await expectNoRequestCrash(page)
    }
  })
})

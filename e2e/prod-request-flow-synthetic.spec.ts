import { expect, type Page, test } from "@playwright/test"

import { installProductionSyntheticIsolation } from "./helpers/production-synthetic-isolation"
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

  // Each pathway assertion owns a fresh entry. Scoped drafts are deliberately
  // sticky across navigations now, so leaving one behind turns the next route
  // into a subtype-mismatch test instead of a first-step synthetic.
  await page.addInitScript(() => {
    localStorage.removeItem("instantmed-request-draft")
    localStorage.removeItem("instantmed-draft-med-cert")
    localStorage.removeItem("instantmed-draft-prescription")
    localStorage.removeItem("instantmed-draft-consult")
    localStorage.removeItem("instantmed-server-draft-med-cert")
    localStorage.removeItem("instantmed-server-draft-prescription")
    localStorage.removeItem("instantmed-server-draft-consult")
  })

  const response = await page.goto(path)
  expect(response?.status(), `${path} should return 200`).toBe(200)
  await waitForPageLoad(page)
  await dismissOverlays(page)
  await expect(page.getByRole("main")).toBeVisible({ timeout: 15000 })
  await expectNoRequestCrash(page)
  expect(pageErrors, `${path} should not throw client runtime errors`).toEqual([])
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }))

  expect(
    Math.max(metrics.scrollWidth, metrics.bodyScrollWidth),
    `${label} should not create horizontal overflow on mobile`,
  ).toBeLessThanOrEqual(metrics.clientWidth + 2)
}

test.describe("Production request-flow synthetic", () => {
  test.describe.configure({ mode: "serial" })

  test.beforeEach(async ({ page }) => {
    await installProductionSyntheticIsolation(page)
  })

  test("med-cert first step can select certificate type, duration, and start date", async ({ page }) => {
    await openRequest(page, "/request?service=med-cert")

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    const certTypeGroup = page.getByRole("radiogroup", { name: /Certificate type/i })
    const workRadio = certTypeGroup.getByRole("radio", { name: /^Work$/i })
    await workRadio.click()
    await expect(workRadio).toHaveAttribute("aria-checked", "true", { timeout: 5000 })

    // Older layouts collapsed length + start date behind a summary. Current
    // layouts render the controls inline, so expand only when the affordance exists.
    const changeDates = page.getByRole("button", { name: /Change length or start date/i })
    if (await changeDates.isVisible().catch(() => false)) await changeDates.click()

    const durationGroup = page.getByRole("radiogroup", { name: /How many days/i })
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

  test("med-cert mobile Continue starts ready after the Work default applies", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openRequest(page, "/request?service=med-cert")

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    const certTypeGroup = page.getByRole("radiogroup", { name: /Certificate type/i })
    await expect(certTypeGroup.getByRole("radio", { name: /^Work$/i })).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 5000 },
    )

    const mobileAction = page
      .locator('[data-intake-mobile-action-bar="true"]')
      .getByRole("button", { name: /^Continue$/i })

    await expect(mobileAction).toBeVisible({ timeout: 5000 })
    await expect(mobileAction).toBeEnabled({ timeout: 5000 })
    await expect(mobileAction).toHaveAttribute("data-intake-mobile-action-ready", "true")

    await mobileAction.click()

    await expect(page.getByText(/What is stopping you today|What is happening/i).first()).toBeVisible({ timeout: 15000 })
    await expectNoRequestCrash(page)
  })

  test("selected Work choice stays fully readable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 844 })
    await openRequest(page, "/request?service=med-cert")

    const workRadio = page.getByRole("radiogroup", { name: /Certificate type/i })
      .getByRole("radio", { name: /^Work$/i })
    await expect(workRadio).toHaveAttribute("aria-checked", "true", { timeout: 5000 })

    const label = workRadio.getByText("Work", { exact: true })
    const dimensions = await label.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }))

    expect(
      dimensions.scrollWidth,
      "The selected Work label should not be truncated by its inline checkmark",
    ).toBeLessThanOrEqual(dimensions.clientWidth + 1)
  })

  test("cookie notice stays out of the mobile request flow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.addInitScript(() => {
      localStorage.removeItem("instantmed_cookie_consent")
    })

    const response = await page.goto("/request?service=med-cert", {
      waitUntil: "networkidle",
    })
    expect(response?.status(), "request page should return 200").toBe(200)
    await expect(page.getByRole("main")).toBeVisible()
    await page.waitForTimeout(1500)

    // The cookie client is intentionally deferred until first interaction.
    // Trigger it deterministically on the intake route, then verify consent is
    // still initialised without placing a late overlay over clinical questions.
    await page.keyboard.press("Tab")
    await expect.poll(
      () => page.evaluate(() => localStorage.getItem("instantmed_cookie_consent")),
      { timeout: 8000 },
    ).not.toBeNull()
    await page.waitForTimeout(4000)

    expect(
      await page.getByRole("status", { name: "Cookie notice" }).count(),
      "Cookie notice must never overlay the intake flow",
    ).toBe(0)
  })

  test("active request pathways render their first actionable step", async ({ page }) => {
    const pathways = [
      { path: "/request?service=repeat-script", text: /Your medication/i },
      { path: "/request?service=consult&subtype=ed", text: /What matters most right now/i },
      { path: "/request?service=consult&subtype=hair_loss", text: /What's your main goal|Hair loss goal/i },
      { path: "/request?service=consult&subtype=womens_health", text: /What do you need today/i },
    ]

    for (const { path, text } of pathways) {
      await openRequest(page, path)
      await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 })
      await expectNoRequestCrash(page)
    }
  })

  test("active request pathways fit a mobile viewport without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    const pathways = [
      { path: "/request?service=med-cert", text: /Certificate details/i },
      { path: "/request?service=repeat-script", text: /Your medication/i },
      { path: "/request?service=consult&subtype=ed", text: /What matters most right now/i },
      { path: "/request?service=consult&subtype=hair_loss", text: /What's your main goal|Hair loss goal/i },
      { path: "/request?service=consult&subtype=womens_health", text: /What do you need today/i },
    ]

    for (const { path, text } of pathways) {
      await openRequest(page, path)
      await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 })
      await expectNoHorizontalOverflow(page, path)
      await expectNoRequestCrash(page)
    }
  })

  test("med-cert start-date choices remain tappable above the mobile action bar on narrow phones", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await openRequest(page, "/request?service=med-cert")

    const actionBar = page.locator('[data-intake-mobile-action-bar="true"]')
    const dayAfterChoice = page.getByRole("radio", { name: /^Day after$/i })

    await expect(actionBar).toBeVisible()
    await expect(dayAfterChoice).toBeVisible()

    const actionBarBox = await actionBar.boundingBox()
    const dayAfterBox = await dayAfterChoice.boundingBox()

    expect(actionBarBox, "mobile action bar should have a measured box").not.toBeNull()
    expect(dayAfterBox, "Day after choice should have a measured box").not.toBeNull()
    expect(
      dayAfterBox!.y + dayAfterBox!.height,
      "The last start-date chip should sit above the sticky mobile action bar",
    ).toBeLessThanOrEqual(actionBarBox!.y)
    expect(dayAfterBox!.height, "Start-date chips should keep a 44px touch target").toBeGreaterThanOrEqual(44)
  })
})

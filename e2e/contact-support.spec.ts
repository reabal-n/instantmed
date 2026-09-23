import { expect, type Page, test } from "@playwright/test"

import { installProductionSyntheticIsolation } from "./helpers/production-synthetic-isolation"

async function prepare(page: Page) {
  await installProductionSyntheticIsolation(page)
  await page.route("**/*", route => {
    if (/posthog|analytics|ingest/.test(route.request().url())) return route.abort()
    return route.fallback()
  })
  await page.goto("/contact")
  await expect(page.getByRole("heading", { name: "Contact support", exact: true })).toBeVisible()
}

async function fillMessage(page: Page) {
  await page.getByLabel("Full name", { exact: true }).fill("Synthetic Visitor")
  await page.getByLabel("Email", { exact: true }).fill("synthetic@example.com")
  await page.getByLabel("Message", { exact: true }).fill("Synthetic support enquiry for browser verification.")
}

test("support methods, guest guidance and account return route are clear on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await prepare(page)
  await expect(page.getByRole("link", { name: "Sign in to view my requests" })).toHaveAttribute("href", "/sign-in?redirect=%2Fpatient%2Fintakes")
  await expect(page.getByText(/Checked out as a guest/)).toBeVisible()
  const form = await page.getByRole("form", { name: "Contact support" }).boundingBox()
  expect(form!.y).toBeLessThan(844)
  const reason = page.getByRole("radio", { name: "General enquiry", exact: true })
  expect((await reason.boundingBox())!.width).toBeLessThanOrEqual(20)
  expect(await reason.evaluate(el => el.closest("label")!.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48)
  await page.getByRole("radio", { name: "My request", exact: true }).click()
  await expect(page.getByRole("radio", { name: "My request", exact: true })).toBeChecked()
  await expect(page.getByRole("link", { name: /24\/7 voice message support/ })).toHaveAttribute("href", "tel:+61495049555")
})

test("validation, pending state, failed delivery and retry never lose the message or report early success", async ({ page }) => {
  let attempts = 0
  let respond: (() => void) | undefined
  // Intercept ALL server actions before navigation: no support email is sent.
  await page.route("**/*", async route => {
    if (!route.request().headers()["next-action"]) return route.fallback()
    attempts += 1
    await new Promise<void>(resolve => { respond = resolve })
    const result = attempts === 1
      ? { success: false, error: "We couldn't send your message. Please try again." }
      : { success: true }
    await route.fulfill({ contentType: "text/x-component", body: `0:{"a":"$@1","f":[],"b":"contact-test"}\n1:${JSON.stringify(result)}\n` })
  })
  await prepare(page)
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  expect(attempts).toBe(0)
  await fillMessage(page)
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect.poll(() => attempts).toBe(1)
  await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled()
  await expect(page.getByRole("heading", { name: "Message sent", exact: true })).toHaveCount(0)
  respond!()
  await expect(page.locator("#contact-error")).toContainText("couldn't send")
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Synthetic support enquiry for browser verification.")
  await expect(page.locator("#contact-error")).toBeFocused()
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect.poll(() => attempts).toBe(2)
  respond!()
  await expect(page.getByRole("heading", { name: "Message sent", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Message sent", exact: true })).toBeFocused()
  await page.getByRole("button", { name: "Send another message" }).click()
  await expect(page.getByLabel("Message", { exact: true })).toBeEmpty()
})

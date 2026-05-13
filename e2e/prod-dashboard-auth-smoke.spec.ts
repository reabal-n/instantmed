import { type BrowserContext, expect, type Page, test } from "@playwright/test"

function requireCookieHeader(): string {
  const header = process.env.DASHBOARD_SMOKE_COOKIE_HEADER?.trim()
  if (!header) {
    throw new Error(
      "DASHBOARD_SMOKE_COOKIE_HEADER is required for the authenticated production dashboard smoke test."
    )
  }
  return header
}

async function installCookies(context: BrowserContext, cookieHeader: string): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL
  if (!baseUrl) {
    throw new Error("E2E_BASE_URL is required.")
  }

  const url = new URL(baseUrl)
  const cookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separatorIndex = cookie.indexOf("=")
      if (separatorIndex === -1) return null

      const name = cookie.slice(0, separatorIndex).trim()
      const value = cookie.slice(separatorIndex + 1).trim()
      if (!name || !value) return null

      return {
        name,
        value,
        domain: url.hostname,
        path: "/",
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "Lax" as const,
      }
    })
    .filter((cookie): cookie is NonNullable<typeof cookie> => Boolean(cookie))

  if (cookies.length === 0) {
    throw new Error("DASHBOARD_SMOKE_COOKIE_HEADER did not contain any parseable cookies.")
  }

  await context.addCookies(cookies)
}

async function assertNoGenericDashboardError(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: /^Something went wrong$/i })).toHaveCount(0)
  await expect(page.getByText(/Please try again\. If this keeps happening/i)).toHaveCount(0)
  await expect(page.getByText(/Error loading dashboard/i)).toHaveCount(0)
}

test.describe("Production authenticated dashboard smoke", () => {
  test("owner admin can render /dashboard without the generic error shell", async ({ context, page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))

    await installCookies(context, requireCookieHeader())

    const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
    expect(response?.status(), "/dashboard should return 200 for the smoke user").toBe(200)
    await expect(page).toHaveURL(/\/dashboard(?:[?#].*)?$/)

    await expect(page.getByRole("main")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { name: /^Dashboard$/i })).toBeVisible({ timeout: 15_000 })
    await assertNoGenericDashboardError(page)

    const bodyText = await page.locator("body").innerText()
    expect(bodyText).not.toMatch(/unauthorized|sign in to continue/i)
    expect(pageErrors).toEqual([])
  })
})

import { expect, type Page, test } from "@playwright/test"

const MOBILE_FLOWS = [
  { label: "Medical certificate", url: "/request?service=med-cert" },
  { label: "Repeat script", url: "/request?service=repeat-script" },
  { label: "ED consult", url: "/request?service=consult&subtype=ed" },
  { label: "Hair loss consult", url: "/request?service=consult&subtype=hair_loss" },
] as const

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
})

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

test.describe("Request mobile visual guard", () => {
  for (const flow of MOBILE_FLOWS) {
    test(`${flow.label} starts without mobile layout friction`, async ({ page }) => {
      await page.goto(flow.url)
      await dismissOverlays(page)

      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20000 })
      await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible({ timeout: 10000 })

      const metrics = await page.evaluate(() => {
        const viewportHeight = window.innerHeight
        const visibleControls = Array.from(
          document.querySelectorAll("button, input, textarea, [role='button'], [role='radio'], [role='combobox']")
        ).filter((element) => {
          const rect = element.getBoundingClientRect()
          const style = window.getComputedStyle(element)
          return style.visibility !== "hidden"
            && style.display !== "none"
            && rect.width > 0
            && rect.height > 0
            && rect.top >= 0
            && rect.top < viewportHeight
        }).length

        return {
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          visibleControls,
        }
      })

      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
      expect(metrics.visibleControls).toBeGreaterThan(0)
    })
  }
})

import { expect, type Locator, type Page, test } from "@playwright/test"

const TOP_GUIDE_VISUAL_TARGETS = [
  "repeat-prescription-online-australia",
  "online-prescription-australia",
  "sick-leave-certificate-online-australia",
  "same-day-medical-certificate",
  "telehealth-consultation-australia",
  "online-doctor-sydney",
  "online-doctor-melbourne",
  "uti-prescription-online-australia",
  "sildenafil-vs-tadalafil",
  "what-is-telehealth",
] as const

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
] as const

async function stabilizeGuideVisuals(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  })
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}

async function expectImageLoaded(image: Locator) {
  await expect
    .poll(async () =>
      image.evaluate((element) => {
        if (!(element instanceof HTMLImageElement)) return false
        return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0
      }),
    )
    .toBe(true)
}

test.describe("blog guide visual regression", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Guide screenshots use Chromium baselines only")

  for (const slug of TOP_GUIDE_VISUAL_TARGETS) {
    for (const viewport of VIEWPORTS) {
      test(`${slug} ${viewport.name} visual guide`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(`/blog/${slug}`, { waitUntil: "domcontentloaded" })
        await stabilizeGuideVisuals(page)

        await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
        const heroImage = page.locator("article img").first()
        await expect(heroImage).toBeVisible()
        await expectImageLoaded(heroImage)

        const visualGuide = page.locator('section[aria-label="Visual guide"]').first()
        await expect(visualGuide).toBeVisible()
        await visualGuide.scrollIntoViewIfNeeded()
        const visualImage = visualGuide.locator("img").first()
        await expect(visualImage).toBeVisible()
        await expectImageLoaded(visualImage)
        const visualCard = visualGuide.locator("button").first()
        await expect(visualCard).toBeVisible()

        await expect(visualCard).toHaveScreenshot(`blog-guide-${slug}-${viewport.name}.png`, {
          animations: "disabled",
          caret: "hide",
          maxDiffPixelRatio: 0.02,
        })
      })
    }
  }
})

import { expect, test } from "@playwright/test"

test.describe("money-page narrative compression", () => {
  test("pricing keeps one decision path and the complete first-fold contract", async ({ page }) => {
    await page.goto("/pricing")

    const hero = page.locator("main > section").first()
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(
      "Choose the service. See the fee upfront.",
    )
    await expect(hero).toContainText("Australia only")
    await expect(hero).toContainText("18+")
    await expect(hero).toContainText("Fees from $24.95 AUD")
    await expect(hero).toContainText("Prescribing requests receive doctor review")
    await expect(hero).toContainText("Medicare")
    await expect(hero.getByRole("link", { name: "Choose a service" })).toHaveAttribute(
      "href",
      "#pricing-cards",
    )

    await expect(page.locator("#pricing-cards [data-service-id]")).toHaveCount(5)
    await expect(page.locator('[data-fee-coverage-ledger="request-fee"]')).toBeVisible()
    await expect(page.getByRole("heading", { name: "Focused online requests or a GP visit" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Common questions" })).toBeVisible()

    for (const removedHeading of [
      "One clear request fee, shown before checkout.",
      "Compare common request types",
      "A straightforward guide to telehealth pricing",
      "Key pricing facts",
      "Read the details behind the fees.",
      "See how InstantMed stacks up",
    ]) {
      await expect(page.getByRole("heading", { name: removedHeading })).toHaveCount(0)
    }
  })

  test("optimizes shared marks and keeps child-page visuals lazy and bounded", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")

    const regulatoryMark = page.getByRole("img", { name: "AHPRA" }).last()
    await regulatoryMark.scrollIntoViewIfNeeded()
    await expect(regulatoryMark).toBeVisible()
    await expect.poll(() => regulatoryMark.evaluate((image) => (image as HTMLImageElement).currentSrc))
      .toContain("/_next/image")

    for (const path of [
      "/uti-assessment-online",
      "/contraceptive-pill-assessment-online",
    ]) {
      await page.goto(path)
      const visual = page.locator('section[aria-label="Visual guide"] img').first()
      await expect(visual).toHaveAttribute("loading", "lazy")
      await expect(visual).toHaveAttribute(
        "sizes",
        "(max-width: 640px) calc(100vw - 2rem), 620px",
      )
      await visual.scrollIntoViewIfNeeded()
      await expect(visual).toBeVisible()

      await expect.poll(
        () => visual.evaluate((image) => (image as HTMLImageElement).currentSrc),
      ).not.toBe("")

      const optimizedUrl = new URL(
        await visual.evaluate((image) => (image as HTMLImageElement).currentSrc),
      )
      expect(optimizedUrl.pathname).toBe("/_next/image")
      expect(Number(optimizedUrl.searchParams.get("w"))).toBeLessThanOrEqual(1280)
    }
  })
})

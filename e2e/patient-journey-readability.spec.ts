import { writeFile } from "node:fs/promises"

import { expect, type Locator, test } from "@playwright/test"

import { paidFunnel } from "../scripts/video-review/journeys/paid-funnel"

for (const width of [375, 1440]) {
  test(`homepage renders the intended fonts after a slow cold load at ${width}px`, async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "Rendered-font inspection uses Chrome DevTools Protocol")
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.context().route("**/api/draft**", route => route.abort())
    await page.route("**/*.woff2", async route => {
      // Exceed font-display:optional's short window so a loaded-but-unused
      // webfont cannot masquerade as proof of the rendered brand face.
      await new Promise(resolve => setTimeout(resolve, 350))
      await route.continue()
    })
    await page.addInitScript(() => {
      const probe = { cls: 0 }
      Object.assign(window, { __e2eHomepageFontProbe: probe })
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }
          if (!shift.hadRecentInput) probe.cls += shift.value
        }
      }).observe({ type: "layout-shift", buffered: true })
    })
    await page.goto("/")
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))

    const cdp = await page.context().newCDPSession(page)
    try {
      await cdp.send("DOM.enable")
      await cdp.send("CSS.enable")
      const { root } = await cdp.send("DOM.getDocument")
      const evidence = []
      for (const [selector, family] of [["h1", "Plus Jakarta Sans"], ["main h2", "Source Sans 3"]] as const) {
        const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector })
        expect(nodeId, `${selector} must exist`).toBeGreaterThan(0)
        const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId })
        evidence.push({ selector, family, fonts })
      }
      const cls = await page.evaluate(() => {
        const probe = (window as typeof window & {
          __e2eHomepageFontProbe?: { cls: number }
        }).__e2eHomepageFontProbe
        if (!probe) throw new Error("Homepage layout-shift probe did not start")
        return probe.cls
      })
      const evidencePath = testInfo.outputPath("rendered-fonts.json")
      await writeFile(evidencePath, JSON.stringify({ width, cls, evidence }, null, 2))
      await testInfo.attach("rendered-fonts", { path: evidencePath, contentType: "application/json" })
      await page.screenshot({ path: testInfo.outputPath(`homepage-fonts-${width}.png`) })
      for (const { selector, family, fonts } of evidence) {
        expect(fonts.length, `${selector} must have rendered glyphs`).toBeGreaterThan(0)
        for (const font of fonts) {
          expect(font.isCustomFont, `${selector} must not remain in a platform fallback`).toBe(true)
          expect(font.familyName).toContain(family)
        }
      }
      expect(cls, "Slow fonts must not cause a disruptive homepage layout shift").toBeLessThanOrEqual(0.1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
    } finally {
      await cdp.detach()
    }
  })
}

async function expectReadableContrast(field: Locator, part: "placeholder" | "background" = "placeholder") {
  const ratio = await field.evaluate((element, part) => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d")!
    context.fillStyle = "white"
    context.fillRect(0, 0, 1, 1)
    // Input is transparent inside its card. Paint ancestor backgrounds in
    // document order so contrast uses the rendered surface, including alpha.
    const ancestors: Element[] = []
    for (let current: Element | null = element; current; current = current.parentElement) ancestors.unshift(current)
    for (const ancestor of ancestors) {
      if (ancestor === element && part === "background") continue
      context.fillStyle = getComputedStyle(ancestor).backgroundColor
      context.fillRect(0, 0, 1, 1)
    }
    const background = context.getImageData(0, 0, 1, 1).data
    context.fillStyle = part === "placeholder"
      ? getComputedStyle(element, "::placeholder").color
      : getComputedStyle(element).backgroundColor
    context.fillRect(0, 0, 1, 1)
    const foreground = context.getImageData(0, 0, 1, 1).data
    const luminance = (color: Uint8ClampedArray) => Array.from(color).slice(0, 3)
      .map(value => value / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)
    const a = luminance(background)
    const b = luminance(foreground)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }, part)
  expect(ratio, "field guidance and control states must contrast with their rendered background")
    .toBeGreaterThanOrEqual(part === "placeholder" ? 4.5 : 3)
}

for (const { storage, rollbackMs } of [
  { storage: "scoped", rollbackMs: 0 },
  { storage: "legacy", rollbackMs: 120 },
] as const) {
  test(`review draft survives ${storage} hydration after a ${rollbackMs}ms clock rollback`, async ({ page }) => {
    // A wall-clock comparison cannot determine whether patient work existed
    // before this document. Reproduce equal timestamps and a small backwards
    // clock correction while timers keep running, without timing-dependent waits.
    await page.clock.setFixedTime(new Date("2026-09-10T02:00:00Z"))
    await page.context().route("**/api/draft**", route => route.abort())
    await page.goto("/")
    const description = "Runny nose and a mild headache. I need a day off work to rest."
    await page.evaluate(({ storage, rollbackMs, description }) => {
      const draft = {
        serviceType: "med-cert",
        currentStepId: "checkout",
        furthestVisitedStepId: "checkout",
        answers: { certType: "work", startDate: "2026-09-10", duration: "1", symptomDetails: description },
        firstName: "Test",
        lastName: "Patient",
        email: "draft-clock-check@example.com",
        dob: "1990-01-01",
        safetyConfirmed: false,
        lastSavedAt: new Date(Date.now() + rollbackMs).toISOString(),
      }
      localStorage.setItem(
        storage === "legacy" ? "instantmed-request-draft" : "instantmed-draft-med-cert",
        JSON.stringify(storage === "legacy" ? { state: draft, version: 0 } : draft),
      )
    }, { storage, rollbackMs, description })

    await page.goto("/request?service=med-cert")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Review & pay")
    await expect(page.locator("dd").filter({ hasText: description })).toHaveText(description)
    await expect(page.getByRole("checkbox", { name: /Confirm request and payment terms/i })).not.toBeChecked()
    await page.reload()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Review & pay")
    await expect(page.locator("dd").filter({ hasText: description })).toHaveText(description)
  })
}

for (const existingDraft of [false, true]) {
  test(`clock-safe hydration preserves ${existingDraft ? "existing" : "fresh"} specialty attribution`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-10T02:00:00Z"))
    await page.context().route("**/api/draft**", async route => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as { sessionId: string }
        await route.fulfill({ json: {
          sessionId: body.sessionId,
          updatedAt: "2026-09-10T02:00:00Z",
          expiresAt: "2026-09-11T02:00:00Z",
        } })
      } else {
        await route.fulfill({ status: 404, json: { error: "Not found" } })
      }
    })
    await page.goto("/")
    if (existingDraft) {
      await page.evaluate(() => localStorage.setItem("instantmed-draft-consult", JSON.stringify({
        serviceType: "consult",
        flowInstanceId: "cd7e6a00-b25f-4de1-bcd8-f65d5c347d25",
        growthExperienceVersion: null,
        currentStepId: "ed-goals",
        answers: { consultSubtype: "ed", edDuration: "1_to_3_years", edErectionFrequency: 3 },
        lastSavedAt: new Date(Date.now() + 120).toISOString(),
      })))
    }
    await page.goto("/request?service=consult&subtype=ed&growth_experience_version=spx_e1_20260828")
    if (existingDraft) {
      await expect(page.getByRole("radio", { name: "1–3 years", exact: true })).toBeChecked()
    }
    const draftWrite = page.waitForRequest(request => request.url().includes("/api/draft")
      && request.method() === "POST"
      && request.postDataJSON()?.answers?.edDuration === "3_plus_years")
    await page.getByRole("radio", { name: "3+ years", exact: true }).click()
    const saved = (await draftWrite).postDataJSON() as { growthExperienceVersion?: string }
    expect(saved.growthExperienceVersion ?? null).toBe(existingDraft ? null : "spx_e1_20260828")
  })
}

// Browser behaviour only. Keep draft writes and checkout actions inside the
// browser boundary; this spec does not establish hosted payment or delivery.
for (const theme of ["light", "dark"] as const) {
  test(`public journey keeps answers readable and recoverable in ${theme} mode`, async ({ page, baseURL }, testInfo) => {
    test.setTimeout(120_000)
    // Noon in Sydney: priority review is intentionally hidden overnight.
    // Keep this control check deterministic without changing that offer rule.
    await page.clock.install({ time: new Date("2026-09-10T02:00:00Z") })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
    await page.addInitScript((mode) => localStorage.setItem("theme", mode), theme)
    await page.route("**/api/draft**", async (route) => {
      const request = route.request()
      if (request.method() === "POST") {
        const body = request.postDataJSON() as { sessionId: string }
        await route.fulfill({ json: {
          sessionId: body.sessionId,
          updatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        } })
      } else {
        await route.fulfill({ status: 404, json: { error: "Not found" } })
      }
    })
    let blockedCheckoutAttempts = 0
    await page.route("**/request?**", async (route) => {
      if (route.request().headers()["next-action"]) {
        blockedCheckoutAttempts += 1
        await route.abort("connectionfailed")
      } else {
        await route.continue()
      }
    })

    // Exercise the same real CTA and service choice used by visual review.
    await paidFunnel.run(page, baseURL!)
    await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`))
    await page.getByRole("button", { name: "Edit Symptoms", exact: true }).click()
    await expectReadableContrast(page.locator("#symptom-details"))
    const description = "Runny nose and a mild headache since this morning. I feel tired and need a day off work to rest."
    await page.locator("#symptom-details").fill(description)
    const actionBar = page.locator('[data-intake-mobile-action-bar="true"]')
    await actionBar.getByRole("button", { name: /^Continue( to payment)?$/ }).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your details")
    await expect(page.getByRole("textbox", { name: /First name/i })).toHaveValue("Test")
    for (const name of [/First name/i, /Last name/i, /Email/i, /Date of birth/i]) {
      await expectReadableContrast(page.getByRole("textbox", { name }))
    }
    const longEmail = `${"avery.example".repeat(4)}@example.com`
    await page.getByRole("textbox", { name: /Email/i }).fill(longEmail)
    await actionBar.getByRole("button", { name: /^Continue( to payment)?$/ }).click()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Review & pay")

    const answer = page.locator("dd").filter({ hasText: description })
    await expect(answer).toHaveText(description)
    const layout = await answer.evaluate((element) => {
      const label = element.previousElementSibling!
      return {
        answer: element.getBoundingClientRect().toJSON(),
        label: label.getBoundingClientRect().toJSON(),
        align: getComputedStyle(element).textAlign,
      }
    })
    expect(layout.answer.top).toBeGreaterThanOrEqual(layout.label.bottom)
    expect(Math.abs(layout.answer.left - layout.label.left)).toBeLessThan(1)
    expect(layout.align).toBe("left")
    await expect(page.getByRole("button", { name: "Show more" })).toHaveCount(0)
    const emailAnswer = page.locator("dd").filter({ hasText: longEmail })
    await expect(emailAnswer).toHaveText(longEmail)
    expect(await emailAnswer.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1)

    // A reload must recover the edited answer and the review step.
    await expect.poll(() => page.evaluate(() => localStorage.getItem("instantmed-draft-med-cert") ?? ""))
      .toContain(description)
    await page.reload()
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Review & pay")
    await expect(page.locator("dd").filter({ hasText: description })).toHaveText(description)
    const priority = page.getByRole("switch", { name: "Enable priority review" })
    const priorityTrack = priority.locator(":scope > span[aria-hidden]")
    await expectReadableContrast(priorityTrack, "background")
    await expectReadableContrast(priorityTrack.locator("span"), "background")
    await page.screenshot({ path: testInfo.outputPath(`review-${theme}.png`), fullPage: true })

    const consent = page.getByRole("checkbox", { name: /Confirm request and payment terms/i })
    await consent.uncheck()
    const confirmAction = actionBar.getByRole("button", { name: "Review & confirm" })
    await expect(confirmAction).toBeEnabled()
    await expect(actionBar.getByRole("button", { name: /Pay \$/ })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`confirm-mobile-${theme}.png`) })
    await confirmAction.click()
    await expect(consent).toBeFocused()
    expect(blockedCheckoutAttempts).toBe(0)

    // The desktop action has the same available confirmation behavior and
    // must not announce itself as disabled to keyboard/screen-reader users.
    await page.setViewportSize({ width: 1280, height: 900 })
    const desktopConfirm = page.locator('[data-intake-primary-action="true"]')
    await expect(desktopConfirm).toHaveText("Review & confirm")
    await expect(desktopConfirm).toBeEnabled()
    await expect(desktopConfirm).not.toHaveAttribute("aria-disabled", "true")
    await page.screenshot({ path: testInfo.outputPath(`confirm-desktop-${theme}.png`), fullPage: true })
    await desktopConfirm.click()
    await expect(consent).toBeFocused()
    expect(blockedCheckoutAttempts).toBe(0)
    await page.setViewportSize({ width: 375, height: 812 })

    await consent.check()
    await actionBar.getByRole("button", { name: /Pay \$24\.95/ }).click()
    await expect(page.getByRole("alert").filter({ hasText: /couldn't confirm the checkout result/i })).toBeVisible()
    await expect(actionBar.getByRole("button", { name: /Pay \$24\.95/ })).toBeDisabled()
    expect(blockedCheckoutAttempts).toBe(1)
    await expect(page.getByRole("link", { name: /Contact support/i })).toHaveAttribute("href", /^mailto:support@instantmed\.com\.au/)
    await page.screenshot({ path: testInfo.outputPath(`checkout-recovery-${theme}.png`), fullPage: true })
  })
}

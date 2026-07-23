import { expect, type Page, test } from "@playwright/test"

import { waitForPageLoad } from "./helpers/test-utils"

async function advanceMedCertToSymptoms(page: Page) {
  await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
  await page.getByRole("radio", { name: /Work/i }).click()

  const changeDates = page.getByRole("button", { name: /Change length or start date/i })
  if (await changeDates.isVisible().catch(() => false)) await changeDates.click()

  const oneDay = page.getByRole("radio", { name: /1 day/i })
  if (await oneDay.isVisible().catch(() => false)) await oneDay.click()
  const today = page.getByRole("radio", { name: /^Today/i })
  if (await today.isVisible().catch(() => false)) await today.click()

  const stickyBar = page.locator('[data-intake-mobile-action-bar="true"]')
  if (await stickyBar.isVisible().catch(() => false)) {
    const stickyContinue = stickyBar.getByRole("button", { name: /^Continue$/i })
    await expect(stickyContinue).toHaveAttribute("data-intake-mobile-action-ready", "true")
    await stickyContinue.click()
  } else {
    const primaryContinue = page.locator('button[data-intake-primary-action="true"]').last()
    await expect(primaryContinue).toHaveAttribute("data-intake-primary-ready", "true")
    await primaryContinue.click()
  }

  await expect(page.locator("#symptom-details")).toBeVisible({ timeout: 15000 })
}

/**
 * Unified Request Flow E2E Tests
 * 
 * Tests the new unified /request entry point with dynamic steps:
 * - Medical Certificate flow
 * - Prescription flow
 * - Route redirects from /start
 */

test.describe("Unified Request Flow - Medical Certificate", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
  })

  test("loads certificate step first", async ({ page }) => {
    // Certificate step is the first step for med-cert flow
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
  })

  test("can interact with certificate options", async ({ page }) => {
    // Wait for certificate step to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Select work certificate type
    await page.getByRole("radio", { name: /Study/i }).click()

    // Length + start date collapse to a summary by default — expand to reach duration
    const changeDates = page.getByRole("button", { name: /Change length or start date/i })
    if (await changeDates.isVisible().catch(() => false)) await changeDates.click()

    // Select 1 day duration
    await page.getByRole("radio", { name: /1 day/i }).click()
    
    // Continue button should be visible (may be disabled until all fields complete)
    await expect(page.locator("main").getByRole("button", { name: /^Continue$/i }).first()).toBeVisible()
  })

  test("certificate step shows type options", async ({ page }) => {
    // Wait for certificate step to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Should see certificate type options
    await expect(page.getByRole("radio", { name: /Work/i })).toBeVisible()
    await expect(page.getByRole("radio", { name: /Study/i })).toBeVisible()
    await expect(page.getByRole("radio", { name: /Carer/i })).toBeVisible()
  })

  test("can select duration options", async ({ page }) => {
    // Wait for certificate step to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    // Older layouts collapsed duration controls behind a summary button; the
    // current mobile-tappable date chips render the controls expanded.
    const changeDates = page.getByRole("button", { name: /Change length or start date/i })
    if (await changeDates.isVisible().catch(() => false)) await changeDates.click()

    // Duration options should be visible
    await expect(page.getByRole("radio", { name: /1 day/i })).toBeVisible()
    await expect(page.getByRole("radio", { name: /2 days/i })).toBeVisible()
  })

  test("shows progress indicator", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Progress navigation should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible()
  })

  test("back button is visible", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Back button should be visible
    await expect(page.getByRole("button", { name: /Go back/i })).toBeVisible()
  })

  test("short high-stakes certificate wording hard-stops until the patient edits it", async ({ page }) => {
    await advanceMedCertToSymptoms(page)

    const details = page.locator("#symptom-details")
    // Deliberately under 10 characters: the quality gate accepts "flu", so the
    // high-stakes check must not hide behind a client-only length threshold.
    await details.fill("exam flu")

    const block = page.getByRole("alert").filter({ hasText: /Exam deferrals/i })
    await expect(block).toBeVisible()
    await expect(page.locator("#high-stakes-ack")).toHaveCount(0)
    await expect(page.locator('button[data-intake-primary-action="true"]')).toHaveCount(0)

    await details.fill("Fever and sore throat since yesterday")

    await expect(block).toHaveCount(0)
    const primaryContinue = page.locator('button[data-intake-primary-action="true"]').last()
    await expect(primaryContinue).toHaveAttribute("data-intake-primary-ready", "true")
    await primaryContinue.click()
    await expect(details).toHaveCount(0)
  })
})

test.describe("Unified Request Flow - Prescription", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/request?service=repeat-script")
    await waitForPageLoad(page)
  })

  test("loads prescription flow", async ({ page }) => {
    // Prescription flow should load with a heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })

  test("shows progress indicator", async ({ page }) => {
    // Wait for page to load
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
    
    // Progress navigation should be visible
    await expect(page.getByRole("navigation", { name: /Request progress/i })).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Unified Request Flow - Route Redirects", () => {
  test("/start redirects to /request", async ({ page }) => {
    await page.goto("/start", { waitUntil: "networkidle" })

    // Should redirect to /request (allow time for server redirect + cold start)
    await page.waitForURL(/\/request/, { timeout: 15000 })
  })

  test("/start?service=med-cert redirects correctly", async ({ page }) => {
    await page.goto("/start?service=med-cert", { waitUntil: "networkidle" })

    // Should redirect to /request with service param
    await page.waitForURL(/\/request\?service=med-cert/, { timeout: 15000 })
  })

  test("/start?service=repeat-script redirects correctly", async ({ page }) => {
    await page.goto("/start?service=repeat-script", { waitUntil: "networkidle" })

    // Should redirect to /request with mapped service param
    await page.waitForURL(/\/request\?service=repeat-script/, { timeout: 15000 })
  })

  test("/start?service=repeat-rx maps to repeat-script", async ({ page }) => {
    await page.goto("/start?service=repeat-rx", { waitUntil: "networkidle" })

    // Legacy repeat-rx should map to repeat-script
    await page.waitForURL(/\/request\?service=repeat-script/, { timeout: 15000 })
  })
})

test.describe("Unified Request Flow - Draft Persistence", () => {
  test("page loads and allows interaction", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Wait for certificate step
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Select certificate type
    await page.getByRole("radio", { name: /Work/i }).click()
    
    // Button should show selected state (visual feedback)
    await page.waitForTimeout(300)
  })

  test("restores certificate selections after a full page reload", async ({ page }) => {
    // Regression guard for the 2026-07-02 draft-loss bug: the storage
    // migration deleted the legacy key mid-hydration, so a reload silently
    // reset every selection (and rewrote the draft with the 1-day default).
    // This asserts actual RESTORATION, not just that the page reloads.
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    // Dev-only: `next dev` can fire a Fast-Refresh full reload shortly after
    // first compile of the route + its idle-imported chunks, wiping in-flight
    // clicks. Let the compile storm settle before interacting so the
    // selections land on a stable page. No-op against a warm/production server.
    await page.waitForLoadState("networkidle").catch(() => {})

    // Retry the selection if a dev self-reload reset the page between the
    // click and the debounced draft write reaching storage.
    await expect(async () => {
      await page.getByRole("radio", { name: /Work/i }).click()
      const changeDates = page.getByRole("button", { name: /Change length or start date/i })
      if (await changeDates.isVisible().catch(() => false)) await changeDates.click()
      await page.getByRole("radio", { name: /3 days/i }).click()
      await expect(page.getByRole("radio", { name: /3 days/i })).toBeChecked()
      // Confirm the debounced dual-write actually persisted before reloading.
      const scoped = await page.evaluate(
        () => window.localStorage.getItem("instantmed-draft-med-cert") ?? "",
      )
      expect(scoped).toContain('"duration":"3"')
      expect(scoped).toContain('"certType":"work"')
    }).toPass({ timeout: 20000 })

    await page.reload()
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("radio", { name: /Work/i })).toBeChecked()
    await expect(page.getByRole("radio", { name: /3 days/i })).toBeChecked()
  })

  test("restores from the service-scoped draft when the legacy key is gone", async ({ page }) => {
    // This is a client lifecycle test, not a linked-database migration test.
    // Keep draft traffic local so a pending migration cannot mutate or depend
    // on the shared E2E project while still proving POST/DELETE/beacon intent.
    let deleteAttempts = 0
    await page.route("**/api/draft**", async (route) => {
      const method = route.request().method()
      if (method === "POST") {
        const body = route.request().postDataJSON() as { sessionId?: string }
        await route.fulfill({
          contentType: "application/json",
          status: 200,
          body: JSON.stringify({
            sessionId: body.sessionId,
            expiresAt: "2026-07-30T00:00:00.000Z",
            updatedAt: "2026-07-22T00:00:00.000Z",
          }),
        })
        return
      }
      if (method === "DELETE") {
        deleteAttempts += 1
        if (deleteAttempts === 1) {
          await route.fulfill({
            contentType: "application/json",
            status: 503,
            body: '{"error":"Temporarily unavailable"}',
          })
          return
        }
        await route.fulfill({ contentType: "application/json", status: 200, body: '{"ok":true}' })
        return
      }
      await route.fulfill({ contentType: "application/json", status: 404, body: '{"error":"Not found"}' })
    })

    // Phase 2.3 read fallback: patients who hit the pre-fix migration bug
    // have their draft ONLY in instantmed-draft-<service> (the migration
    // deleted the legacy key). Hydration must recover it. Seeded via
    // addInitScript so the state survives dev-server self-reloads.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "instantmed-draft-med-cert",
        JSON.stringify({
          serviceType: "med-cert",
          currentStepId: "certificate",
          answers: { certType: "work", duration: "2" },
          lastSavedAt: new Date().toISOString(),
        }),
      )
      window.localStorage.setItem(
        "instantmed-server-draft-med-cert",
        "11111111-1111-4111-8111-111111111111",
      )
      window.localStorage.removeItem("instantmed-request-draft")
    })

    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("radio", { name: /Work/i })).toBeChecked({ timeout: 10000 })
    await expect(page.getByRole("radio", { name: /2 days/i })).toBeChecked({ timeout: 10000 })
    await expect(page.getByText("Progress restored", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Start this request over" })).toBeVisible()
    await expect(page.getByText(/Continue where you left off/i)).not.toBeVisible()

    await page.getByRole("button", { name: "Start this request over" }).click()
    await expect(page.getByText("Progress restored", { exact: true })).not.toBeVisible()

    await expect.poll(async () => page.evaluate(() => ({
      legacy: window.localStorage.getItem("instantmed-request-draft"),
      scoped: window.localStorage.getItem("instantmed-draft-med-cert"),
      activeServerBearer: window.localStorage.getItem("instantmed-server-draft-med-cert"),
      pendingDiscard: window.localStorage.getItem(
        "instantmed-server-draft-discard-pending-v1:11111111-1111-4111-8111-111111111111",
      ) !== null,
    }))).toEqual({
      legacy: null,
      scoped: null,
      activeServerBearer: null,
      pendingDiscard: true,
    })

    await page.evaluate(() => window.dispatchEvent(new Event("online")))
    await expect.poll(async () => page.evaluate(() => window.localStorage.getItem(
      "instantmed-server-draft-discard-pending-v1:11111111-1111-4111-8111-111111111111",
    ))).toBeNull()
    expect(deleteAttempts).toBeGreaterThanOrEqual(2)

    // Route/profile seeds after Start over are passive context. Even unload
    // must not reinterpret them as patient work and recreate server recovery.
    const beaconUrls = await page.evaluate(() => {
      const urls: string[] = []
      Object.defineProperty(window.navigator, "sendBeacon", {
        configurable: true,
        value: (url: string | URL) => {
          urls.push(String(url))
          return true
        },
      })
      window.dispatchEvent(new Event("pagehide"))
      return urls
    })
    expect(beaconUrls).not.toContain("/api/draft")
  })

  test("blocks a stale tab after the same flow is retired elsewhere", async ({ page }) => {
    const context = page.context()
    await context.addInitScript(() => {
      const flowInstanceId = "44444444-4444-4444-8444-444444444444"
      if (
        window.localStorage.getItem(
          `instantmed-draft-retired-flow-v1:${flowInstanceId}`,
        ) ||
        window.localStorage.getItem("instantmed-draft-med-cert")
      ) {
        return
      }
      const draft = {
        serviceType: "med-cert",
        flowInstanceId,
        currentStepId: "certificate",
        answers: { certType: "work", duration: "1" },
        lastSavedAt: new Date().toISOString(),
      }
      window.localStorage.setItem(
        "instantmed-draft-med-cert",
        JSON.stringify(draft),
      )
      window.localStorage.setItem(
        "instantmed-request-draft",
        JSON.stringify({ state: draft, version: 0 }),
      )
    })
    await context.route("**/api/draft**", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as { sessionId?: string }
        await route.fulfill({
          contentType: "application/json",
          status: 200,
          body: JSON.stringify({
            sessionId: body.sessionId,
            expiresAt: "2026-07-30T00:00:00.000Z",
            updatedAt: "2026-07-23T00:00:00.000Z",
          }),
        })
        return
      }
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: '{"ok":true}',
      })
    })

    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await expect(page.getByText("Progress restored", { exact: true })).toBeVisible({ timeout: 15000 })

    const secondTab = await context.newPage()
    try {
      await secondTab.goto("/request?service=med-cert")
      await waitForPageLoad(secondTab)
      await expect(secondTab.getByText("Progress restored", { exact: true })).toBeVisible({ timeout: 15000 })
      await secondTab.getByRole("button", { name: "Start this request over" }).click()

      await expect(page.getByRole("heading", {
        name: "This request is no longer active",
      })).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole("button", { name: "Start a new request" })).toBeVisible()
      await expect(page.getByRole("radio", { name: /Work/i })).toHaveCount(0)

      await page.getByRole("button", { name: "Start a new request" }).click()
      await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible()
    } finally {
      await secondTab.close()
    }
  })

  test("blocks the mounted request when its own draft save is rejected as discarded", async ({ page }) => {
    await page.route("**/api/draft**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          contentType: "application/json",
          status: 410,
          body: '{"error":"Draft was discarded"}',
        })
        return
      }
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: '{"ok":true}',
      })
    })

    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    await page.getByRole("radio", { name: /Study/i }).click()

    await expect(page.getByRole("heading", {
      name: "This request is no longer active",
    })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("radio", { name: /Study/i })).toHaveCount(0)

    await page.getByRole("button", { name: "Start a new request" }).click()
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible()
  })

  test("rechecks the active flow when a request returns from the back-forward cache", async ({ page }) => {
    await page.route("**/api/draft**", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON() as { sessionId?: string }
        await route.fulfill({
          contentType: "application/json",
          status: 200,
          body: JSON.stringify({
            sessionId: body.sessionId,
            expiresAt: "2026-07-30T00:00:00.000Z",
            updatedAt: "2026-07-23T00:00:00.000Z",
          }),
        })
        return
      }
      await route.fulfill({ contentType: "application/json", status: 200, body: '{"ok":true}' })
    })

    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await page.getByRole("radio", { name: /Study/i }).click()

    await expect.poll(async () => page.evaluate(() => Boolean(
      window.localStorage.getItem("instantmed-draft-med-cert"),
    ))).toBe(true)
    const flowInstanceId = await page.evaluate(() => {
      const raw = window.localStorage.getItem("instantmed-draft-med-cert")
      return raw ? (JSON.parse(raw) as { flowInstanceId?: string }).flowInstanceId : undefined
    })
    expect(flowInstanceId).toBeTruthy()

    await page.evaluate((retiredFlowInstanceId) => {
      window.localStorage.setItem(
        `instantmed-draft-retired-flow-v1:${retiredFlowInstanceId}`,
        JSON.stringify({
          v: 1,
          serviceType: "med-cert",
          retiredAt: new Date().toISOString(),
        }),
      )
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))
    }, flowInstanceId)

    await expect(page.getByRole("heading", {
      name: "This request is no longer active",
    })).toBeVisible()
  })

  test("shows Start over after an explicit recovery-link restore", async ({ page }) => {
    const sessionId = "77777777-7777-4777-8777-777777777777"
    const flowInstanceId = "88888888-8888-4888-8888-888888888888"
    await page.route("**/api/draft**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          contentType: "application/json",
          status: 200,
          body: JSON.stringify({
            sessionId,
            serviceType: "med-cert",
            flowInstanceId,
            currentStepId: "certificate",
            answers: { certType: "work", duration: "2" },
            identity: {
              email: null,
              firstName: null,
              lastName: null,
              phone: null,
              dob: null,
            },
            updatedAt: "2026-07-23T00:00:00.000Z",
            expiresAt: "2026-07-30T00:00:00.000Z",
          }),
        })
        return
      }
      await route.fulfill({ contentType: "application/json", status: 200, body: '{"ok":true}' })
    })

    await page.goto(`/request?service=med-cert&d=${sessionId}`)
    await waitForPageLoad(page)

    await expect(page.getByText("Progress restored", { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("button", { name: "Start this request over" })).toBeVisible()
    await page.getByRole("button", { name: "Start this request over" }).click()

    await expect(page.getByText("Progress restored", { exact: true })).not.toBeVisible()
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible()
  })

  test("lets unchanged review edits jump back to Pay but revalidates material edits first", async ({ page }) => {
    await page.addInitScript(() => {
      const today = new Date().toISOString().slice(0, 10)
      window.localStorage.setItem(
        "instantmed-request-draft",
        JSON.stringify({
          state: {
            serviceType: "med-cert",
            currentStepId: "checkout",
            furthestVisitedStepId: "checkout",
            stepsNeedingRevalidation: [],
            answers: {
              certType: "work",
              duration: "1",
              startDate: today,
              symptomDetails: "Mild headache since this morning",
            },
            firstName: "Test",
            lastName: "Patient",
            email: "test@example.com",
            dob: "1990-01-01",
            lastSavedAt: new Date(Date.now() - 1000).toISOString(),
          },
          version: 0,
        }),
      )
    })

    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await expect(page.getByRole("heading", { name: "One last check" })).toBeVisible({ timeout: 15000 })

    const progress = page.getByRole("navigation", { name: "Request progress" })
    await progress.getByRole("button", { name: "Symptoms completed" }).click()
    await expect(page.getByRole("heading", { name: /Your symptoms/i })).toBeVisible()

    const unchangedPay = progress.getByRole("button", { name: "Pay completed" })
    await expect(unchangedPay).toBeEnabled()
    await unchangedPay.click()
    await expect(page.getByRole("heading", { name: "One last check" })).toBeVisible()

    await progress.getByRole("button", { name: "Symptoms completed" }).click()
    await page.locator("#symptom-details").fill("Mild headache and fatigue since this morning")

    await expect(progress.getByRole("button", { name: "Symptoms needs review" })).toBeEnabled()
    await expect(progress.getByRole("button", { name: "Pay", exact: true })).toBeDisabled()

    const continueButton = page.locator('button[data-intake-primary-action="true"]').last()
    await expect(continueButton).toHaveAttribute("data-intake-primary-ready", "true")
    await continueButton.click()
    await expect(
      page.getByRole("heading", { name: "Your details", level: 2 }),
    ).toBeVisible()

    const revalidatedPay = progress.getByRole("button", { name: "Pay completed" })
    await expect(revalidatedPay).toBeEnabled()
    await revalidatedPay.click()
    await expect(page.getByRole("heading", { name: "One last check" })).toBeVisible()
  })
})

test.describe("Unified Request Flow - Error Handling", () => {
  test("page loads without errors", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Page should load with certificate step
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
  })

  test("recovers from a legacy draft with null answers", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "instantmed-request-draft",
        JSON.stringify({
          state: {
            serviceType: "med-cert",
            currentStepId: "certificate",
            answers: null,
            lastSavedAt: new Date().toISOString(),
          },
          version: 0,
        })
      )

      const originalSetItem = Storage.prototype.setItem
      let blockedMigrationWrite = false
      Storage.prototype.setItem = function setItemWithOneBlockedDraftWrite(key, value) {
        if (!blockedMigrationWrite && key === "instantmed-draft-med-cert") {
          blockedMigrationWrite = true
          throw new DOMException("Draft storage migration blocked", "QuotaExceededError")
        }

        return originalSetItem.call(this, key, value)
      }
    })

    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Something went wrong")).toHaveCount(0)
    await expect(page.getByRole("radio", { name: /Work/i })).toBeVisible()
  })

  test("handles missing service param gracefully", async ({ page }) => {
    await page.goto("/request")
    await waitForPageLoad(page)
    
    // Should show some heading (defaults to med-cert)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 })
  })
})

test.describe("Unified Request Flow - Accessibility", () => {
  test("has proper heading structure", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Should have h1 heading
    const h1 = page.getByRole("heading", { level: 1 })
    await expect(h1).toBeVisible({ timeout: 15000 })
  })

  test("buttons are keyboard accessible", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    
    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })
    
    // Page should have focusable buttons
    await expect(page.getByRole("radio", { name: /Work/i })).toBeVisible()
  })

  test("interactive elements are present", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    // Page should have interactive elements
    await expect(page.locator("main").getByRole("button", { name: /^Continue$/i }).first()).toBeVisible()
  })
})

test.describe("Unified Request Flow - Mobile sticky CTA", () => {
  // 2026-06-30 outage guard: the deploy that replaced the sticky-CTA
  // MutationObserver with an announce event left the bar permanently disabled
  // on every lazily-loaded step whose primary action is a plain Button (18 of
  // 19 steps), killing ALL mobile checkouts for 2.5 days while desktop CI
  // stayed green. This test advances the flow at a phone viewport using ONLY
  // the sticky bar, so that regression class cannot ship again.
  test.use({ viewport: { width: 375, height: 812 } })

  test("advances certificate -> symptoms via the sticky bar only", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)

    await expect(page.getByRole("heading", { name: /Certificate details/i })).toBeVisible({ timeout: 15000 })

    // Complete step 1 (duration/start date default; select them if rendered
    // unselected so the step is valid regardless of default behaviour).
    await page.getByRole("radio", { name: /Work/i }).click()
    const changeDates = page.getByRole("button", { name: /Change length or start date/i })
    if (await changeDates.isVisible().catch(() => false)) await changeDates.click()
    const oneDay = page.getByRole("radio", { name: /1 day/i })
    if (await oneDay.isVisible().catch(() => false)) await oneDay.click()
    const today = page.getByRole("radio", { name: /^Today/i })
    if (await today.isVisible().catch(() => false)) await today.click()

    // The in-step Continue is max-sm:hidden at this viewport — the sticky bar
    // is the ONLY way forward on mobile. It must become enabled and work.
    const stickyBar = page.locator('[data-intake-mobile-action-bar="true"]')
    await expect(stickyBar).toBeVisible({ timeout: 15000 })
    const stickyContinue = stickyBar.getByRole("button", { name: /Continue|Pay/ })
    await expect(stickyContinue).toBeEnabled({ timeout: 15000 })
    await stickyContinue.click()

    // Step 2 (symptoms) renders its primary action with the shared plain
    // Button — the exact class that went dark in the outage. The sticky bar
    // must be clickable on this step too (validation-on-tap pattern), not
    // permanently disabled.
    await expect(page.getByRole("heading", { name: /Your symptoms/i })).toBeVisible({ timeout: 15000 })
    await expect(stickyContinue).toBeEnabled({ timeout: 15000 })
  })

  test("removes the sticky Continue for high-stakes wording and restores it after correction", async ({ page }) => {
    await page.goto("/request?service=med-cert")
    await waitForPageLoad(page)
    await advanceMedCertToSymptoms(page)

    const details = page.locator("#symptom-details")
    await details.fill("Migraine and need to defer my exam tomorrow")

    await expect(page.getByRole("alert").filter({ hasText: /Exam deferrals/i })).toBeVisible()
    const stickyBar = page.locator('[data-intake-mobile-action-bar="true"]')
    await expect(stickyBar).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await details.fill("Fever and sore throat since yesterday")

    await expect(stickyBar).toBeVisible()
    await expect(stickyBar.getByRole("button", { name: /^Continue$/i })).toHaveAttribute(
      "data-intake-mobile-action-ready",
      "true",
    )
  })
})

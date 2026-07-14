import { randomInt } from "node:crypto"

import { expect, type Locator, test } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const E2E_OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"

function createAdjacentQueueTimes(): [string, string] {
  // Give each parallel test a near-collision-proof adjacent pair. No other
  // millisecond timestamp can sort between these two cases, so the explicit
  // Next control remains deterministic even when another E2E run shares the DB.
  const firstMs = Date.UTC(2000, 0, 1) + randomInt(0, 31_536_000_000) * 2
  return [new Date(firstMs).toISOString(), new Date(firstMs + 1).toISOString()]
}

async function seedShortcutSafetyCase(
  queueEnteredAt: string,
  note: string,
): Promise<string> {
  const seed = await seedTestIntake({
    status: "in_review",
    payment_status: "paid",
    category: "medical_certificate",
    claimed_by: E2E_OPERATOR_ID,
  })

  if (!seed.success || !seed.intakeId) {
    throw new Error(seed.error || "Could not seed keyboard-safety intake")
  }

  const supabase = getSupabaseClient()
  const { error: intakeError } = await supabase
    .from("intakes")
    .update({
      doctor_notes: note,
      is_priority: true,
      risk_score: 10,
      risk_tier: "critical",
      paid_at: queueEnteredAt,
      submitted_at: queueEnteredAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seed.intakeId)

  if (intakeError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Could not prepare keyboard-safety intake: ${intakeError.message}`)
  }

  const { error: answersError } = await supabase.from("intake_answers").insert({
    intake_id: seed.intakeId,
    answers: {
      certType: "work",
      duration: "1",
      startDate: "2026-07-11",
      symptoms: ["other"],
      symptomDetails: "E2E keyboard safety fixture",
      symptomDuration: "today",
    },
  })

  if (answersError) {
    await cleanupTestIntake(seed.intakeId)
    throw new Error(`Could not add keyboard-safety answers: ${answersError.message}`)
  }

  return seed.intakeId
}

async function placeCaretAtEnd(locator: Locator): Promise<void> {
  await locator.evaluate((element) => {
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    ;(element as HTMLElement).focus()
  })
}

async function openDraftNote(panel: Locator): Promise<Locator> {
  const trigger = panel.getByRole("button", { name: /^Draft note · Review required$/ })
  await expect(trigger).toBeVisible({ timeout: 15_000 })

  if ((await trigger.getAttribute("aria-expanded")) !== "true") {
    await trigger.click()
  }

  await expect(trigger).toHaveAttribute("aria-expanded", "true")
  const note = panel.locator('[contenteditable="true"][aria-label="Draft clinical note"]')
  await expect(note).toBeVisible({ timeout: 15_000 })
  return note
}

test.describe("Doctor keyboard shortcut safety", () => {
  const testIntakeIds: string[] = []

  test.beforeEach(async ({ page }) => {
    test.skip(!isDbAvailable(), "Database required for keyboard-safety E2E")
    const login = await loginAsOperator(page)
    expect(login.success, `E2E login should succeed: ${login.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
    for (const intakeId of testIntakeIds.splice(0)) {
      await cleanupTestIntake(intakeId)
    }
  })

  test("typing a slash in an unstructured note does not focus queue search", async ({ page }) => {
    const [firstQueueTime, secondQueueTime] = createAdjacentQueueTimes()
    const firstIntakeId = await seedShortcutSafetyCase(
      firstQueueTime,
      "First unstructured clinical note",
    )
    testIntakeIds.push(firstIntakeId)
    const secondIntakeId = await seedShortcutSafetyCase(
      secondQueueTime,
      "Second unstructured clinical note",
    )
    testIntakeIds.push(secondIntakeId)

    // Compile and authenticate the lazy review-data route before opening the
    // sheet so this safety assertion measures keyboard behaviour, not a cold
    // Next.js route compile.
    const prewarm = await page.request.get(`/api/doctor/intakes/${firstIntakeId}/review-data`)
    expect(prewarm.ok(), `Review-data prewarm should succeed: ${prewarm.status()}`).toBe(true)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/dashboard?showTestData=1&onlyTestData=1")
    await waitForPageLoad(page)

    const firstRow = page.getByTestId(`queue-row-${firstIntakeId}`)
    const secondRow = page.getByTestId(`queue-row-${secondIntakeId}`)
    await expect(firstRow).toBeVisible({ timeout: 15_000 })
    await expect(secondRow).toBeVisible({ timeout: 15_000 })
    await firstRow.getByRole("button", { name: /Open case/ }).click()

    const panel = page.getByTestId("intake-review-panel")
    const fullRecordLink = panel.getByRole("link", { name: "Open full record" })
    const firstNote = await openDraftNote(panel)
    await expect(fullRecordLink).toHaveAttribute("href", new RegExp(`${firstIntakeId}$`))

    await placeCaretAtEnd(firstNote)
    await firstNote.press("/")
    await expect(firstNote).toContainText("First unstructured clinical note/")
    await expect(firstNote).toBeFocused()
  })

  test("moving the note caret with arrow keys never changes cases", async ({ page }) => {
    const [firstQueueTime, secondQueueTime] = createAdjacentQueueTimes()
    const firstIntakeId = await seedShortcutSafetyCase(
      firstQueueTime,
      "First unstructured clinical note",
    )
    testIntakeIds.push(firstIntakeId)
    const secondIntakeId = await seedShortcutSafetyCase(
      secondQueueTime,
      "Second unstructured clinical note",
    )
    testIntakeIds.push(secondIntakeId)

    const prewarm = await page.request.get(`/api/doctor/intakes/${firstIntakeId}/review-data`)
    expect(prewarm.ok(), `Review-data prewarm should succeed: ${prewarm.status()}`).toBe(true)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/dashboard?showTestData=1&onlyTestData=1")
    await waitForPageLoad(page)

    const firstRow = page.getByTestId(`queue-row-${firstIntakeId}`)
    const secondRow = page.getByTestId(`queue-row-${secondIntakeId}`)
    await expect(firstRow).toBeVisible({ timeout: 15_000 })
    await expect(secondRow).toBeVisible({ timeout: 15_000 })
    await firstRow.getByRole("button", { name: /Open case/ }).click()

    const panel = page.getByTestId("intake-review-panel")
    const fullRecordLink = panel.getByRole("link", { name: "Open full record" })
    const firstNote = await openDraftNote(panel)
    await expect(fullRecordLink).toHaveAttribute("href", new RegExp(`${firstIntakeId}$`))
    await placeCaretAtEnd(firstNote)

    const reviewDataRequests: string[] = []
    page.on("request", (request) => {
      if (/\/api\/doctor\/intakes\/[^/]+\/review-data$/.test(new URL(request.url()).pathname)) {
        reviewDataRequests.push(request.url())
      }
    })

    await firstNote.press("ArrowDown")
    await page.waitForTimeout(900)

    expect(reviewDataRequests).toEqual([])
    await expect(firstNote).toBeFocused()
    await expect(fullRecordLink).toHaveAttribute("href", new RegExp(`${firstIntakeId}$`))

    await panel.getByRole("button", { name: "Next case" }).click()
    await expect(fullRecordLink).toHaveAttribute("href", new RegExp(`${secondIntakeId}$`), { timeout: 15_000 })

    const secondNote = await openDraftNote(panel)
    await placeCaretAtEnd(secondNote)
    reviewDataRequests.length = 0

    await secondNote.press("ArrowUp")
    await page.waitForTimeout(900)

    expect(reviewDataRequests).toEqual([])
    await expect(fullRecordLink).toHaveAttribute("href", new RegExp(`${secondIntakeId}$`))
  })

  test("j/k still navigate cases in the desktop two-pane cockpit once a case is selected", async ({ page }, testInfo) => {
    // Desktop-only two-pane behaviour; the keyboard gate itself is engine-
    // independent JS, so one desktop engine is a sufficient (and non-flaky)
    // regression guard. Mobile projects use the slide-over path already covered
    // by the note-safety tests above.
    test.skip(
      testInfo.project.name !== "chromium",
      "Two-pane keyboard nav regression guard runs on chromium only",
    )

    // Regression guard: the queue keyboard handler previously gated on a ref
    // that flipped true as soon as an inline `expandedId` selection existed,
    // so j/k/Enter/a/d/Escape went dead after the very first keypress. The gate
    // now keys off a real slide-over only, so keyboard triage keeps working
    // while a case is selected in the two-pane layout.
    const [firstQueueTime, secondQueueTime] = createAdjacentQueueTimes()
    const firstIntakeId = await seedShortcutSafetyCase(firstQueueTime, "First desktop nav note")
    testIntakeIds.push(firstIntakeId)
    const secondIntakeId = await seedShortcutSafetyCase(secondQueueTime, "Second desktop nav note")
    testIntakeIds.push(secondIntakeId)

    const prewarm = await page.request.get(`/api/doctor/intakes/${firstIntakeId}/review-data`)
    expect(prewarm.ok(), `Review-data prewarm should succeed: ${prewarm.status()}`).toBe(true)

    // Wide viewport → compactShell two-pane (inline detail, no slide-over).
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/dashboard?showTestData=1&onlyTestData=1")
    await waitForPageLoad(page)

    const firstRow = page.getByTestId(`queue-row-${firstIntakeId}`)
    const secondRow = page.getByTestId(`queue-row-${secondIntakeId}`)
    await expect(firstRow).toBeVisible({ timeout: 15_000 })
    await expect(secondRow).toBeVisible({ timeout: 15_000 })

    const panel = page.getByTestId("intake-review-panel")
    const fullRecordLink = panel.getByRole("link", { name: "Open full record" })

    // Select the first case with a real click. Clicking auto-waits for the row
    // to be actionable (hydrated + listeners attached), so the subsequent
    // keyboard navigation isn't racing hydration. In the two-pane layout this
    // renders the detail inline (no slide-over).
    await firstRow.getByRole("button", { name: /Open case/ }).click()
    await expect(panel).toBeVisible({ timeout: 15_000 })
    await expect(fullRecordLink).toHaveAttribute("href", new RegExp(`${firstIntakeId}$`), { timeout: 15_000 })

    // Dispatch on <body> (a non-interactive target) so the window keydown
    // handler runs exactly as a real body-focused keypress would, independent of
    // which control the click left focused.
    const pressQueueKey = (key: string) =>
      page.evaluate((k) => {
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }))
      }, key)

    // j advances to the adjacent case — the exact navigation that went dead once
    // any case was selected. `createAdjacentQueueTimes` guarantees the second
    // case sorts immediately after the first (same guarantee the Next-case test
    // above relies on).
    await pressQueueKey("j")
    await expect(fullRecordLink).toHaveAttribute("href", new RegExp(`${secondIntakeId}$`), { timeout: 15_000 })

    // k returns to the first case.
    await pressQueueKey("k")
    await expect(fullRecordLink).toHaveAttribute("href", new RegExp(`${firstIntakeId}$`), { timeout: 15_000 })
  })
})

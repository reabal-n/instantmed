import { randomInt, randomUUID } from "node:crypto"

import { expect, type Locator, type Page, test, type WebSocket } from "@playwright/test"

import { loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"
import { waitForPageLoad } from "./helpers/test-utils"

const E2E_OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"
const PRODUCTION_SUPABASE_PROJECT_REF = "witzcrovsoumktyndqgz"

function getSupabaseProjectRef(configuredUrl: string): string | null {
  try {
    const url = new URL(configuredUrl)
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.origin
    }
    if (!url.hostname.endsWith(".supabase.co")) return null
    return url.hostname.split(".")[0] || null
  } catch {
    return null
  }
}

function hasIsolatedRealtimeProject(): boolean {
  if (process.env.E2E_ISOLATED_SUPABASE !== "1") return false

  const configuredUrls = [
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ].filter((url): url is string => Boolean(url))
  if (configuredUrls.length === 0) return false

  const projectRefs = configuredUrls.map(getSupabaseProjectRef)
  if (projectRefs.some((projectRef) => projectRef === null)) return false
  if (new Set(projectRefs).size !== 1) return false

  return projectRefs[0] !== PRODUCTION_SUPABASE_PROJECT_REF
}

interface RealtimeDoctorFixture {
  authUserId: string
  email: string
  password: string
  patientProfileId: string
}

async function createRealtimeDoctor(): Promise<RealtimeDoctorFixture> {
  const supabase = getSupabaseClient()
  const email = `e2e-realtime-doctor-${Date.now()}-${randomUUID()}@example.com`
  const password = `E2e-${randomUUID()}!`
  const profileId = randomUUID()
  const patientProfileId = randomUUID()
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Realtime Doctor" },
  })

  if (authError || !authData.user) {
    throw new Error(`Could not create realtime doctor auth fixture: ${authError?.message || "missing user"}`)
  }

  const authUserId = authData.user.id
  const { error: deletePatientProfileError } = await supabase
    .from("profiles")
    .delete()
    .eq("auth_user_id", authUserId)
  if (deletePatientProfileError) {
    await supabase.auth.admin.deleteUser(authUserId)
    throw new Error(`Could not replace realtime doctor profile: ${deletePatientProfileError.message}`)
  }

  const { error: doctorProfileError } = await supabase.from("profiles").insert({
    id: profileId,
    auth_user_id: authUserId,
    email,
    full_name: "E2E Realtime Doctor",
    role: "doctor",
    doctor_available: true,
    can_review_med_certs: true,
    onboarding_completed: true,
    email_verified: true,
    email_verified_at: new Date().toISOString(),
  })
  if (doctorProfileError) {
    await supabase.auth.admin.deleteUser(authUserId)
    throw new Error(`Could not create realtime doctor profile: ${doctorProfileError.message}`)
  }

  const { error: patientProfileError } = await supabase.from("profiles").insert({
    id: patientProfileId,
    auth_user_id: null,
    email: `e2e-realtime-patient-${patientProfileId}@example.com`,
    full_name: "E2E Realtime Patient",
    date_of_birth: "1990-06-20",
    role: "patient",
    onboarding_completed: true,
    email_verified: true,
    email_verified_at: new Date().toISOString(),
  })
  if (patientProfileError) {
    await supabase.auth.admin.deleteUser(authUserId)
    throw new Error(`Could not create realtime patient profile: ${patientProfileError.message}`)
  }

  return { authUserId, email, password, patientProfileId }
}

async function cleanupRealtimeDoctor(fixture: RealtimeDoctorFixture): Promise<void> {
  const supabase = getSupabaseClient()
  const { error: patientError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", fixture.patientProfileId)
  const { error: doctorError } = await supabase.auth.admin.deleteUser(fixture.authUserId)
  const cleanupErrors = [
    patientError ? `patient profile: ${patientError.message}` : null,
    doctorError ? `doctor auth: ${doctorError.message}` : null,
  ].filter(Boolean)
  if (cleanupErrors.length > 0) {
    throw new Error(`Could not clean up realtime fixtures (${cleanupErrors.join("; ")})`)
  }
}

async function installNotificationProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window as typeof window & {
      __instantmedE2EAudioContextCount: number
      __instantmedE2EToastSeen: boolean
    }
    state.__instantmedE2EAudioContextCount = 0
    state.__instantmedE2EToastSeen = false

    for (const key of ["AudioContext", "webkitAudioContext"] as const) {
      const current = (window as unknown as Record<string, unknown>)[key]
      if (typeof current !== "function") continue

      const tracked = new Proxy(current, {
        construct(target, args, newTarget) {
          state.__instantmedE2EAudioContextCount += 1
          return Reflect.construct(target, args, newTarget)
        },
      })
      Object.defineProperty(window, key, {
        configurable: true,
        writable: true,
        value: tracked,
      })
    }

    const recordToastState = () => {
      if (document.querySelector("[data-sonner-toast]")) {
        state.__instantmedE2EToastSeen = true
      }
    }
    new MutationObserver(recordToastState).observe(document.body, {
      childList: true,
      subtree: true,
    })
  })
}

function waitForQueueRealtimeSubscription(page: Page): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      finish(new Error("Queue Realtime subscription did not become ready"))
    }, 30_000)

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      page.off("websocket", handleWebSocket)
      if (error) reject(error)
      else resolve()
    }

    const handleWebSocket = (socket: WebSocket) => {
      socket.on("framereceived", ({ payload }) => {
        const frame = typeof payload === "string" ? payload : payload.toString()
        if (
          frame.includes('"status":"ok"') &&
          frame.includes("postgres_changes") &&
          frame.includes("queue-updates")
        ) {
          finish()
        }
      })
    }

    page.on("websocket", handleWebSocket)
  })
}

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

    // Realtime reconciliation uses the same router refresh as this explicit
    // queue refresh. Keep the selected review stable across that server merge.
    await page.getByRole("button", { name: "Refresh queue" }).click()
    await expect(fullRecordLink).toHaveAttribute(
      "href",
      new RegExp(`${firstIntakeId}$`),
      { timeout: 15_000 },
    )
  })
})

test.describe("Doctor queue realtime notification policy", () => {
  let doctorFixture: RealtimeDoctorFixture | null = null
  const intakeIds: string[] = []

  test.beforeEach(async ({ browserName }) => {
    test.skip(
      browserName !== "chromium",
      "Realtime notification regression runs on chromium only",
    )
    test.skip(
      !hasIsolatedRealtimeProject(),
      "Isolated non-production Supabase project required for real staff Realtime E2E",
    )
    test.skip(!isDbAvailable(), "Database required for queue Realtime E2E")

    doctorFixture = await createRealtimeDoctor()
  })

  test.afterEach(async ({ page }) => {
    await page.context().clearCookies()
    while (intakeIds.length > 0) {
      const intakeId = intakeIds.pop()
      if (intakeId) await cleanupTestIntake(intakeId)
    }
    if (doctorFixture) {
      await cleanupRealtimeDoctor(doctorFixture)
      doctorFixture = null
    }
  })

  test("a newly paid request enters the queue without disturbing an open review", async ({ page }) => {
    if (!doctorFixture) throw new Error("Realtime doctor fixture was not created")

    const existing = await seedTestIntake({
      status: "paid",
      payment_status: "paid",
      category: "medical_certificate",
      patient_id: doctorFixture.patientProfileId,
    })
    if (!existing.success || !existing.intakeId) {
      throw new Error(existing.error || "Could not seed existing realtime queue intake")
    }
    intakeIds.push(existing.intakeId)

    const pending = await seedTestIntake({
      status: "pending_payment",
      payment_status: "pending",
      category: "medical_certificate",
      patient_id: doctorFixture.patientProfileId,
    })
    if (!pending.success || !pending.intakeId) {
      throw new Error(pending.error || "Could not seed pending-payment realtime intake")
    }
    intakeIds.push(pending.intakeId)

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/sign-in?redirect=%2Fdashboard")
    await waitForPageLoad(page)
    await page.getByLabel("Email address").fill(doctorFixture.email)
    await page.getByLabel("Password").fill(doctorFixture.password)
    await Promise.all([
      waitForQueueRealtimeSubscription(page),
      page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 30_000 }),
      page.getByRole("button", { name: "Sign in", exact: true }).click(),
    ])
    await waitForPageLoad(page)

    const existingRow = page.getByTestId(`queue-row-${existing.intakeId}`)
    const arrivingRow = page.getByTestId(`queue-row-${pending.intakeId}`)
    await expect(existingRow).toBeVisible({ timeout: 15_000 })
    await expect(arrivingRow).toHaveCount(0)

    await existingRow.getByRole("button", { name: /Open case/ }).click()
    const reviewPanel = page.getByTestId("intake-review-panel")
    const fullRecordLink = reviewPanel.getByRole("link", { name: "Open full record" })
    await expect(reviewPanel).toBeVisible({ timeout: 15_000 })
    await expect(fullRecordLink).toHaveAttribute(
      "href",
      new RegExp(`${existing.intakeId}$`),
      { timeout: 15_000 },
    )
    await installNotificationProbe(page)

    const paidAt = new Date().toISOString()
    const queueDeadline = new Date(Date.UTC(2000, 0, 1)).toISOString()
    const { data: transitioned, error: transitionError } = await getSupabaseClient()
      .from("intakes")
      .update({
        status: "paid",
        payment_status: "paid",
        paid_at: paidAt,
        submitted_at: paidAt,
        sla_deadline: queueDeadline,
        is_priority: true,
        updated_at: paidAt,
      })
      .eq("id", pending.intakeId)
      .eq("status", "pending_payment")
      .select("id")
      .single()

    expect(transitionError, `Paid transition should succeed: ${transitionError?.message}`).toBeNull()
    expect(transitioned?.id).toBe(pending.intakeId)
    await expect(arrivingRow).toBeVisible({ timeout: 15_000 })
    await expect(fullRecordLink).toHaveAttribute(
      "href",
      new RegExp(`${existing.intakeId}$`),
      { timeout: 15_000 },
    )

    const notificationResult = await page.evaluate(() => {
      const state = window as typeof window & {
        __instantmedE2EAudioContextCount?: number
        __instantmedE2EToastSeen?: boolean
      }
      return {
        audioContextCount: state.__instantmedE2EAudioContextCount ?? 0,
        toastSeen: state.__instantmedE2EToastSeen ?? false,
      }
    })
    expect(notificationResult.audioContextCount).toBe(0)
    expect(notificationResult.toastSeen).toBe(false)
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0)
  })
})

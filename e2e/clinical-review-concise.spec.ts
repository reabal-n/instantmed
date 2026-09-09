import { join } from "node:path"

import { expect, type Locator, type Page, type Route, test } from "@playwright/test"

import { loginAsDoctor, loginAsOperator, logoutTestUser } from "./helpers/auth"
import {
  cleanupTestIntake,
  getIntakeById,
  getSupabaseClient,
  isDbAvailable,
  seedTestIntake,
} from "./helpers/db"

const browserErrors = new WeakMap<Page, string[]>()
const expectedNetworkAbort = new WeakSet<Page>()

const OPERATOR_ID = "e2e00000-0000-0000-0000-000000000001"
const SEED_ONLY_QUEUE = "/dashboard?showTestData=1&onlyTestData=1"
const DIRECTIONS = "Take one tablet each evening with food. Keep the dose unchanged until reviewed by the regular prescriber."
const INDICATION = "Patient reports cholesterol treatment"
const SOAP = "S: Synthetic patient reports an unchanged regimen.\nO: Patient-entered answers reviewed.\nA: Draft assessment for clinician review.\nP: Clarify uncertainties before prescribing."
const ANSWERS = {
  medicationName: "Atorvastatin",
  medicationStrength: "20 mg",
  medicationForm: "tablet",
  currentDose: DIRECTIONS,
  indication: INDICATION,
  prescriptionHistory: "Previously prescribed by regular GP",
  doseChanged: false,
  hasSideEffects: false,
  hasAllergies: false,
  hasConditions: false,
  hasOtherMedications: false,
  isPregnantOrBreastfeeding: "no",
  hasAdverseMedicationReactions: "no",
}
const ED_ANSWERS = {
  consultSubtype: "ed", edDuration: "6_to_12_months", edErectionFrequency: 3, edPreference: "prn",
  edNitrates: false, edRecentHeartEvent: false, edSevereHeart: false, edAlphaBlockers: false,
  previousEdMeds: true, edPreviousTreatment: "Sildenafil 50 mg",
  has_allergies: false, has_conditions: false, takes_medications: false,
}

// Ledger intentionally has no browser test here. Its initial SSR has no
// seed-only filter, and ?q redirects before querying (search is POST-only).
// Never open an unfiltered Ledger against the shared E2E project merely to
// reach a synthetic row. Shared component tests cover its packet consumer;
// actual Ledger browser parity requires an isolated database.

async function openQueueCase(page: Page, intakeId: string): Promise<Locator> {
  const prewarm = await page.request.get(`/api/doctor/intakes/${intakeId}/review-data`)
  expect(prewarm.ok(), "Synthetic review-data prewarm must succeed").toBe(true)
  await page.goto(SEED_ONLY_QUEUE)
  const row = page.getByTestId(`queue-row-${intakeId}`)
  await expect(row).toBeVisible({ timeout: 30_000 })
  await row.getByRole("button", { name: /Open case for/i }).click()
  const panel = page.getByTestId("intake-review-panel")
  await expect(panel.getByRole("region", { name: "Request packet" })).toBeVisible({ timeout: 30_000 })
  return panel
}

async function openNote(panel: Locator): Promise<Locator> {
  const disclosure = panel.getByRole("button", { name: /Draft note/ }).first()
  if (await disclosure.getAttribute("aria-expanded") !== "true") await disclosure.click()
  const note = panel.getByRole("textbox", { name: "Draft clinical note Subjective", exact: true })
  await expect(note).toBeVisible()
  return note
}

async function persistedNote(page: Page, intakeId: string): Promise<string> {
  const response = await page.request.get(`/api/doctor/intakes/${intakeId}/review-data`)
  expect(response.ok()).toBe(true)
  const payload = await response.json()
  return payload.intake?.doctor_notes || ""
}

function ownsAction(route: Pick<Route, "request">, intakeId: string): boolean {
  const request = route.request()
  return request.method() === "POST"
    && Boolean(request.headers()["next-action"])
    && (request.postData() || "").includes(intakeId)
}

// Block owned portal actions before they reach the server. The only allowed
// owned mutation here is the known [intakeId, SOAP note] save signature. This
// fails closed if action transport changes; generic-name copy has its own E2E.
async function preventProviderSession(page: Page, intakeId: string): Promise<() => Promise<void>> {
  const intercept = async (route: Route) => {
    if (ownsAction(route, intakeId)) {
      let args: unknown
      try { args = route.request().postDataJSON() } catch { args = null }
      const isNoteSave = Array.isArray(args) && args.length === 2
        && args[0] === intakeId && typeof args[1] === "string"
        && /^S:/.test(args[1]) && args[1].includes("\nP:")
      if (!isNoteSave) {
        expectedNetworkAbort.add(page)
        await route.abort("failed")
        return
      }
    }
    await route.continue()
  }
  await page.route("**/*", intercept)
  return () => page.unroute("**/*", intercept)
}

async function assertSourceFacts(packet: Locator, directions = DIRECTIONS) {
  await expect(packet).toContainText("Atorvastatin")
  await expect(packet).toContainText("20 mg")
  await expect(packet.getByText(directions, { exact: true })).toBeVisible()
  await expect(packet.getByText(INDICATION, { exact: true })).toBeVisible()
  await expect(packet).toContainText(/not separately captured/i)
  // Indication and the explicit negative conditions answer both remain
  // visible. An indication is not reclassified as a diagnosis/conflict.
  await expect(packet).toContainText(/No conditions/)
}

async function assertNotClipped(control: Locator) {
  await expect(control).toBeInViewport()
  const clipped = await control.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    let parent = element.parentElement
    while (parent) {
      const style = getComputedStyle(parent)
      const box = parent.getBoundingClientRect()
      if (["hidden", "clip", "auto", "scroll"].includes(style.overflowY)
        && (bounds.top < box.top - 1 || bounds.bottom > box.bottom + 1)) return true
      if (["hidden", "clip", "auto", "scroll"].includes(style.overflowX)
        && (bounds.left < box.left - 1 || bounds.right > box.right + 1)) return true
      parent = parent.parentElement
    }
    return false
  })
  expect(clipped, "Primary action must fit every clipping ancestor").toBe(false)
}

test.describe("Concise clinical review", () => {
  // Each case owns its seed/cleanup. Run sequentially without replaying the whole group on retry.
  test.describe.configure({ mode: "default", timeout: 120_000 })
  const intakeIds: string[] = []

  async function seedCase({
    answers = ANSWERS as Record<string, unknown>,
    status = "in_review",
    claimedBy = OPERATOR_ID,
    ed = false,
  }: { answers?: Record<string, unknown>; status?: string; claimedBy?: string; ed?: boolean } = {}) {
    const db = getSupabaseClient()
    const serviceId = ed ? "e2e00000-0000-0000-0000-000000000022" : undefined
    if (ed) {
      const service = await db.from("services").upsert({
        id: serviceId!, slug: "consult-e2e", name: "E2E Consult", short_name: "E2E Consult",
        description: "Deterministic E2E consult service", type: "consult", price_cents: 4995, is_active: true,
      }, { onConflict: "id" })
      expect(service.error).toBeNull()
    }
    const seed = await seedTestIntake({ status, service_id: serviceId, category: ed ? "consult" : "prescription", payment_status: "paid", claimed_by: claimedBy })
    expect(seed.success, seed.error).toBe(true)
    const id = seed.intakeId!
    intakeIds.push(id)
    const isolated = await db.from("intakes")
      .select("exclude_from_reporting, paid_request_telegram_message_id")
      .eq("id", id).single()
    expect(isolated.error).toBeNull()
    expect(isolated.data?.exclude_from_reporting).toBe(true)
    expect(isolated.data?.paid_request_telegram_message_id).toBeNull()
    const inserted = await db.from("intake_answers").insert({ intake_id: id, answers })
    expect(inserted.error).toBeNull()
    const note = await db.from("intakes").update({
      doctor_notes: SOAP,
      amount_cents: ed ? 4995 : 2995,
      // Keep these layout fixtures out of the queue timer's first-minute
      // second-by-second SSR hydration race. Console assertions stay strict.
      paid_at: new Date(Date.now() - (5 * 60 + 15) * 1000).toISOString(),
      ...(ed ? { subtype: "ed" } : {}),
    }).eq("id", id)
    expect(note.error).toBeNull()
    return id
  }

  test.beforeEach(async ({ page }) => {
    const errors: string[] = []
    browserErrors.set(page, errors)
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() !== "error") return
      if (expectedNetworkAbort.has(page) && message.text() === "Failed to load resource: net::ERR_FAILED") return
      errors.push(message.text())
    })
    expect(isDbAvailable(), "Clinical review E2E requires the seeded database").toBe(true)
    const login = await loginAsOperator(page)
    expect(login.success, login.error).toBe(true)
    await page.emulateMedia({ reducedMotion: "reduce" })
  })

  test.afterEach(async ({ page }) => {
    try {
      expect(browserErrors.get(page), "No unexpected browser console or runtime errors").toEqual([])
    } finally {
      await logoutTestUser(page)
      for (const id of intakeIds.splice(0)) await cleanupTestIntake(id)
    }
  })

  for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
    for (const theme of ["light", "dark"] as const) {
      test(`keeps source facts and actions accessible at ${viewport.width} in ${theme}`, async ({ page }) => {
        const intakeId = await seedCase()
        await page.setViewportSize(viewport)
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
        await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
        const panel = await openQueueCase(page, intakeId)
        await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /light/)
        const packet = panel.getByRole("region", { name: "Request packet" })
        await assertSourceFacts(packet)
        if (viewport.width === 1366) {
          // Initial laptop composition: do not scroll these into view first.
          for (const key of ["medicine", "patient_dose", "frequency", "indication"]) {
            await assertNotClipped(packet.locator(`[data-review-fact="${key}"]`))
          }
        }
        await expect(panel.getByRole("heading", { name: "E2E Test Patient", exact: true }).first()).toBeVisible()
        await assertNotClipped(panel.getByRole("button", { name: "Prescribe", exact: true }))
        await expect(panel.getByRole("button", { name: "Complete request", exact: true })).toBeDisabled()
        const artifactDir = process.env.E2E_CLINICAL_QA_ARTIFACT_DIR
        if (artifactDir) await page.screenshot({ path: join(artifactDir, `${viewport.width}-${theme}-initial.png`) })
        // CSS/viewport inspection verifies actual overflow; it cannot pass
        // solely because a component sets a "verified" marker on itself.
        expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
        await packet.getByText(DIRECTIONS, { exact: true }).scrollIntoViewIfNeeded()
        await expect(packet.getByText(DIRECTIONS, { exact: true })).toBeVisible()
        await assertNotClipped(panel.getByRole("button", { name: "Prescribe", exact: true }))
        await openNote(panel)
        await panel.getByRole("button", { name: /Draft note/ }).first().scrollIntoViewIfNeeded()
        await expect(panel.getByText("Saved", { exact: true }).first()).toBeVisible()
        if (artifactDir) await page.screenshot({ path: join(artifactDir, `${viewport.width}-${theme}-note-header.png`) })
      })

      test(`keeps ED screening compact and prescribing details optional at ${viewport.width} in ${theme}`, async ({ page }) => {
        const intakeId = await seedCase({ ed: true, answers: ED_ANSWERS, status: "awaiting_script" })
        await page.setViewportSize(viewport)
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
        await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
        const panel = await openQueueCase(page, intakeId)
        await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /light/)
        const packet = panel.getByRole("region", { name: "Request packet" })
        const negatives = packet.locator('[data-review-negative-screening="true"]')
        await expect(negatives.locator("[data-review-fact]")).toHaveCount(4)
        for (const label of ["Nitrate use", "Recent heart event", "Severe heart condition", "Alpha blockers"]) {
          await expect(negatives).toContainText(label)
        }
        await expect(packet.locator('[data-review-fact="blood_pressure_medication"]')).toHaveCount(0)
        await expect(packet.locator('[data-review-fact="previous_ed_medication"]')).toContainText("Sildenafil 50 mg")
        await expect(packet.locator('[data-review-fact="previous_treatment_detail"]')).toHaveCount(0)
        await expect(panel.getByText("Awaiting Script", { exact: true })).toHaveCount(0)
        await expect(panel.locator("[data-prescribing-state]")).toHaveCount(1)
        if (viewport.width === 1366) {
          await assertNotClipped(packet.locator('[data-review-clinical-context="true"]'))
          await assertNotClipped(negatives)
        }
        const stopBlocking = await preventProviderSession(page, intakeId)
        try {
          await panel.getByRole("button", { name: "Prescribe", exact: true }).click()
          const portal = page.getByRole("dialog", { name: /^Prescribe for / })
          await expect(portal).toBeVisible()
          const reference = portal.locator("[data-parchment-medication-context]")
          await expect(reference.getByText("Sildenafil 50mg tablet", { exact: true })).toBeVisible()
          await expect(reference.getByText("Take 1 tablet 1 hour before sexual activity. Maximum 1 tablet per 24 hours.", { exact: true })).toBeVisible()
          await expect(reference.getByText("Erectile dysfunction consult", { exact: true })).toBeVisible()
          await expect(reference.locator('[data-parchment-provenance="template"]')).toBeVisible()
          const details = reference.getByRole("button", { name: "Clinical details", exact: true })
          await expect(details).toHaveAttribute("aria-expanded", "false")
          await expect(reference.locator('[data-parchment-assessment-fact="nitrate_use"]')).not.toBeVisible()
          await expect(reference.getByText(/not separately captured/i)).not.toBeVisible()
          // Measure rendered content before disclosure: routine assessment
          // must leave at least two-thirds of the viewport for prescribing.
          expect((await reference.boundingBox())!.height).toBeLessThan(viewport.height / 3)
          await assertNotClipped(details)
          await details.focus()
          await page.keyboard.press("Enter")
          await expect(details).toHaveAttribute("aria-expanded", "true")
          await expect(reference.locator('[data-parchment-assessment-fact="nitrate_use"]')).toContainText("No")
          await expect(reference.locator('[data-parchment-assessment-fact="previous_ed_medication"]')).toContainText("Sildenafil 50 mg")
          await details.click()
          await expect(details).toHaveAttribute("aria-expanded", "false")
          await portal.getByRole("button", { name: "Close panel", exact: true }).click()
          await assertNotClipped(panel.getByRole("button", { name: "Prescribe", exact: true }))
          await expect(panel.getByRole("button", { name: "Complete request", exact: true })).toBeDisabled()
          expect((await getIntakeById(intakeId))?.script_sent).toBe(false)
        } finally { await stopBlocking() }
      })
    }
  }

  test("keeps positive and unanswered ED screens distinct from explicit negatives", async ({ page }) => {
    const answers: Record<string, unknown> = { ...ED_ANSWERS, edAlphaBlockers: true }
    delete answers.edRecentHeartEvent
    const intakeId = await seedCase({ ed: true, answers })
    const panel = await openQueueCase(page, intakeId)
    const packet = panel.getByRole("region", { name: "Request packet" })
    const negatives = packet.locator('[data-review-negative-screening="true"]')
    await expect(negatives.locator("[data-review-fact]")).toHaveCount(2)
    await expect(negatives).not.toContainText("Alpha blockers")
    await expect(negatives).not.toContainText("Recent heart event")
    await expect(packet.locator('[data-review-fact="alpha_blockers"]')).toContainText("Yes")
    await expect(packet.locator('[data-review-fact="recent_heart_event"]')).toContainText("Not recorded")
    const stopBlocking = await preventProviderSession(page, intakeId)
    try {
      await panel.getByRole("button", { name: "Prescribe", exact: true }).click()
      const portal = page.getByRole("dialog", { name: /^Prescribe for / })
      const reference = portal.locator("[data-parchment-medication-context]")
      await expect(reference.getByRole("button", { name: "Clinical details", exact: true })).toHaveAttribute("aria-expanded", "false")
      await expect(reference.getByText("Alpha blocker use", { exact: true })).toBeVisible()
      await portal.getByRole("button", { name: "Close panel", exact: true }).click()
    } finally { await stopBlocking() }
    await expect(panel.getByRole("button", { name: "Complete request", exact: true })).toBeDisabled()
  })

  test("keeps the same patient facts on queue and exact admin/doctor records", async ({ page }) => {
    const intakeId = await seedCase()
    const panel = await openQueueCase(page, intakeId)
    await assertSourceFacts(panel.getByRole("region", { name: "Request packet" }))
    for (const rolePath of ["admin", "doctor"]) {
      await page.goto(`/${rolePath}/intakes/${intakeId}`)
      const packet = page.getByRole("region", { name: "Request packet" })
      await expect(packet).toHaveCount(1)
      await assertSourceFacts(packet)
    }
  })

  test("shows exact directions and indication without expanding the modal or inventing frequency", async ({ page }) => {
    const intakeId = await seedCase()
    const panel = await openQueueCase(page, intakeId)
    const stopBlocking = await preventProviderSession(page, intakeId)
    try {
      await panel.getByRole("button", { name: "Prescribe", exact: true }).click()
      const portal = page.getByRole("dialog", { name: /^Prescribe for / })
      await expect(portal).toBeVisible()
      await expect(portal.getByText(DIRECTIONS, { exact: true })).toBeVisible()
      await expect(portal.getByText(INDICATION, { exact: true })).toBeVisible()
      await expect(portal.getByText(/not separately captured/i)).not.toBeVisible()
      await expect(portal.getByRole("button", { name: "Copy patient-reported frequency" })).toHaveCount(0)
      await portal.getByRole("button", { name: "Close panel", exact: true }).click()
      await expect(page.getByTestId("intake-review-panel")).toBeVisible()
      expect((await getIntakeById(intakeId))?.script_sent).toBe(false)
    } finally { await stopBlocking() }
  })

  test("retains multi-section typing through disclosure, profile, prescribing and immediate case navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    const intakeId = await seedCase()
    const nextId = await seedCase()
    let panel = await openQueueCase(page, intakeId)
    let subjective = await openNote(panel)
    // Saved A → held autosave B → revert to A must enqueue a compensating save.
    let releaseRevertSave = () => {}
    let revertSaves = 0
    const revertedSave = new Promise<void>((resolve) => { releaseRevertSave = resolve })
    const holdRevertSave = async (route: Route) => {
      if (ownsAction(route, intakeId)) {
        revertSaves += 1
        if (revertSaves === 1) await revertedSave
      }
      await route.continue()
    }
    await page.route("**/*", holdRevertSave)
    try {
      await subjective.fill("Edited B while the original saved note is acknowledged.")
      await expect.poll(() => revertSaves).toBe(1)
      await subjective.fill("Synthetic patient reports an unchanged regimen.")
      releaseRevertSave()
      await expect.poll(() => revertSaves).toBeGreaterThanOrEqual(2)
      await expect.poll(() => persistedNote(page, intakeId)).toBe(SOAP)
    } finally {
      releaseRevertSave()
      await page.unroute("**/*", holdRevertSave)
    }
    await subjective.fill("")
    await subjective.pressSequentially("Patient reports symptoms with spaces.")
    await subjective.press("Enter")
    await subjective.pressSequentially("Second line remains intact.")
    const text = "Patient reports symptoms with spaces.\nSecond line remains intact."
    await expect(subjective).toHaveValue(text)
    const objective = panel.getByRole("textbox", { name: "Draft clinical note Objective", exact: true })
    const initialHeight = await objective.evaluate((element) => element.getBoundingClientRect().height)
    const expandedText = Array.from({ length: 16 }, (_, index) => `Synthetic observation ${index + 1}: preserve the clinician's exact wording.`).join("\n")
    await objective.fill(expandedText)
    await expect.poll(() => objective.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(initialHeight)
    await expect.poll(() => objective.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true)
    const plan = panel.getByRole("textbox", { name: "Draft clinical note Plan", exact: true })
    await plan.fill("Clarify the original directions; preserve each qualifier.")
    await expect.poll(() => persistedNote(page, intakeId)).toContain(text)
    await expect.poll(() => persistedNote(page, intakeId)).toContain(expandedText)
    await expect.poll(() => persistedNote(page, intakeId)).toContain("Clarify the original directions; preserve each qualifier.")
    await expect(panel.getByText("Saved", { exact: true }).first()).toBeVisible()
    await panel.getByRole("button", { name: /Draft note/ }).first().click()
    subjective = await openNote(panel)
    await expect(subjective).toHaveValue(text)
    await panel.getByRole("button", { name: "View profile", exact: true }).click()
    const profile = page.getByRole("dialog", { name: "Patient profile" })
    await expect(profile).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(profile).toBeHidden()
    const stopBlocking = await preventProviderSession(page, intakeId)
    try {
      const saveCompleted = page.waitForResponse(async (response) => {
        if (!ownsAction(response, intakeId)
          || !(response.request().postData() || "").includes("Saved before prescribing opens.")) return false
        await response.finished()
        return true
      }, { timeout: 30_000 })
      await subjective.fill(`${text}\nSaved before prescribing opens.`)
      const [saveResponse] = await Promise.all([
        saveCompleted,
        panel.getByRole("button", { name: "Prescribe", exact: true }).click(),
      ])
      expect(saveResponse.ok()).toBe(true)
      expect(await saveResponse.finished()).toBeNull()
      const portal = page.getByRole("dialog", { name: /^Prescribe for / })
      await expect(portal).toBeVisible()
      await portal.getByRole("button", { name: "Close panel", exact: true }).click()
      panel = page.getByTestId("intake-review-panel")
      subjective = await openNote(panel)
      await expect(subjective).toHaveValue(`${text}\nSaved before prescribing opens.`)
      await expect.poll(() => persistedNote(page, intakeId)).toContain("Saved before prescribing opens.")
    } finally { await stopBlocking() }
    let releaseSave = () => {}
    let saves = 0
    const heldSave = new Promise<void>((resolve) => { releaseSave = resolve })
    const holdFirstSave = async (route: Route) => {
      if (ownsAction(route, intakeId) && (route.request().postData() || "").includes("Saved before switching cases.")) {
        saves += 1
        if (saves === 1) await heldSave
      }
      await route.continue()
    }
    await page.route("**/*", holdFirstSave)
    const finalText = `${text}\nSaved before switching cases. More typing while save is held.`
    try {
      await subjective.fill(`${text}\nSaved before switching cases.`)
      await page.getByTestId(`queue-row-${nextId}`).getByRole("button", { name: /Open case for/i }).click()
      await expect.poll(() => saves).toBe(1)
      await subjective.press("ControlOrMeta+End")
      await subjective.pressSequentially(" More typing while save is held.")
      await expect(subjective).toHaveValue(finalText)
      releaseSave()
      await expect.poll(() => persistedNote(page, intakeId)).toContain(finalText)
      expect(saves).toBeGreaterThanOrEqual(2)
    } finally {
      releaseSave()
      await page.unroute("**/*", holdFirstSave)
    }
    await page.getByTestId(`queue-row-${intakeId}`).getByRole("button", { name: /Open case for/i }).click()
    subjective = await openNote(page.getByTestId("intake-review-panel"))
    await expect(subjective).toHaveValue(finalText)
    await subjective.evaluate((element) => {
      const textarea = element as HTMLTextAreaElement
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    })
    expect(await subjective.evaluate((element) => (element as HTMLTextAreaElement).selectionStart)).toBe(finalText.length)
    await subjective.press("Enter")
    await subjective.pressSequentially("P: quoted marker")
    await subjective.press("Enter")
    await subjective.pressSequentially("Continued typing retains trailing spaces.  ")
    const markerText = `${finalText}\nP: quoted marker\nContinued typing retains trailing spaces.  `
    await expect(subjective).toHaveValue(markerText)
    await expect.poll(() => persistedNote(page, intakeId)).toContain(markerText)
    const savedMarkerNote = await persistedNote(page, intakeId)
    await page.goto(`/admin/intakes/${intakeId}`)
    await page.getByRole("button", { name: /Draft note/ }).first().click()
    const plainNote = page.getByRole("textbox", { name: "Draft clinical note", exact: true })
    await expect(plainNote).toHaveValue(savedMarkerNote)
    await plainNote.fill("")
    // Check raw API equality: a helper that coalesces null to empty would hide this regression.
    await expect.poll(async () => {
      const response = await page.request.get(`/api/doctor/intakes/${intakeId}/review-data`)
      expect(response.ok()).toBe(true)
      return (await response.json()).intake.doctor_notes
    }).toBe("")
    await page.reload()
    await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible()
    await page.getByRole("button", { name: /Draft note/ }).first().click()
    await expect(page.getByRole("textbox", { name: "Draft clinical note", exact: true })).toHaveValue("")
    expect((await getIntakeById(intakeId))?.status).toBe("in_review")
  })

  test("keeps failed-save content recoverable and blocks closing until retry saves", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const intakeId = await seedCase()
    const panel = await openQueueCase(page, intakeId)
    const subjective = await openNote(panel)
    const unsaved = "Synthetic failed-save text must remain recoverable."
    let rejectedSaves = 0
    const rejectSave = async (route: Route) => {
      if (ownsAction(route, intakeId) && (route.request().postData() || "").includes(unsaved)) {
        rejectedSaves += 1
        expectedNetworkAbort.add(page)
        await route.abort("failed")
      } else await route.continue()
    }
    await page.route("**/*", rejectSave)
    try {
      await subjective.fill(unsaved)
      await expect.poll(() => rejectedSaves).toBeGreaterThan(0)
      await expect(panel.getByText("Save failed", { exact: true })).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(panel).toBeVisible()
      await expect(subjective).toHaveValue(unsaved)
      expect(await persistedNote(page, intakeId)).not.toContain(unsaved)
    } finally { await page.unroute("**/*", rejectSave) }
    await panel.getByRole("button", { name: /Retry save/i }).click()
    await expect.poll(() => persistedNote(page, intakeId)).toContain(unsaved)
    await expect(panel.getByText("Saved", { exact: true }).first()).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(panel).toBeHidden()
    const reopened = await openQueueCase(page, intakeId)
    await expect(await openNote(reopened)).toHaveValue(unsaved)
  })

  for (const status of ["paid", "in_review", "pending_info", "awaiting_script"]) {
    test(`bounds Request information for ${status}`, async ({ page }) => {
      const intakeId = await seedCase({ status })
      const panel = await openQueueCase(page, intakeId)
      const requestInfo = panel.getByRole("button", { name: "Request information", exact: true })
      if (status === "awaiting_script") {
        await expect(requestInfo).toBeDisabled()
        await expect(requestInfo).toHaveAccessibleDescription("Information cannot be requested while awaiting a script.")
        await expect(panel.locator("#queue-completion-hint")).toHaveText("Complete or record the prescription in Parchment first.")
        await expect(panel.getByRole("button", { name: "Complete request", exact: true })).toHaveAccessibleDescription("Complete or record the prescription in Parchment first.")
        await expect(panel.getByText("Awaiting Script", { exact: true })).toHaveCount(0)
        return
      }
      await expect(requestInfo).toBeEnabled()
      await requestInfo.click()
      const dialog = page.getByRole("dialog", { name: /Request (?:More )?Information/i })
      await expect(dialog).toBeVisible()
      const send = dialog.getByRole("button", { name: "Send Request", exact: true })
      await expect(send).toBeDisabled()
      await dialog.getByRole("combobox").click()
      await page.getByRole("option", { name: /Other/i }).click()
      const message = "Synthetic clarification: please confirm the directions printed on your current label."
      await dialog.getByPlaceholder("Explain what you need...").fill(message)
      await expect(send).toBeEnabled()
      // E2E sendEmail skips external delivery. This exercises the real action
      // and durable pending_info transition, not an email-provider claim.
      const [requestResponse] = await Promise.all([
        page.waitForResponse(async (response) => {
          if (!ownsAction(response, intakeId) || !(response.request().postData() || "").includes(message)) return false
          await response.finished()
          return true
        }, { timeout: 30_000 }),
        send.click(),
      ])
      expect(requestResponse.ok()).toBe(true)
      expect(await requestResponse.finished()).toBeNull()
      await expect(dialog).toBeHidden()
      await expect.poll(async () => (await getIntakeById(intakeId))?.status).toBe("pending_info")
      // Already-pending requests must create a new message, not just keep the same status.
      const savedMessages = await getSupabaseClient().from("patient_messages")
        .select("content, sender_type").eq("intake_id", intakeId)
      expect(savedMessages.error).toBeNull()
      expect(savedMessages.data).toEqual([{ content: message, sender_type: "doctor" }])
    })
  }

  test("another doctor's lock keeps prescribing and clarification unavailable", async ({ page }) => {
    const intakeId = await seedCase()
    await logoutTestUser(page)
    const login = await loginAsDoctor(page)
    expect(login.success, login.error).toBe(true)
    // Seed-only dashboard flags are admin-only; use the exact synthetic
    // record when testing a doctor account rather than a mixed queue.
    await page.goto(`/doctor/intakes/${intakeId}`)
    await expect(page.getByRole("region", { name: "Request packet" })).toBeVisible()
    await expect(page.getByText(/(?:claimed|reviewed|locked).*another doctor|another doctor.*(?:claim|review)/i).first()).toBeVisible()
    for (const label of ["Prescribe", "Request information", "Complete request"]) {
      const button = page.getByRole("button", { name: label, exact: true })
      if (await button.count()) await expect(button).toBeDisabled()
    }
    expect((await getIntakeById(intakeId))?.claimed_by).toBe(OPERATOR_ID)
    expect((await getIntakeById(intakeId))?.script_sent).toBe(false)
  })

  test("retains a failed clarification draft through close and the Request symptoms shortcut", async ({ page }) => {
    const seed = await seedTestIntake({
      category: "medical_certificate", status: "in_review", claimed_by: OPERATOR_ID,
    })
    expect(seed.success, seed.error).toBe(true)
    const intakeId = seed.intakeId!
    intakeIds.push(intakeId)
    const db = getSupabaseClient()
    const inserted = await db.from("intake_answers").insert({
      intake_id: intakeId, answers: { certificateType: "work", duration: "1 day" },
    })
    expect(inserted.error).toBeNull()
    const noteSeed = await db.from("intakes").update({ doctor_notes: "Synthetic clinical note for clarification draft retention verification." }).eq("id", intakeId)
    expect(noteSeed.error).toBeNull()
    await page.goto(`/admin/intakes/${intakeId}`)
    const shortcut = page.getByRole("button", { name: "Request symptoms", exact: true })
    await expect(shortcut).toBeEnabled()
    await shortcut.click()
    const dialog = page.getByRole("dialog", { name: "Request More Information", exact: true })
    const message = dialog.getByRole("textbox")
    await expect(message).toHaveValue(/brief description of your symptoms/)
    const draft = "Synthetic clarification: please describe when the headache started."
    await message.fill(draft)
    let rejectedRequests = 0
    const rejectRequest = async (route: Route) => {
      if (ownsAction(route, intakeId) && (route.request().postData() || "").includes(draft)) {
        rejectedRequests += 1
        expectedNetworkAbort.add(page)
        await route.abort("failed")
      } else await route.continue()
    }
    await page.route("**/*", rejectRequest)
    try {
      await dialog.getByRole("button", { name: "Send Request", exact: true }).click()
      await expect.poll(() => rejectedRequests, { timeout: 30_000 }).toBeGreaterThan(0)
      await expect(dialog.getByRole("alert")).toContainText("draft is retained")
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
      await shortcut.click()
      await expect(message).toHaveValue(draft)
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
      await page.getByRole("button", { name: "Request information", exact: true }).click()
      await expect(message).toHaveValue(draft)
      expect((await getIntakeById(intakeId))?.status).toBe("in_review")
    } finally { await page.unroute("**/*", rejectRequest) }
  })

  test("saves before a held clinical decision, blocks edits and navigation, and recovers on failure", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    const intakeId = await seedCase()
    const recorded = await getSupabaseClient().from("intakes")
      .update({ script_sent: true, script_sent_at: new Date().toISOString() }).eq("id", intakeId)
    expect(recorded.error).toBeNull()
    const panel = await openQueueCase(page, intakeId)
    const subjective = await openNote(panel)
    let releaseDecision = () => {}
    let releaseFirstSave = () => {}
    let firstSaveStarted = false
    const heldFirstSave = new Promise<void>((resolve) => { releaseFirstSave = resolve })
    let decisionStarted = false
    const heldDecision = new Promise<void>((resolve) => { releaseDecision = resolve })
    const holdDecision = async (route: Route) => {
      if (ownsAction(route, intakeId)) {
        let args: unknown
        try { args = route.request().postDataJSON() } catch { args = null }
        const isNoteSave = Array.isArray(args) && args.length === 2 && args[0] === intakeId
          && typeof args[1] === "string" && /^S:/.test(args[1]) && args[1].includes("\nP:")
        if (isNoteSave && !firstSaveStarted) {
          firstSaveStarted = true
          await heldFirstSave
        }
        if (!isNoteSave) {
          decisionStarted = true
          await heldDecision
          expectedNetworkAbort.add(page)
          await route.abort("failed")
          return
        }
      }
      await route.continue()
    }
    await page.route("**/*", holdDecision)
    const text = "Clinical reasoning before a held completion.  "
    try {
      await subjective.fill(text)
      await panel.getByRole("link", { name: "Open full record", exact: true }).click()
      await expect.poll(() => firstSaveStarted).toBe(true)
      await panel.getByRole("button", { name: "Complete request", exact: true }).click()
      await expect(subjective).toHaveAttribute("readonly", "")
      releaseFirstSave()
      await expect.poll(() => decisionStarted).toBe(true)
      expect(await persistedNote(page, intakeId)).toBe(SOAP.replace("Synthetic patient reports an unchanged regimen.", text))
      await expect(subjective).toHaveAttribute("readonly", "")
      await panel.getByRole("button", { name: "View profile", exact: true }).click()
      await expect(page.getByRole("dialog", { name: "Patient profile", exact: true })).toBeHidden()
      await panel.getByRole("link", { name: "Open full record", exact: true }).click()
      await expect(page).toHaveURL(/dashboard\?/)
      await subjective.focus()
      await subjective.pressSequentially("Typing must stay unavailable")
      await expect(subjective).toHaveValue(text)
      releaseDecision()
      await expect(subjective).not.toHaveAttribute("readonly", "")
      await subjective.press("ControlOrMeta+End")
      await subjective.pressSequentially("Recovered editing.")
      await expect(subjective).toHaveValue(`${text}Recovered editing.`)
      expect((await getIntakeById(intakeId))?.status).toBe("in_review")
    } finally {
      releaseFirstSave()
      releaseDecision()
      await page.unroute("**/*", holdDecision)
    }
  })

  test("retries a failed profile chunk locally while preserving the exact clinical note", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    const intakeId = await seedCase()
    const stopProvider = await preventProviderSession(page, intakeId)
    const panel = await openQueueCase(page, intakeId)
    const note = await openNote(panel)
    // Local/CI run Next's dev server, whose split-chunk name identifies this module.
    const profileChunk = /\/_next\/static\/chunks\/.*patient-profile-panel.*\.js/
    let chunkRequests = 0
    const failFirstChunk = async (route: Route) => {
      chunkRequests += 1
      if (chunkRequests === 1) {
        expectedNetworkAbort.add(page)
        await route.abort("failed")
      } else await route.continue()
    }
    await page.route(profileChunk, failFirstChunk)
    const text = "Synthetic profile retry reasoning.  "
    try {
      await note.fill(text)
      await note.press("ControlOrMeta+End")
      await note.pressSequentially("Retain spaces ")
      const authored = `${text}Retain spaces `
      const saved = SOAP.replace("Synthetic patient reports an unchanged regimen.", authored)
      await panel.getByRole("button", { name: "View profile", exact: true }).click()
      const profile = page.getByRole("dialog", { name: "Patient profile", exact: true })
      await expect(profile.getByRole("status")).toHaveText("Patient profile could not be loaded.")
      expect(await persistedNote(page, intakeId)).toBe(saved)
      await profile.getByRole("button", { name: "Retry loading profile", exact: true }).click()
      await expect(profile).toContainText("Identity and contact")
      await expect(profile.getByText("E2E Test Patient", { exact: true })).toBeVisible()
      expect(chunkRequests).toBe(2)
      await profile.getByRole("button", { name: "Close drawer", exact: true }).click()
      await expect(note).toHaveValue(authored)
      expect(await persistedNote(page, intakeId)).toBe(saved)
    } finally {
      await page.unroute(profileChunk, failFirstChunk)
      await stopProvider()
    }
  })

})

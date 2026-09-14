import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"

import { expect, type Page, type Route, test } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"

import { loginAsDoctor, loginAsOperator, loginAsSupport, logoutTestUser } from "./helpers/auth"
import { seedTestIntake } from "./helpers/db"

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key || process.env.E2E_ISOLATED_SUPABASE !== "1" || new URL(url).port !== "55321" || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) {
  throw new Error("Plan5 browser verification requires the disposable local Supabase runner")
}
const db = createClient(url, key, { auth: { persistSession: false } })
const operator = "e2e00000-0000-0000-0000-000000000001"
const patient = "e2e00000-0000-0000-0000-000000000002"
const query = "E2E Navigation Patient"
const intakeIds: string[] = []
const output = "output/plan5-navigation/after"
test.describe.configure({ mode: "default" })

test.beforeAll(async () => {
  await mkdir(output, { recursive: true })
  const { error } = await db.from("profiles").upsert({ id: operator, referral_code: "E2ENAVOP", auth_user_id: null, role: "admin", full_name: "Synthetic Navigation Operator", email: "navigation-operator@example.test", onboarding_completed: true, email_verified: true })
  if (error) throw error
  for (const [suffix, role] of [["003", "doctor"], ["004", "support"]]) {
    const { error: staffError } = await db.from("profiles").upsert({ id: `e2e00000-0000-0000-0000-000000000${suffix}`, referral_code: `E2ENAV${suffix}`, auth_user_id: null, role, full_name: `Synthetic Navigation ${role}`, email: `navigation-${role}@example.test`, onboarding_completed: true, email_verified: true })
    if (staffError) throw staffError
  }
  for (let i = 0; i < 52; i++) {
    const seeded = await seedTestIntake({ status: "paid" })
    if (!seeded.success || !seeded.intakeId) throw new Error(seeded.error)
    intakeIds.push(seeded.intakeId)
  }
  const { error: nameError } = await db.from("profiles").update({ full_name: query }).eq("id", patient)
  if (nameError) throw nameError
})
test.afterAll(async () => {
  for (const [table, column] of [["intake_events", "intake_id"], ["document_drafts", "intake_id"], ["email_outbox", "intake_id"], ["intake_answers", "intake_id"], ["intakes", "id"]]) {
    const { error } = await db.from(table).delete().in(column, intakeIds)
    if (error) throw new Error(`Synthetic ${table} cleanup failed: ${error.message}`)
  }
  const { count, error } = await db.from("intakes").select("id", { count: "exact", head: true }).in("id", intakeIds)
  if (error) throw error
  expect(count).toBe(0)
})
test.beforeEach(async ({ page }) => {
  const login = await loginAsOperator(page)
  expect(login.success, login.error).toBe(true)
  await page.setViewportSize({ width: 1440, height: 900 })
})
test.afterEach(async ({ page }) => {
  await logoutTestUser(page)
})

for (const surface of ["queue", "requests"] as const) {
  for (const destination of ["patient", "request"] as const) {
    test(`preserves ${surface} to ${destination} return state`, async ({ page }) => {
      const origin = surface === "queue" ? "/dashboard?showTestData=1&onlyTestData=1" : "/admin/intakes?pageSize=10"
      await page.goto(origin)
      const search = surface === "queue" ? page.getByRole("textbox", { name: "Search active requests" }) : page.getByRole("searchbox", { name: "Search cases" })
      await expect(search).toBeVisible()
      const typedQuery = destination === "patient" ? `  ${query}!!!  ` : query
      const initialSearch = page.waitForResponse(response => response.request().method() === "POST" && Boolean(response.request().headers()["next-action"]) && (response.request().postData() ?? "").includes(query))
      await search.fill(typedQuery)
      await (await initialSearch).finished()
      const row = surface === "queue" ? page.locator('[data-testid^="queue-row-"]').first() : page.getByRole("link", { name: /^Open case / }).first()
      await expect(row).toBeVisible()
      if (surface === "queue") await expect(page.getByText("52 matches", { exact: true })).toBeVisible()
      if (surface === "requests") {
        await page.getByRole("button", { name: /^Next/ }).click()
        await expect(page).toHaveURL(/page=2/)
      } else {
        await page.getByRole("button", { name: /next page/i }).click()
      }
      if (surface === "queue") {
        await expect(page.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page")
        await expect(page.getByText("Searching…", { exact: true })).toBeHidden()
        await expect(page.locator('[data-testid^="queue-row-"]')).toHaveCount(2)
      } else {
        await expect(page.getByText("Searching ledger…", { exact: true })).toBeHidden()
        await expect(search).toHaveValue(typedQuery)
      }
      await page.screenshot({ path: `${output}/${surface}-${destination}-before.png` })
      if (surface === "queue") await row.getByRole("button", { name: /^Open case for/ }).click()
      else await row.click()
      const review = page.getByTestId("intake-review-panel")
      await expect(review).toBeVisible()
      const selectedRecordHref = await review.getByRole("link", { name: "Request record", exact: true }).getAttribute("href")
      if (destination === "patient") {
        await review.getByRole("button", { name: /^Patient details$/ }).click()
        await page.getByRole("link", { name: "Open full record", exact: true }).last().click()
        await expect(page).toHaveURL(/\/patients\//)
      } else {
        await review.getByRole("link", { name: /^Request record$/ }).click()
        await expect(page).toHaveURL(/\/intakes\//)
      }
      const recordUrl = page.url()
      await page.goBack()
      await expect(search).toBeVisible()
      await expect(search).toHaveValue(query)
      if (surface === "requests") await expect(page).toHaveURL(/page=2/)
      else {
        await expect(page.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page")
        await expect(page.locator('[data-testid^="queue-row-"]')).toHaveCount(2)
      }
      const privateStorage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))
      expect(privateStorage).not.toContain(query)
      expect(page.url()).not.toContain(encodeURIComponent(query))
      expect(new URL(page.url()).searchParams.has("q")).toBe(false)
      const returnedQuery = await search.inputValue()
      await writeFile(`${output}/${surface}-${destination}.json`, JSON.stringify({ surface, destination, returnedQuery, url: page.url(), expectedQuery: query, lostPrivateSearch: returnedQuery !== query }, null, 2))
      expect(returnedQuery, "Return retains the private search in current authenticated memory").toBe(query)
      if (surface === "queue") {
        await expect(review).toBeVisible({ timeout: 30_000 })
        await expect(review.getByRole("link", { name: "Request record", exact: true })).toHaveAttribute("href", selectedRecordHref!)
      } else {
        const restoredRow = page.locator(`[data-row-id="${selectedRecordHref!.split("/").pop()}"]`)
        await expect(restoredRow).toHaveAttribute("data-selected", "true")
        await expect(restoredRow.getByRole("link", { name: /^Open case / })).toBeFocused()
      }
      await page.screenshot({ path: `${output}/${surface}-${destination}-returned.png` })
      await page.goForward()
      await expect(page).toHaveURL(recordUrl)
      await page.goBack()
      await expect(search).toHaveValue(query)
      if (surface === "requests") await expect(page).toHaveURL(/page=2/)
      else {
        await expect(page.getByRole("button", { name: "Page 2", exact: true })).toHaveAttribute("aria-current", "page")
        await expect(page.locator('[data-testid^="queue-row-"]')).toHaveCount(2)
      }
      if (surface === "queue") {
        await expect(review).toBeVisible({ timeout: 30_000 })
        await expect(review.getByRole("link", { name: "Request record", exact: true })).toHaveAttribute("href", selectedRecordHref!)
      } else {
        const restoredRow = page.locator(`[data-row-id="${selectedRecordHref!.split("/").pop()}"]`)
        await expect(restoredRow).toHaveAttribute("data-selected", "true")
        await expect(restoredRow.getByRole("link", { name: /^Open case / })).toBeFocused()
      }
      if (surface === "requests") {
        await page.locator(`[data-row-id="${selectedRecordHref!.split("/").pop()}"]`).getByRole("link", { name: /^Open case / }).click()
        await expect(review.getByRole("link", { name: "Request record", exact: true })).toHaveAttribute("href", selectedRecordHref!)
      }
    })
  }
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 740 }]) {
  for (const theme of ["light", "dark"] as const) {
    test(`renders navigation controls ${viewport.width}x${viewport.height} ${theme}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.emulateMedia({ colorScheme: theme })
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
      for (const surface of ["queue", "requests"] as const) {
        await page.goto(surface === "queue" ? "/dashboard?showTestData=1&onlyTestData=1" : "/admin/intakes?pageSize=10")
        const search = surface === "queue" ? page.getByRole("textbox", { name: "Search active requests" }) : page.getByRole("searchbox", { name: "Search cases" })
        await expect(search).toBeVisible()
        expect(await search.evaluate((input) => input.getBoundingClientRect().right <= input.parentElement!.getBoundingClientRect().right + 1)).toBe(true)
        if (surface === "queue") {
          await expect(page.getByText("Oldest wait", { exact: true }).and(page.locator(":visible"))).toHaveCount(1)
          await page.getByRole("button", { name: "Operational summary" }).click()
          await expect(page.getByText("Operational summary", { exact: true })).toBeVisible()
          await page.keyboard.press("Escape")
          await expect(page.getByText("Operational summary", { exact: true })).toBeHidden()
        } else {
          if (viewport.width >= 1024) await expect(page.getByRole("columnheader")).toHaveCount(4)
          await page.getByRole("button", { name: "Filters", exact: true }).click()
          const filters = page.getByRole("dialog", { name: "Request filters" })
          await expect(filters).toBeVisible()
          await expect(filters.getByRole("combobox", { name: "Service filter" })).toBeVisible()
          await expect(filters.getByRole("combobox", { name: "Status filter" })).toBeVisible()
          await expect(filters.getByRole("radiogroup", { name: "Row density" })).toBeVisible()
          await page.keyboard.press("Escape")
          await expect(filters).toBeHidden()
          const actions = page.getByRole("button", { name: /^Actions for request/ }).first()
          await expect(actions).toBeVisible()
          const box = await actions.boundingBox()
          expect(box?.height).toBeGreaterThanOrEqual(44)
          await actions.focus()
          await page.keyboard.press("Enter")
          await expect(page.getByRole("menu")).toBeVisible()
          await expect(page.getByTestId("intake-review-panel")).toBeHidden()
          await page.keyboard.press("Escape")
          await expect(actions).toBeFocused()
          await expect(page.getByRole("menu")).toBeHidden()
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
        await page.screenshot({ path: `${output}/${surface}-${viewport.width}-${theme}.png`, animations: "disabled" })
      }
    })
  }
}


test("failed note saves retain the draft across record links, rows, list switching and browser Back", async ({ page }) => {
  await page.goto("/admin/intakes?pageSize=10")
  await page.locator('a[href="/dashboard"]:visible').first().click()
  const row = page.locator('[data-testid^="queue-row-"]').first()
  await row.getByRole("button", { name: /^Open case for/ }).click()
  const panel = page.getByTestId("intake-review-panel")
  const record = panel.getByRole("link", { name: "Request record", exact: true })
  const href = await record.getAttribute("href")
  const intakeId = href!.split("/").pop()!
  const draft = "Synthetic navigation failed note must remain recoverable."
  const note = panel.getByRole("textbox", { name: /^Draft clinical note(?: Subjective)?$/ }).first()
  const disclosure = panel.getByRole("button", { name: /Draft note/ }).first()
  if (await disclosure.getAttribute("aria-expanded") !== "true") await disclosure.click()
  await expect(note).toBeVisible()
  let denied = 0
  const reject = async (route: Route) => {
    const request = route.request()
    if (request.method() === "POST" && request.headers()["next-action"] && request.postData()?.includes(intakeId) && request.postData()?.includes(draft)) {
      denied++
      await route.abort("failed")
    } else await route.continue()
  }
  await page.route("**/*", reject)
  try {
    await note.fill(draft)
    await expect.poll(() => denied).toBeGreaterThan(0)
    await expect(panel.getByText("Save failed", { exact: true })).toBeVisible()
    const origin = page.url()
    for (const leave of [
      () => record.click(),
      () => page.locator('[data-testid^="queue-row-"]').nth(1).getByRole("button", { name: /^Open case for/ }).click(),
      () => page.locator('a[href="/admin/intakes"]:visible').first().click(),
      () => page.evaluate(() => history.back()),
    ]) {
      const before = denied
      await leave()
      await expect.poll(() => denied).toBeGreaterThan(before)
      await expect(page).toHaveURL(origin)
      await expect(note).toHaveValue(draft)
      await expect(record).toHaveAttribute("href", href!)
      await expect(panel.getByText("Save failed", { exact: true })).toBeVisible()
    }
  } finally { await page.unroute("**/*", reject) }
  await panel.getByRole("button", { name: /Retry save/ }).click()
  await expect(panel.getByText("Saved", { exact: true }).first()).toBeVisible()
})

test("contextual return retains search but a hard reload clears private memory", async ({ page }) => {
  await page.goto("/dashboard?showTestData=1&onlyTestData=1")
  const search = page.getByRole("textbox", { name: "Search active requests" })
  const searched = page.waitForResponse(response => response.request().method() === "POST" && (response.request().postData() ?? "").includes(query))
  await search.fill(query)
  await (await searched).finished()
  await expect(page.getByText("52 matches", { exact: true })).toBeVisible()
  await page.locator('[data-testid^="queue-row-"]').first().getByRole("button", { name: /^Open case for/ }).click()
  const panel = page.getByTestId("intake-review-panel")
  await panel.getByRole("link", { name: "Request record", exact: true }).click()
  await page.getByRole("link", { name: "Back to Queue", exact: true }).click()
  await expect(search).toHaveValue(query)
  await expect(page.getByText("52 matches", { exact: true })).toBeVisible()
  await page.reload()
  await expect(search).toHaveValue("")
  expect(new URL(page.url()).searchParams.has("q")).toBe(false)
})

test("doctor and support direct routes retain their role boundaries and masked Requests", async ({ page }) => {
  expect((await loginAsDoctor(page)).success).toBe(true)
  await page.goto("/admin/intakes")
  await expect(page).not.toHaveURL(/\/admin\/intakes/)
  expect((await loginAsSupport(page)).success).toBe(true)
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/admin\/ops/)
  await page.goto("/admin/intakes?pageSize=10")
  await expect(page.getByRole("heading", { name: "Request ledger", exact: true })).toBeVisible()
  await expect(page.getByText(query, { exact: true })).toHaveCount(0)
  await expect(page.getByTestId("intake-review-panel")).toBeHidden()
  await page.goto(`/doctor/intakes/${intakeIds[0]}`)
  await expect(page).not.toHaveURL(new RegExp(`/doctor/intakes/${intakeIds[0]}`))
})

test("a removed selection announces the changed view and focuses the list heading", async ({ page }) => {
  await page.goto("/admin/intakes?pageSize=10")
  const search = page.getByRole("searchbox", { name: "Search cases" })
  await search.fill(query)
  await expect(page.getByRole("link", { name: /^Open case / }).first()).toBeVisible()
  await page.waitForTimeout(800)
  await page.getByRole("link", { name: /^Open case / }).first().click()
  const panel = page.getByTestId("intake-review-panel")
  const record = panel.getByRole("link", { name: "Request record", exact: true })
  const href = await record.getAttribute("href")
  const id = href!.split("/").pop()!
  expect(intakeIds).toContain(id)
  await record.click()
  // Change only our disposable row so it no longer matches this private search.
  const replacement = "e2e00000-0000-0000-0000-000000000005"
  const profile = await db.from("profiles").upsert({ id: replacement, referral_code: "E2ENAVOTHER", role: "patient", full_name: "Synthetic Different Patient", email: "navigation-other@example.test" })
  if (profile.error) throw profile.error
  try {
    const changed = await db.from("intakes").update({ patient_id: replacement }).eq("id", id)
    if (changed.error) throw changed.error
    await page.goBack()
    await expect(search).toHaveValue(query)
    await expect(page.getByRole("status").filter({ hasText: /previous request.*no longer/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Request ledger", exact: true })).toBeFocused()
    await expect(page.getByTestId("intake-review-panel")).toBeHidden()
  } finally {
    const restored = await db.from("intakes").update({ patient_id: patient }).eq("id", id)
    expect(restored.error).toBeNull()
    const removed = await db.from("profiles").delete().eq("id", replacement)
    expect(removed.error).toBeNull()
  }
})

test("another doctor's active claim remains locked when opening its exact queue row", async ({ page }) => {
  const id = intakeIds[0]
  const doctor = "e2e00000-0000-0000-0000-000000000003"
  const claim = await db.from("intakes").update({ claimed_by: doctor, claimed_at: new Date().toISOString() }).eq("id", id)
  expect(claim.error).toBeNull()
  try {
    await page.goto("/dashboard?showTestData=1&onlyTestData=1")
    await page.getByTestId(`queue-row-${id}`).getByRole("button", { name: /^Open case for/ }).click()
    const panel = page.getByTestId("intake-review-panel")
    await expect(panel.getByText(/is reviewing|Already claimed by/i).first()).toBeVisible({ timeout: 30_000 })
    const result = await db.from("intakes").select("claimed_by").eq("id", id).single()
    expect(result.error).toBeNull()
    expect(result.data?.claimed_by).toBe(doctor)
    await expect(panel.getByRole("button", { name: /Approve certificate|Complete request/ }).first()).toBeDisabled()
  } finally {
    const release = await db.from("intakes").update({ claimed_by: null, claimed_at: null }).eq("id", id)
    expect(release.error).toBeNull()
  }
})

test("an actual SDK account switch discards the old protected document and private search", async ({ page, context }) => {
  const accounts: { id: string; email: string; password: string }[] = []
  const tokens: string[] = []
  const sibling = await context.newPage()
  try {
    for (const role of ["admin", "support"] as const) {
      const email = `navigation-${randomUUID()}@example.test`
      const password = `Local-only-${randomUUID()}!`
      const created = await db.auth.admin.createUser({ email, password, email_confirm: true })
      expect(created.error).toBeNull()
      const id = created.data.user!.id
      accounts.push({ id, email, password })
      const initialProfile = await db.from("profiles").delete().eq("auth_user_id", id)
      expect(initialProfile.error).toBeNull()
      const profile = await db.from("profiles").insert({ auth_user_id: id, role, email, referral_code: `NAV${randomUUID().slice(0, 8)}`, full_name: `Synthetic Session ${role}`, onboarding_completed: true, email_verified: true }).select("id").single()
      expect(profile.error).toBeNull()
    }
    await logoutTestUser(page)
    const signIn = async (target: Page, account: typeof accounts[number]) => {
      await target.goto("/sign-in?redirect=/dashboard")
      await target.getByLabel("Email address", { exact: true }).fill(account.email)
      await target.getByLabel("Password", { exact: true }).fill(account.password)
      const authenticated = target.waitForResponse(response => response.url().includes("/auth/v1/token?grant_type=password"))
      await target.locator('button[type="submit"]').click()
      const response = await authenticated
      expect(response.ok()).toBe(true)
      tokens.push((await response.json()).access_token)
    }
    await signIn(page, accounts[0])
    await expect(page).toHaveURL(/\/dashboard/)
    const search = page.getByRole("textbox", { name: "Search active requests" })
    const response = page.waitForResponse(result => result.request().method() === "POST" && (result.request().postData() ?? "").includes(query))
    await search.fill(query)
    await (await response).finished()
    await expect(search).toHaveValue(query)
    let freshDocuments = 0
    page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) freshDocuments++ })
    await signIn(sibling, accounts[1])
    await expect.poll(() => freshDocuments).toBeGreaterThan(0)
    await expect(page).toHaveURL(/\/admin\/ops/)
    await expect(search).toBeHidden()
    await expect(page.getByText(query, { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(query)
  } finally {
    await sibling.close()
    await context.clearCookies()
    for (const token of tokens) await db.auth.admin.signOut(token, "global")
    for (const account of accounts) {
      const profile = await db.from("profiles").delete().eq("auth_user_id", account.id)
      expect(profile.error).toBeNull()
      const user = await db.auth.admin.deleteUser(account.id)
      expect(user.error).toBeNull()
    }
  }
})

test("Queue return restores nonzero internal scroll and the exact initiating action focus", async ({ page }) => {
  await page.goto("/dashboard?showTestData=1&onlyTestData=1")
  const row = page.locator('[data-testid^="queue-row-"]').nth(8)
  const id = (await row.getAttribute("data-testid"))!.replace("queue-row-", "")
  const action = row.getByRole("button", { name: /^Open case for/ })
  await action.scrollIntoViewIfNeeded()
  await action.click()
  const scrollBefore = await row.evaluate(element => {
    let host = element.parentElement
    while (host && host.scrollHeight <= host.clientHeight) host = host.parentElement
    return host?.scrollTop ?? 0
  })
  expect(scrollBefore).toBeGreaterThan(0)
  await page.getByTestId("intake-review-panel").getByRole("link", { name: "Request record", exact: true }).click()
  await page.goBack()
  const returnedRow = page.getByTestId(`queue-row-${id}`)
  await expect(returnedRow.getByRole("button", { name: /^Open case for/ })).toBeFocused({ timeout: 30_000 })
  await expect.poll(() => returnedRow.evaluate(element => {
    let host = element.parentElement
    while (host && host.scrollHeight <= host.clientHeight) host = host.parentElement
    return host?.scrollTop ?? 0
  })).toBeCloseTo(scrollBefore, 0)
  await expect(page.getByTestId("intake-review-panel").getByRole("link", { name: "Request record", exact: true })).toHaveAttribute("href", new RegExp(`${id}$`))
})

test("pending private search blocks pointer pagination and keyboard case actions", async ({ page }) => {
  await page.goto("/dashboard?showTestData=1&onlyTestData=1")
  await expect(page.locator('[data-testid^="queue-row-"]').first()).toBeVisible()
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  let started = false
  const holdSearch = async (route: Route) => {
    const request = route.request()
    if (request.method() === "POST" && request.headers()["next-action"] && (request.postData() ?? "").includes(query)) {
      started = true
      await held
    }
    await route.continue()
  }
  await page.route("**/*", holdSearch)
  try {
    await page.getByRole("textbox", { name: "Search active requests" }).fill(query)
    await expect.poll(() => started).toBe(true)
    await expect(page.getByRole("button", { name: /next page/i })).toBeDisabled()
    await page.getByTestId("queue-heading").click()
    for (const key of ["j", "k", "ArrowDown", "ArrowUp", "Enter", "a", "d"]) await page.keyboard.press(key)
    await expect(page.getByTestId("intake-review-panel")).toBeHidden()
    await expect(page.getByRole("dialog")).toBeHidden()
    await expect(page.getByRole("button", { name: "Page 1", exact: true })).toHaveAttribute("aria-current", "page")
  } finally {
    release()
    await page.unroute("**/*", holdSearch)
  }
  await expect(page.getByText("52 matches", { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("button", { name: /next page/i })).toBeEnabled()
})

test("Approved today starts collapsed and separates current actor and protocol history", async ({ page }) => {
  const historyIds: string[] = []
  try {
    for (const kind of ["actor", "other", "protocol"] as const) {
      const seeded = await seedTestIntake({ status: "in_review" })
      expect(seeded.success, seeded.error).toBe(true)
      const id = seeded.intakeId!
      historyIds.push(id)
      intakeIds.push(id)
      const updated = await db.from("intakes").update({ status: "approved", reviewed_by: kind === "other" ? "e2e00000-0000-0000-0000-000000000003" : operator, reviewed_at: new Date().toISOString(), approved_at: new Date().toISOString(), ai_approved: kind === "protocol", ai_approved_at: kind === "protocol" ? new Date().toISOString() : null }).eq("id", id)
      expect(updated.error).toBeNull()
    }
    await page.goto("/dashboard?showTestData=1&onlyTestData=1")
    const history = page.locator("[data-approved-today]")
    await expect(history).toBeVisible()
    await expect(history).not.toHaveAttribute("open", "")
    const summary = history.locator("summary")
    await summary.focus()
    await page.keyboard.press("Enter")
    await expect(history).toHaveAttribute("open", "")
    await expect(history.locator(`a[href$="/${historyIds[0]}"]`)).toBeVisible()
    await expect(history.locator(`a[href$="/${historyIds[1]}"]`)).toHaveCount(0)
    await expect(history.locator(`a[href$="/${historyIds[2]}"]`)).toBeVisible()
    await expect(summary).toContainText("1 yours · 1 auto-issued")
    await page.keyboard.press("Space")
    await expect(history).not.toHaveAttribute("open", "")
  } finally {
    // Exact run-owned IDs are removed by the suite's audited child-first teardown.
    await page.goto("/admin/intakes?pageSize=10")
  }
})

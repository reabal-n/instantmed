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
const privateLeaks = new WeakMap<Page, string[]>()
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
  // Navigation owns no AI generation; pre-existing synthetic notes avoid provider calls.
  expect((await db.from("intakes").update({ doctor_notes: "Synthetic navigation fixture note." }).in("id", intakeIds)).error).toBeNull()
  const { error: nameError } = await db.from("profiles").update({ full_name: query }).eq("id", patient)
  if (nameError) throw nameError
})
async function cleanupOwnedIntakes() {
  for (const [table, column] of [["intake_events", "intake_id"], ["document_drafts", "intake_id"], ["email_outbox", "intake_id"], ["intake_answers", "intake_id"], ["intakes", "id"]]) {
    const { error } = await db.from(table).delete().in(column, intakeIds)
    if (error) throw new Error(`Synthetic ${table} cleanup failed: ${error.message}`)
  }
  const { count, error } = await db.from("intakes").select("id", { count: "exact", head: true }).in("id", intakeIds)
  if (error) throw error
  expect(count).toBe(0)
}
test.afterAll(cleanupOwnedIntakes)
test.beforeEach(async ({ page }, testInfo) => {
  // Independent browser scenarios must not share the standard API IP quota.
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `192.0.2.${testInfo.line % 250 + 1}` })
  const leaks: string[] = []
  privateLeaks.set(page, leaks)
  page.on("request", request => {
    const privateValues = [query, "E2E Last Page Patient"]
    const decodedUrl = decodeURIComponent(request.url())
    const referer = decodeURIComponent(request.headers().referer ?? "")
    if (privateValues.some(value => decodedUrl.includes(value))) leaks.push("private query in request URL")
    if (privateValues.some(value => referer.includes(value))) leaks.push("private query in referrer")
    if (/posthog|sentry|google-analytics|vercel-insights/i.test(request.url()) && privateValues.some(value => (request.postData() ?? "").includes(value))) leaks.push("private query in telemetry body")
  })
  const login = await loginAsOperator(page)
  expect(login.success, login.error).toBe(true)
  await page.setViewportSize({ width: 1440, height: 900 })
})
test.afterEach(async ({ page }) => {
  expect(privateLeaks.get(page) ?? [], "Private searches stay out of URLs, referrers and telemetry").toEqual([])
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
      await initialSearch
      const row = surface === "queue" ? page.locator('[data-testid^="queue-row-"]').first() : page.getByRole("link", { name: /^Open case / }).first()
      await expect(row).toBeVisible()
      if (surface === "queue") await expect(page.getByText("52 matches", { exact: true })).toBeVisible()
      else await expect(page.getByText("Searching ledger…", { exact: true })).toBeHidden()
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
        await expect(page.getByRole("region", { name: "Request packet" })).toBeVisible()
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
      expect(await page.locator("a[href]").evaluateAll(links => links.map(link => decodeURIComponent((link as HTMLAnchorElement).href)).join("\n"))).not.toContain(query)
      const returnedQuery = await search.inputValue()
      await writeFile(`${output}/${surface}-${destination}.json`, JSON.stringify({ surface, destination, returnedQuery, url: page.url(), expectedQuery: query, lostPrivateSearch: returnedQuery !== query }, null, 2))
      expect(returnedQuery, "Return retains the private search in current authenticated memory").toBe(query)
      if (surface === "queue") {
        await expect(review).toBeVisible({ timeout: 30_000 })
        await expect(review.getByRole("link", { name: "Request record", exact: true })).toHaveAttribute("href", selectedRecordHref!)
      } else {
        const restoredRow = page.locator(`[data-row-id="${selectedRecordHref!.split("/").pop()}"]:visible`)
        await expect(restoredRow).toHaveAttribute("data-selected", "true")
        await expect(restoredRow.getByRole("link", { name: /^Open case / })).toBeFocused()
      }
      await page.screenshot({ path: `${output}/${surface}-${destination}-returned.png` })
      await page.goForward()
      await expect(page).toHaveURL(recordUrl)
      if (destination === "request") await expect(page.getByRole("region", { name: "Request packet" })).toBeVisible()
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
        const restoredRow = page.locator(`[data-row-id="${selectedRecordHref!.split("/").pop()}"]:visible`)
        await expect(restoredRow).toHaveAttribute("data-selected", "true")
        await expect(restoredRow.getByRole("link", { name: /^Open case / })).toBeFocused()
      }
      if (surface === "requests") {
        await page.locator(`[data-row-id="${selectedRecordHref!.split("/").pop()}"]:visible`).getByRole("link", { name: /^Open case / }).click()
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
  } finally {
    await page.unroute("**/*", reject)
  }
  await panel.getByRole("button", { name: /Retry save/ }).click()
  await expect(panel.getByText("Saved", { exact: true }).first()).toBeVisible()
})

test("contextual return retains search but a hard reload clears private memory", async ({ page }) => {
  await page.goto("/dashboard?showTestData=1&onlyTestData=1")
  const search = page.getByRole("textbox", { name: "Search active requests" })
  const searched = page.waitForResponse(response => response.request().method() === "POST" && (response.request().postData() ?? "").includes(query))
  await search.fill(query)
  await searched
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
  await expect(page).toHaveURL(new RegExp(`/admin/intakes/${id}$`))
  await expect(page.getByRole("region", { name: "Request packet" })).toBeVisible()
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

test("another doctor's active claim remains locked on an exact doctor record", async ({ page }) => {
  const id = intakeIds[0]
  const claim = await db.from("intakes").update({ claimed_by: operator, claimed_at: new Date().toISOString() }).eq("id", id)
  expect(claim.error).toBeNull()
  try {
    expect((await loginAsDoctor(page)).success).toBe(true)
    await page.goto(`/doctor/intakes/${id}`)
    await expect(page.getByRole("region", { name: "Request packet" })).toBeVisible()
    await expect(page.getByText(/(?:claimed|reviewed|locked).*another doctor|another doctor.*(?:claim|review)/i).first()).toBeVisible()
    const result = await db.from("intakes").select("claimed_by").eq("id", id).single()
    expect(result.error).toBeNull()
    expect(result.data?.claimed_by).toBe(operator)
    await expect(page.getByRole("button", { name: "Approve certificate", exact: true })).toBeDisabled()
  } finally {
    const release = await db.from("intakes").update({ claimed_by: null, claimed_at: null }).eq("id", id)
    expect(release.error).toBeNull()
  }
})

test("an actual SDK account switch discards the old protected document and private search", async ({ browser }) => {
  // Production CSP intentionally excludes local Supabase. Only this owned local
  // SDK-session test bypasses CSP; it does not verify production CSP behavior.
  const context = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL, bypassCSP: true })
  const page = await context.newPage()
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
    await response
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
    await context.close()
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
  await expect(page).toHaveURL(new RegExp(`/doctor/intakes/${id}$`))
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
  let continued!: () => void
  const completedRoute = new Promise<void>(resolve => { continued = resolve })
  const holdSearch = async (route: Route) => {
    const request = route.request()
    if (request.method() === "POST" && request.headers()["next-action"] && (request.postData() ?? "").includes(query)) {
      started = true
      await held
      await route.continue()
      continued()
      return
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
    if (started) await completedRoute
    await page.unroute("**/*", holdSearch)
  }
  await expect(page.getByText("52 matches", { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("button", { name: /next page/i })).toBeEnabled()
})


for (const surface of ["queue", "requests"] as const) {
  test(`${surface} distinguishes failed search, empty search and recovered results`, async ({ page }) => {
    await page.goto(surface === "queue" ? "/dashboard?showTestData=1&onlyTestData=1" : "/admin/intakes?pageSize=10")
    const search = surface === "queue" ? page.getByRole("textbox", { name: "Search active requests" }) : page.getByRole("searchbox", { name: "Search cases" })
    const reject = async (route: Route) => {
      const request = route.request()
      if (request.method() === "POST" && request.headers()["next-action"] && (request.postData() ?? "").includes(query)) await route.abort("failed")
      else await route.continue()
    }
    await page.route("**/*", reject)
    try {
      await search.fill(query)
      await expect(page.getByText(surface === "queue" ? "Search unavailable" : "Some ledger evidence could not be read. Visible rows are preserved, but totals may be unavailable.", { exact: true }).first()).toBeVisible()
      await expect(page.getByTestId("intake-review-panel")).toBeHidden()
      if (surface === "requests") await expect(page.getByText("No matching requests", { exact: true }).and(page.locator(":visible"))).toBeHidden()
    } finally { await page.unroute("**/*", reject) }
    const emptyQuery = `NoSuchSyntheticPatient${randomUUID().replaceAll("-", "")}`
    const emptyResponse = page.waitForResponse(response => response.request().method() === "POST" && (response.request().postData() ?? "").includes(emptyQuery))
    await search.fill(emptyQuery)
    await emptyResponse
    await expect(page.getByText(surface === "queue" ? "No matches for this filter" : "No matching requests", { exact: true }).and(page.locator(":visible"))).toBeVisible()
    const recoveredResponse = page.waitForResponse(response => response.request().method() === "POST" && (response.request().postData() ?? "").includes(query))
    await search.fill(query)
    await recoveredResponse
    if (surface === "queue") await expect(page.getByText("52 matches", { exact: true })).toBeVisible()
    else {
      await expect(page.getByRole("link", { name: /^Open case / }).first()).toBeVisible()
      await expect(page.getByText("Searching ledger…", { exact: true })).toBeHidden()
    }
  })
}

test("Requests clamps a vanished private last page and announces the removed selected record", async ({ page }) => {
  const lastPagePatient = randomUUID()
  const owned = intakeIds.slice(0, 12)
  const profile = await db.from("profiles").insert({ id: lastPagePatient, referral_code: `NAV${randomUUID().slice(0, 8)}`, role: "patient", full_name: "E2E Last Page Patient", email: `last-page-${lastPagePatient}@example.test` })
  expect(profile.error).toBeNull()
  try {
    expect((await db.from("intakes").update({ patient_id: lastPagePatient }).in("id", owned)).error).toBeNull()
    await page.goto("/admin/intakes?pageSize=10")
    const search = page.getByRole("searchbox", { name: "Search cases" })
    const searched = page.waitForResponse(response => response.request().method() === "POST" && (response.request().postData() ?? "").includes("E2E Last Page Patient"))
    await search.fill("E2E Last Page Patient")
    await searched
    await expect(page.getByText("Searching ledger…", { exact: true })).toBeHidden()
    await page.getByRole("button", { name: /^Next/ }).click()
    await expect(page).toHaveURL(/page=2/)
    const lastRows = page.locator("[data-row-id]:visible")
    await expect(lastRows).toHaveCount(2)
    const removedIds = await lastRows.evaluateAll(rows => rows.map(row => row.getAttribute("data-row-id")!))
    await lastRows.first().getByRole("link", { name: /^Open case / }).click()
    await page.getByTestId("intake-review-panel").getByRole("link", { name: "Request record", exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/intakes\//)
    await expect(page.getByRole("region", { name: "Request packet" })).toBeVisible()
    expect((await db.from("intakes").update({ patient_id: patient }).in("id", removedIds)).error).toBeNull()
    await page.goBack()
    await expect(search).toHaveValue("E2E Last Page Patient")
    // Restoring a vanished page reads its new total, then fetches the clamped page.
    // The isolated Redis fallback adds about 4.3 seconds to each action.
    await expect(page.getByText("Searching ledger…", { exact: true })).toBeHidden({ timeout: 15_000 })
    await expect(page.locator("[data-row-id]:visible")).toHaveCount(10)
    await expect(page.getByRole("status").filter({ hasText: /previous request.*no longer/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Request ledger", exact: true })).toBeFocused()
    await expect(page.getByRole("button", { name: /^Next/ })).toBeDisabled()
  } finally {
    expect((await db.from("intakes").update({ patient_id: patient }).in("id", owned)).error).toBeNull()
    expect((await db.from("profiles").delete().eq("id", lastPagePatient)).error).toBeNull()
  }
})

test("Requests rapid Back keeps list content when the record has not finished mounting", async ({ page }) => {
  let releaseRecordChunk!: () => void
  const recordChunkReady = new Promise<void>(resolve => { releaseRecordChunk = resolve })
  await page.route("**/_next/static/chunks/**", async route => {
    if (decodeURIComponent(route.request().url()).includes("/app/admin/intakes/[id]/page-")) {
      await recordChunkReady
    }
    await route.continue()
  })
  await page.goto("/admin/intakes?pageSize=10")
  const search = page.getByRole("searchbox", { name: "Search cases" })
  const searched = page.waitForResponse(response => response.request().method() === "POST" && (response.request().postData() ?? "").includes(query))
  await search.fill(query)
  await searched
  await page.getByRole("button", { name: /^Next/ }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText("Searching ledger…", { exact: true })).toBeHidden({ timeout: 15_000 })
  await page.getByRole("link", { name: /^Open case / }).first().click()
  await page.getByTestId("intake-review-panel").getByRole("link", { name: "Request record", exact: true }).click()
  try {
    await expect(page).toHaveURL(/\/admin\/intakes\//)
    await expect(page.getByRole("region", { name: "Request packet" })).toBeHidden()
  } catch (error) {
    releaseRecordChunk()
    throw error
  }
  // Intentionally traverse at the URL change, before waiting for Request packet.
  const restoredSearch = page.waitForResponse(response => response.request().method() === "POST" && (response.request().postData() ?? "").includes(query), { timeout: 15_000 })
  await page.goBack()
  releaseRecordChunk()
  await expect(page).toHaveURL(/\/admin\/intakes\?pageSize=10&page=2/)
  await expect(search).toHaveValue(query)
  await restoredSearch
  await expect(page.getByText("Searching ledger…", { exact: true })).toBeHidden({ timeout: 15_000 })
  await expect(page.locator("[data-row-id]:visible")).toHaveCount(10)
  await expect(page.getByRole("region", { name: "Request packet" })).toBeHidden()
})

test("mobile full-record tabs and More retain a rejected note save", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const id = intakeIds[0]
  await page.goto(`/doctor/intakes/${id}`)
  await expect(page.getByRole("region", { name: "Request packet" })).toBeVisible()
  const disclosure = page.getByRole("button", { name: /Draft note/ }).first()
  if (await disclosure.getAttribute("aria-expanded") !== "true") await disclosure.click()
  const note = page.getByRole("textbox", { name: /^Draft clinical note(?: Subjective)?$/ }).first()
  const draft = "Synthetic mobile navigation note must remain recoverable."
  const reject = async (route: Route) => {
    const request = route.request()
    if (request.method() === "POST" && request.headers()["next-action"] && (request.postData() ?? "").includes(id) && (request.postData() ?? "").includes(draft)) await route.abort("failed")
    else await route.continue()
  }
  await page.route("**/*", reject)
  try {
    await note.fill(draft)
    await expect(page.getByText("Save failed", { exact: true })).toBeVisible()
    const origin = page.url()
    await page.getByRole("button", { name: /^Queue(?:,.*)?$/ }).click()
    await expect(page).toHaveURL(origin)
    await expect(note).toHaveValue(draft)
    await page.getByRole("button", { name: "More", exact: true }).click()
    const more = page.getByRole("dialog", { name: "More navigation options" })
    await more.getByRole("button", { name: "Operations", exact: true }).click()
    await expect(more).toBeVisible()
    await expect(page).toHaveURL(origin)
    await expect(note).toHaveValue(draft)
  } finally { await page.unroute("**/*", reject) }
})

test("Requests completion response failure retains the sheet and success closes it without a real clinical completion", async ({ page }) => {
  const seeded = await seedTestIntake({ status: "awaiting_script", category: "prescription", claimed_by: operator })
  expect(seeded.success, seeded.error).toBe(true)
  const id = seeded.intakeId!
  intakeIds.push(id)
  expect((await db.from("profiles").update({ sex: "M" }).eq("id", patient)).error).toBeNull()
  expect((await db.from("intakes").update({ doctor_notes: "Synthetic completed review note for response-boundary verification.", script_sent: true, script_sent_at: new Date().toISOString(), script_notes: "Record sent script: synthetic UI response fixture", parchment_reference: "E2E-NAV-MOCK" }).eq("id", id)).error).toBeNull()
  expect((await db.from("intake_answers").insert({ intake_id: id, answers: { medicationName: "Atorvastatin", medicationStrength: "20 mg", medicationForm: "tablet", currentDose: "Take one tablet at night", prescriptionHistory: "Previously prescribed by regular GP", hasSideEffects: false, hasAllergies: false, hasConditions: false, hasOtherMedications: false, isPregnantOrBreastfeeding: "no", hasAdverseMedicationReactions: "no", doseChanged: false } })).error).toBeNull()
  let succeed = false
  let mockedCompletions = 0
  const mockCompletion = async (route: Route) => {
    const request = route.request()
    if (request.method() !== "POST" || !request.headers()["next-action"] || !(request.postData() ?? "").includes(id)) return route.continue()
    let args: unknown
    try { args = request.postDataJSON() } catch { args = null }
    if (Array.isArray(args) && args.length === 2 && args[0] === id && typeof args[1] === "string") return route.continue() // owned note save only
    if (Array.isArray(args) && args.length === 1 && args[0] === id) {
      mockedCompletions++
      const result = succeed ? { success: true } : { success: false, error: "Synthetic completion refused" }
      // Next Flight action envelope; no completion request reaches the server.
      return route.fulfill({ status: 200, contentType: "text/x-component", body: `0:{"a":"$@1","f":[],"b":"e2e-response-boundary"}\n1:${JSON.stringify(result)}\n` })
    }
    return route.abort("failed")
  }
  await page.route("**/*", mockCompletion)
  try {
    await page.goto("/admin/intakes?pageSize=10")
    await page.locator(`[data-row-id="${id}"]:visible`).getByRole("link", { name: /^Open case / }).click()
    const panel = page.getByTestId("intake-review-panel")
    const complete = panel.getByRole("button", { name: "Complete request", exact: true })
    await expect(complete).toBeEnabled()
    await complete.click()
    await expect.poll(() => mockedCompletions).toBe(1)
    await expect(page.getByText("Synthetic completion refused", { exact: true })).toBeVisible()
    await expect(panel).toBeVisible()
    succeed = true
    await complete.click()
    await expect.poll(() => mockedCompletions).toBe(2)
    await expect(panel).toBeHidden()
    const persisted = await db.from("intakes").select("status").eq("id", id).single()
    expect(persisted.error).toBeNull()
    expect(persisted.data?.status).toBe("awaiting_script")
  } finally { await page.unroute("**/*", mockCompletion) }
})

for (const origin of ["/admin/patients", "/doctor/patients"]) {
  test(`Patients restores search, sort and focus through a request hop from ${origin}`, async ({ page }) => {
    await page.goto(`${origin}?sort=name`)
    const search = page.getByRole("textbox", { name: "Search patients" })
    await search.fill(query)
    await expect(search).toHaveAttribute("aria-busy", "false")
    const row = page.locator(`[data-row-id="${patient}"]:visible`)
    await expect(row).toBeVisible()
    const open = row.getByRole("link", { name: `Open ${query}`, exact: true })
    await open.focus()
    await open.click()
    await expect(page.getByRole("link", { name: "Back to Patients", exact: true })).toHaveAttribute("href", `${origin}?sort=name&exception=all`)
    await page.getByRole("tab", { name: "History", exact: true }).click()
    const request = page.getByRole("link", { name: "View request", exact: true }).first()
    await request.click()
    await expect(page).toHaveURL(/\/intakes\//)
    await expect(page.getByRole("link", { name: "Back to Patients", exact: true })).toHaveAttribute("href", `${origin}?sort=name&exception=all`)
    await page.goBack()
    await page.getByRole("link", { name: "Back to Patients", exact: true }).click()
    await expect(search).toHaveValue(query)
    await expect(page.getByRole("combobox", { name: "Sort patients" })).toHaveText("Name A–Z")
    await expect(open).toBeFocused()
    const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))
    expect(storage).not.toContain(query)
    expect(page.url()).not.toContain(query)
  })
}

test("Queue request then patient record retains the Queue destination on browser Back", async ({ page }) => {
  await page.goto("/dashboard?showTestData=1&onlyTestData=1")
  await page.locator('[data-testid^="queue-row-"]').first().getByRole("button", { name: /^Open case for/ }).click()
  await page.getByTestId("intake-review-panel").getByRole("link", { name: "Request record", exact: true }).click()
  await page.getByRole("button", { name: "Patient details", exact: true }).click()
  await page.getByRole("link", { name: "Open full record", exact: true }).click()
  await expect(page.getByRole("link", { name: "Back to Queue", exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole("link", { name: "Back to Queue", exact: true })).toBeVisible()
})

test("incomplete setup fits the desktop staff frame and admin mobile navigation stays available", async ({ page }) => {
  await page.goto("/admin/patients")
  await expect(page.getByTestId("doctor-onboarding-banner")).toBeVisible()
  const bounded = page.getByTestId("operator-page")
  await expect(bounded).toBeVisible()
  const box = await bounded.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(900)
  for (const path of ["/dashboard?showTestData=1&onlyTestData=1", `/doctor/intakes/${intakeIds[0]}`, "/admin/patients"]) {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(path)
    await page.getByRole("button", { name: "Open staff navigation", exact: true }).click()
    await expect(page.getByRole("navigation", { name: "Staff navigation", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Close navigation", exact: true }).click()
    await expect(page.getByRole("navigation", { name: "Staff navigation", exact: true, includeHidden: true })).toHaveAttribute("inert", "")
    await page.screenshot({ animations: "disabled", path: `${output}/staff-frame-${path.startsWith('/dashboard') ? 'queue' : path.startsWith('/doctor') ? 'request' : 'patients'}-mobile.png` })
  }
})

test("Patients restores directory pagination and internal scroll after a full-record visit", async ({ page }) => {
  const ids = Array.from({ length: 52 }, () => randomUUID())
  const term = "Synthetic Directory Return"
  const rows = ids.map((id, index) => ({ id, role: "patient", full_name: `${term} ${String(index).padStart(2, '0')}`, email: `${id}@example.test`, referral_code: `NAV${id.slice(0, 8)}`, onboarding_completed: true }))
  expect((await db.from("profiles").insert(rows)).error).toBeNull()
  try {
    await page.goto("/admin/patients?sort=name")
    const search = page.getByRole("textbox", { name: "Search patients" })
    await search.fill(term)
    await expect(page.locator('[data-row-id]:visible')).toHaveCount(50)
    const open = page.locator(`[data-row-id="${ids[40]}"]:visible`).getByRole("link", { name: /^Open / })
    await open.scrollIntoViewIfNeeded()
    const scrollBefore = await open.evaluate(element => {
      let host = element.parentElement
      while (host && !(host.scrollHeight > host.clientHeight && /^(auto|scroll|overlay)$/.test(getComputedStyle(host).overflowY))) host = host.parentElement
      return host?.scrollTop ?? 0
    })
    expect(scrollBefore).toBeGreaterThan(0)
    await open.click()
    await page.getByRole("link", { name: "Back to Patients", exact: true }).click()
    await expect(open).toBeFocused()
    await expect.poll(() => open.evaluate(element => {
      let host = element.parentElement
      while (host && !(host.scrollHeight > host.clientHeight && /^(auto|scroll|overlay)$/.test(getComputedStyle(host).overflowY))) host = host.parentElement
      return host?.scrollTop ?? 0
    })).toBe(scrollBefore)
    await page.getByRole("button", { name: /^Next/ }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.locator('[data-row-id]:visible')).toHaveCount(2)
    const lastPageOpen = page.locator(`[data-row-id="${ids[51]}"]:visible`).getByRole("link", { name: /^Open / })
    await lastPageOpen.click()
    await page.goBack()
    await expect(search).toHaveValue(term)
    await expect(page).toHaveURL(/page=2/)
    await expect(lastPageOpen).toBeFocused()
  } finally {
    expect((await db.from("profiles").delete().in("id", ids)).error).toBeNull()
  }
})

test("a genuinely caught-up Queue retains collapsed actor and protocol history", async ({ page }) => {
  // Runs last: remove only this suite's exact disposable records, not a status backfill.
  await cleanupOwnedIntakes()
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
    await expect(page.getByText("All caught up.", { exact: true }).and(page.locator(":visible"))).toBeVisible()
    await expect(page.locator('[data-testid^="queue-row-"]')).toHaveCount(0)
    const history = page.locator("[data-approved-today]:visible")
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
    await page.screenshot({ path: `${output}/queue-caught-up-history.png`, animations: "disabled" })
  } finally {
    // Exact run-owned IDs are removed by the suite's audited child-first teardown.
    await page.goto("/admin/intakes?pageSize=10")
  }
})

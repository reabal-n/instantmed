/**
 * Doctor dashboard journey.
 *
 * The operator's primary triage surface at /dashboard. After the
 * 2026-05-25 simplification:
 *   - No AttributionSourcesCard / DeclineReasonsCard / StaffReadinessPanel
 *   - No sound-toggle or keyboard-shortcuts button on the queue header
 *   - Queue is the dominant content; header + setup card stay above
 *
 * What the rubric should see:
 *   - Header rhythm: title + system health pill + availability toggle
 *   - Owner setup card if anything incomplete (self-hides otherwise)
 *   - Live wait readout (signature device)
 *   - Status filter tabs (All / Review / Pending Info / Scripts)
 *   - Queue rows with chips (priority, refund, renewal, returning)
 *   - Empty state copy + tone when filtered to nothing
 *   - Mobile layout: split pane collapses, scroll behaviour, sticky bits
 *
 * Auth: hits POST /api/test/login (operator role) so the page bypasses
 * sign-in. Requires the dev server to run with PLAYWRIGHT=1 and the
 * E2E_SECRET env var set. Run via:
 *
 *   E2E_SECRET=e2e-test-secret-local PLAYWRIGHT=1 pnpm dev
 *   pnpm review --journey=doctor-dashboard --url=http://localhost:3000
 */

import type { Journey } from "./index"

const E2E_SECRET = process.env.E2E_SECRET || "e2e-test-secret-local"
const OPERATOR_USER_ID = "e2e00000-0000-0000-0000-000000000001"
const E2E_REVIEW_INTAKE_ID = "e2e00000-0000-0000-0000-000000000010"
const E2E_REVIEW_FILTER = "E2E"
const TEST_ONLY_DASHBOARD_PATH = "/dashboard?showTestData=1&onlyTestData=1"
const OPERATOR_COOKIE_HEADER = [
  `__e2e_auth_user_id=${OPERATOR_USER_ID}`,
  "__e2e_auth_user_type=operator",
  "__e2e_auth_role=doctor",
  "__e2e_auth_is_admin=true",
].join("; ")

async function fetchWithTimeout(url: string, init: RequestInit, ms = 15000): Promise<Response> {
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function waitForWarmResponse(
  label: string,
  url: string,
  init: RequestInit,
  accepts: (response: Response) => boolean = (response) => response.ok,
  attempts = 6,
): Promise<void> {
  let lastMessage = "unknown error"
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init, 20000)
      if (accepts(response)) return
      const body = await response.text().catch(() => "")
      lastMessage = `${response.status} ${body.slice(0, 160)}`
    } catch (err) {
      lastMessage = err instanceof Error ? err.message : String(err)
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  throw new Error(
    `doctor-dashboard preCapture: ${label} did not become ready after ${attempts} attempts. ` +
      `Last response: ${lastMessage}. Hint: run the dev server with PLAYWRIGHT=1, make sure seeded test data exists, and retry.`,
  )
}

async function prewarmDoctorDashboard(baseUrl: string, showTestData = false): Promise<void> {
  await waitForWarmResponse("test login", `${baseUrl}/api/test/login`, {
    method: "POST",
    headers: {
      "X-E2E-SECRET": E2E_SECRET,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userType: "operator" }),
  })

  const dashboardUrl = showTestData
    ? `${baseUrl}${TEST_ONLY_DASHBOARD_PATH}`
    : `${baseUrl}/dashboard`
  await waitForWarmResponse("dashboard route", dashboardUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      Cookie: OPERATOR_COOKIE_HEADER,
    },
  })

  // Compile and warm the PHI-heavy review endpoint before recording starts.
  // In production this is an ordinary API fetch; in local Next dev, leaving it
  // cold makes the first recorded open look like a multi-second skeleton stall.
  await waitForWarmResponse("review-data endpoint", `${baseUrl}/api/doctor/intakes/${E2E_REVIEW_INTAKE_ID}/review-data`, {
    method: "GET",
    redirect: "follow",
    headers: {
      Cookie: OPERATOR_COOKIE_HEADER,
    },
  })

  await fetchWithTimeout(`${baseUrl}/api/csrf`, {
    method: "GET",
    redirect: "follow",
    headers: {
      Cookie: OPERATOR_COOKIE_HEADER,
    },
  }).catch(() => undefined)
}

export const doctorDashboard: Journey = {
  name: "doctor-dashboard",
  label: "Doctor dashboard (queue + header chrome after 2026-05-25 cuts)",
  targetSeconds: 60,
  preCapture: (baseUrl) => prewarmDoctorDashboard(baseUrl),
  async run(page, baseUrl) {
    // 0. Warm the browser at homepage so the Playwright context has settled
    // origin state before we install cookies + navigate to the gated page.
    // Without this, the first /dashboard nav can race the cookie install and
    // the client-side AuthProvider transitions through an unauthenticated
    // frame, bouncing the page to /sign-in mid-mount.
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 })

    // 1. Bypass auth via the local test-login endpoint (validates the
    // server-side bypass is wired correctly + creates the audit trail).
    const loginResponse = await page.request.post(`${baseUrl}/api/test/login`, {
      headers: {
        "X-E2E-SECRET": E2E_SECRET,
        "Content-Type": "application/json",
      },
      data: { userType: "operator" },
    })
    if (!loginResponse.ok()) {
      const body = await loginResponse.text().catch(() => "")
      throw new Error(
        `doctor-dashboard journey: test-login failed (${loginResponse.status()}). ` +
          `Body: ${body.slice(0, 200)}. ` +
          `Hint: dev server must run with PLAYWRIGHT=1 and a matching E2E_SECRET.`,
      )
    }

    // Install all four E2E auth cookies directly. The server returns them
    // via Set-Cookie but Playwright's multi-cookie parsing is fragile
    // (commas in cookie attrs trip the split). Values are deterministic
    // for the operator role (see app/api/test/login/route.ts TEST_USERS).
    //
    // Critical: __e2e_auth_role MUST be set — the client AuthProvider at
    // lib/supabase/auth-provider.tsx:93 checks for it specifically. Without
    // it, the AuthProvider calls Supabase, finds no real session, emits
    // SIGNED_OUT, and the middleware bounces /dashboard → /sign-in mid-render.
    await page.context().clearCookies()
    await page.context().addCookies([
      { name: "__e2e_auth_user_id", value: OPERATOR_USER_ID, url: baseUrl, httpOnly: true, secure: false, sameSite: "Lax" },
      { name: "__e2e_auth_user_type", value: "operator", url: baseUrl, httpOnly: true, secure: false, sameSite: "Lax" },
      { name: "__e2e_auth_role", value: "doctor", url: baseUrl, httpOnly: false, secure: false, sameSite: "Lax" },
      { name: "__e2e_auth_is_admin", value: "true", url: baseUrl, httpOnly: false, secure: false, sameSite: "Lax" },
    ])

    // Sanity check: confirm the auth cookies actually stuck. If they didn't
    // the dashboard will silently bounce to /sign-in and the rubric will
    // critique the wrong screen — fail loudly instead.
    const installed = await page.context().cookies(baseUrl)
    const required = ["__e2e_auth_user_id", "__e2e_auth_role"]
    const missing = required.filter((n) => !installed.some((c) => c.name === n))
    if (missing.length > 0) {
      throw new Error(
        `doctor-dashboard journey: failed to install required E2E cookies (${missing.join(", ")}). ` +
          `Saw ${installed.length} cookies on context for ${baseUrl}: ${installed.map((c) => c.name).join(", ") || "(none)"}.`,
      )
    }

    // 2. Land on the dashboard.
    await page.goto(`${baseUrl}/dashboard`, {
      waitUntil: "networkidle",
      timeout: 30000,
    })
    await page.waitForTimeout(3000)

    // 3. Scroll: top, middle, bottom — let the rubric see the full
    // vertical rhythm at mobile width (375x812).
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }))
    await page.waitForTimeout(2000)
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: "smooth" }))
    await page.waitForTimeout(2000)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
    await page.waitForTimeout(1500)

    // 4. Exercise the status filter tabs. Each click triggers a URL update
    // + a re-filter; pause so frames capture both states.
    for (const tabLabel of [/Review/i, /Pending Info|^Info/i, /Scripts/i, /^All$/]) {
      const tab = page.getByRole("button", { name: tabLabel }).first()
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await page.waitForTimeout(1500)
      }
    }

    // 5. Hover the first queue row (if any) so the rubric sees hover state.
    const firstRow = page.locator('[data-testid^="queue-row"]').first()
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.hover()
      await page.waitForTimeout(1500)
    }

    // 6. Focus the search input — gives the rubric a frame to assess
    // the input affordance density.
    const search = page.getByPlaceholder(/search/i).first()
    if (await search.isVisible().catch(() => false)) {
      await search.click()
      await search.fill("test")
      await page.waitForTimeout(1500)
      await search.fill("")
      await page.waitForTimeout(1000)
    }

    // 7. End with the dashboard at rest so the closing frame is clean.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }))
    await page.waitForTimeout(2000)
  },
}

export const doctorDashboardDesktop: Journey = {
  name: "doctor-dashboard-desktop",
  label: "Doctor dashboard desktop interaction audit (queue hover + review open)",
  targetSeconds: 75,
  capture: {
    viewport: { width: 1440, height: 900 },
    videoSize: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  },
  preCapture: (baseUrl) => prewarmDoctorDashboard(baseUrl, true),
  async run(page, baseUrl) {
    const loginResponse = await page.request.post(`${baseUrl}/api/test/login`, {
      headers: {
        "X-E2E-SECRET": E2E_SECRET,
        "Content-Type": "application/json",
      },
      data: { userType: "operator" },
    })
    if (!loginResponse.ok()) {
      const body = await loginResponse.text().catch(() => "")
      throw new Error(
        `doctor-dashboard-desktop journey: test-login failed (${loginResponse.status()}). ` +
          `Body: ${body.slice(0, 200)}. ` +
          `Hint: dev server must run with PLAYWRIGHT=1 and a matching E2E_SECRET.`,
      )
    }

    await page.context().clearCookies()
    await page.context().addCookies([
      { name: "__e2e_auth_user_id", value: OPERATOR_USER_ID, url: baseUrl, httpOnly: true, secure: false, sameSite: "Lax" },
      { name: "__e2e_auth_user_type", value: "operator", url: baseUrl, httpOnly: true, secure: false, sameSite: "Lax" },
      { name: "__e2e_auth_role", value: "doctor", url: baseUrl, httpOnly: false, secure: false, sameSite: "Lax" },
      { name: "__e2e_auth_is_admin", value: "true", url: baseUrl, httpOnly: false, secure: false, sameSite: "Lax" },
    ])

    await page.goto(`${baseUrl}${TEST_ONLY_DASHBOARD_PATH}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    })
    await page.waitForTimeout(1400)

    const queue = page.getByRole("region", { name: /doctor request queue/i })
    await queue.waitFor({ state: "visible", timeout: 30000 })
    await page.waitForFunction(
      () => !document.body.innerText.includes("Waiting ..."),
      undefined,
      { timeout: 30000 },
    )

    const allTab = queue.getByRole("button", { name: /^All/ }).first()
    if (await allTab.isVisible().catch(() => false)) {
      await allTab.click()
      await page.waitForTimeout(500)
    }

    const search = queue.getByPlaceholder(/search/i).first()
    if (await search.isVisible().catch(() => false)) {
      await search.click()
      await search.fill(E2E_REVIEW_FILTER)
      await page.waitForTimeout(850)
    }

    const row = page.getByTestId("queue-row-e2e00000-0000-0000-0000-000000000010")
    if (await row.isVisible().catch(() => false)) {
      await row.scrollIntoViewIfNeeded().catch(() => {})
      await row.hover()
      await page.waitForTimeout(800)

      // Match the production interaction contract: the whole compact row is
      // the first-click target. The icon button is just a secondary affordance
      // and can be visually tiny in the desktop split-pane queue.
      await row.click({ position: { x: 24, y: 24 } })
      await page.waitForSelector('[data-testid="intake-review-panel"], [data-testid="intake-review-loading"]', {
        state: "visible",
        timeout: 30000,
      })
      await page.waitForSelector('[data-testid="intake-review-panel"]', {
        state: "visible",
        timeout: 45000,
      })
      await page.waitForTimeout(3500)
    }

    const reviewPanel = page.getByTestId("intake-review-panel")
    if (await reviewPanel.isVisible().catch(() => false)) {
      await reviewPanel.locator("textarea").first().click().catch(() => {})
      await page.waitForTimeout(1000)
      await reviewPanel.evaluate((el) => {
        el.scrollTo({ top: 500, behavior: "smooth" })
      }).catch(() => {})
      await page.waitForTimeout(1800)
      await reviewPanel.evaluate((el) => {
        el.scrollTo({ top: 0, behavior: "smooth" })
      }).catch(() => {})
      await page.waitForTimeout(1200)
    }

    await page.waitForTimeout(1500)
  },
}

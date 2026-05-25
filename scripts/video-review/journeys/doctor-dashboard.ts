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

export const doctorDashboard: Journey = {
  name: "doctor-dashboard",
  label: "Doctor dashboard (queue + header chrome after 2026-05-25 cuts)",
  targetSeconds: 60,
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
    const OPERATOR_USER_ID = "e2e00000-0000-0000-0000-000000000001"
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

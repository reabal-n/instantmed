/**
 * Dashboard Visual Audit
 *
 * Systematically visits all admin, doctor, and patient dashboard pages
 * to verify they load without 404 or error states.
 *
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "dashboard-audit"
 */

import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"

import { loginAsDoctor, loginAsOperator, loginAsPatient, logoutTestUser } from "./helpers/auth"
import { waitForPageLoad } from "./helpers/test-utils"

// Pages derived from admin-sidebar, dashboard-sidebar, and route structure
const ADMIN_PAGES = [
  "/admin",
  "/admin/clinic",
  "/admin/doctors",
  "/admin/services",
  "/admin/features",
  "/admin/emails",
  "/admin/analytics",
  "/admin/business-kpi",
  "/admin/finance",
  "/admin/ops",
  "/admin/compliance",
  "/admin/audit",
  "/admin/refunds",
  "/admin/errors",
  "/admin/webhooks",
  "/admin/content",
  "/admin/email-hub",
  "/admin/settings", // redirects to /admin/features
  "/admin/studio",
  "/admin/webhook-dlq",
  // Nested
  "/admin/ops/sla",
  "/admin/ops/intakes-stuck",
  "/admin/ops/doctors",
  "/admin/ops/reconciliation",
  "/admin/finance/revenue",
  "/admin/emails/analytics",
  "/admin/emails/preview",
  "/admin/settings/templates",
  "/admin/settings/encryption",
  "/admin/doctors/performance",
]

const DOCTOR_PAGES = [
  "/doctor/dashboard",
  "/doctor/scripts",
  "/doctor/patients",
  "/admin",
  "/doctor/analytics",
  "/doctor/settings",
  "/doctor/settings/identity",
]

const PATIENT_PAGES = [
  "/patient",
  "/patient/intakes",
  "/patient/prescriptions",
  "/patient/documents",
  "/patient/messages",
  "/patient/health-summary",
  "/patient/settings",
  "/patient/payment-history",
  "/patient/notifications",
]

const DASHBOARD_ROUTE_CONTRACTS = [
  {
    from: "/doctor/queue?status=review",
    to: /\/doctor\/dashboard\?status=review$/,
  },
  {
    from: "/doctor/queue?status=review&page=2&pageSize=25",
    to: /\/doctor\/dashboard\?status=review&page=2&pageSize=25$/,
  },
]

const DASHBOARD_A11Y_TARGETS = [
  { name: "admin", path: "/admin", login: loginAsOperator },
  { name: "doctor", path: "/doctor/dashboard", login: loginAsOperator },
  { name: "patient", path: "/patient", login: loginAsPatient },
]

const MOBILE_SCREENSHOT_TARGETS = [
  { title: "admin dashboard mobile screenshot", path: "/admin", login: loginAsOperator, snapshot: "admin-dashboard-mobile.png" },
  { title: "doctor dashboard mobile screenshot", path: "/doctor/dashboard", login: loginAsOperator, snapshot: "doctor-dashboard-mobile.png" },
  { title: "patient dashboard mobile screenshot", path: "/patient", login: loginAsPatient, snapshot: "patient-dashboard-mobile.png" },
]

const BENIGN_CONSOLE_PATTERNS = [
  /Download the React DevTools/i,
  /hydration/i,
  /Supabase/i,
  /PostHog/i,
  /Failed to load resource.*favicon/i,
  /ResizeObserver loop/i,
  /third-party cookie/i,
  /Ignoring unsupported entryTypes/i,
]

function createConsoleErrorTracker() {
  const errors: string[] = []
  return {
    errors,
    attach(page: Page) {
      page.on("console", (msg) => {
        if (msg.type() === "error" && !BENIGN_CONSOLE_PATTERNS.some((p) => p.test(msg.text()))) {
          errors.push(`[console.error] ${msg.text()}`)
        }
      })
      page.on("pageerror", (error) => {
        errors.push(`[page error] ${error.message}`)
      })
    },
    assertNoErrors() {
      if (errors.length > 0) {
        throw new Error(`Console errors detected:\n${errors.join("\n")}`)
      }
    },
  }
}

async function assertPageLoads(page: Page, path: string) {
  const response = await page.goto(path)
  await waitForPageLoad(page)

  // Allow redirects (e.g. /admin/settings -> /admin/features)
  const has404 = response?.status() === 404
  const hasError = await page.getByText(/error loading|failed to load|something went wrong/i).isVisible().catch(() => false)

  expect(has404, `${path} should not show 404`).toBe(false)
  expect(hasError, `${path} should not show error state`).toBe(false)
}

async function assertDashboardA11y(page: Page, name: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .exclude("[data-nextjs-dialog]")
    .exclude("#intercom-container")
    .analyze()

  const serious = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious"
  )

  expect(
    serious,
    `${name} dashboard has serious a11y violations:\n` +
      serious
        .map((violation) => `- [${violation.impact}] ${violation.id}: ${violation.description} (${violation.nodes.length} nodes)`)
        .join("\n")
  ).toHaveLength(0)
}

function routePattern(href: string): RegExp {
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`${escaped}(?:$|[?#])`)
}

async function clickDashboardLink(page: Page, href: string) {
  const link = page.locator(`a[href="${href}"]`).first()
  await expect(link).toBeVisible()

  await Promise.all([
    page.waitForURL(routePattern(href), { timeout: 20_000 }),
    link.click(),
  ])
  await waitForPageLoad(page)
}

test.describe("Dashboard Audit - Admin", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    if (!result.success) {
      test.skip(true, `E2E login failed: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  for (const path of ADMIN_PAGES) {
    test(`admin ${path} loads`, async ({ page }) => {
      const tracker = createConsoleErrorTracker()
      tracker.attach(page)
      await assertPageLoads(page, path)
      tracker.assertNoErrors()
    })
  }
})

test.describe("Dashboard Audit - Doctor", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    if (!result.success) {
      test.skip(true, `E2E login failed: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  for (const path of DOCTOR_PAGES) {
    test(`doctor ${path} loads`, async ({ page }) => {
      const tracker = createConsoleErrorTracker()
      tracker.attach(page)
      await assertPageLoads(page, path)
      tracker.assertNoErrors()
    })
  }
})

test.describe("Dashboard Audit - Patient", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsPatient(page)
    if (!result.success) {
      test.skip(true, `E2E login failed: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  for (const path of PATIENT_PAGES) {
    test(`patient ${path} loads`, async ({ page }) => {
      const tracker = createConsoleErrorTracker()
      tracker.attach(page)
      await assertPageLoads(page, path)
      tracker.assertNoErrors()
    })
  }
})

test.describe("Dashboard Audit - Doctor-only user", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsDoctor(page)
    if (!result.success) {
      test.skip(true, `E2E login failed: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("doctor-only user can access doctor pages", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    await assertPageLoads(page, "/doctor/dashboard")
    await assertPageLoads(page, "/doctor/patients")
    tracker.assertNoErrors()
  })

  test("doctor-only user cannot access admin", async ({ page }) => {
    await page.goto("/admin")
    await waitForPageLoad(page)
    const url = page.url()
    const isRedirectedAway = !url.includes("/admin")
    const hasUnauthorized = await page.getByText(/unauthorized|not authorized|access denied|forbidden/i).isVisible().catch(() => false)
    const hasPublicHome = await page.getByRole("heading", { name: /faster than your gp/i }).isVisible().catch(() => false)
    const hasAdminShell = await page.getByRole("complementary", { name: /admin sidebar/i }).isVisible().catch(() => false)
    expect(hasAdminShell).toBe(false)
    expect(isRedirectedAway || hasUnauthorized || hasPublicHome).toBe(true)
  })
})

test.describe("Dashboard Audit - Accessibility", () => {
  for (const target of DASHBOARD_A11Y_TARGETS) {
    test(`${target.name} dashboard axe audit`, async ({ page }) => {
      const login = await target.login(page)
      if (!login.success) {
        test.skip(true, `E2E login failed: ${login.error}`)
      }

      const tracker = createConsoleErrorTracker()
      tracker.attach(page)

      await assertPageLoads(page, target.path)
      await assertDashboardA11y(page, target.name)

      tracker.assertNoErrors()
      await logoutTestUser(page)
    })
  }
})

test.describe("Dashboard Audit - Mobile screenshots", () => {
  for (const target of MOBILE_SCREENSHOT_TARGETS) {
    test(target.title, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })

      const login = await target.login(page)
      if (!login.success) {
        test.skip(true, `E2E login failed: ${login.error}`)
      }

      const tracker = createConsoleErrorTracker()
      tracker.attach(page)

      await assertPageLoads(page, target.path)
      await expect(page).toHaveScreenshot(target.snapshot, {
        animations: "disabled",
        caret: "hide",
        fullPage: false,
        maxDiffPixelRatio: 0.01,
      })

      tracker.assertNoErrors()
      await logoutTestUser(page)
    })
  }
})

test.describe("Dashboard Audit - Link navigation", () => {
  test.beforeEach(async ({ page }) => {
    const result = await loginAsOperator(page)
    if (!result.success) {
      test.skip(true, `E2E login failed: ${result.error}`)
    }
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("admin sidebar links navigate correctly", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)

    await page.goto("/admin")
    await waitForPageLoad(page)

    // Click through key nav links
    const links = [
      { href: "/admin/clinic" },
      { href: "/admin/doctors" },
      { href: "/admin/features" },
      { href: "/admin/analytics", section: /analytics/i },
      { href: "/admin/audit", section: /system/i },
    ]

    for (const { href, section } of links) {
      const link = page.locator(`a[href="${href}"]`).first()
      if (section && !(await link.isVisible().catch(() => false))) {
        await page.getByRole("button", { name: section }).first().click()
        await expect(link).toBeVisible()
      }
      await clickDashboardLink(page, href)
    }

    tracker.assertNoErrors()
  })

  test("doctor sidebar links navigate correctly", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)

    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    const links = [
      { href: "/doctor/scripts", label: /scripts/i },
      { href: "/doctor/patients", label: /patients/i },
    ]

    for (const { href, label } of links) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible()
      await clickDashboardLink(page, href)
    }

    tracker.assertNoErrors()
  })

  test("patient sidebar links navigate correctly", async ({ page }) => {
    const result = await loginAsPatient(page)
    if (!result.success) {
      test.skip(true, `E2E login failed: ${result.error}`)
    }

    const tracker = createConsoleErrorTracker()
    tracker.attach(page)

    await page.goto("/patient")
    await waitForPageLoad(page)

    const links = [
      { href: "/patient/intakes", label: /requests/i },
      { href: "/patient/prescriptions", label: /prescriptions/i },
      { href: "/patient/documents", label: /documents/i },
      { href: "/patient/notifications", label: /notifications/i },
      { href: "/patient/payment-history", label: /payments/i },
    ]

    for (const { href, label } of links) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible()
      await clickDashboardLink(page, href)
    }

    tracker.assertNoErrors()
    await logoutTestUser(page)
  })

  test("legacy doctor queue route preserves review intent", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)

    for (const contract of DASHBOARD_ROUTE_CONTRACTS) {
      await page.goto(contract.from)
      await waitForPageLoad(page)
      await expect(page).toHaveURL(contract.to)
    }

    tracker.assertNoErrors()
  })

  test("doctor dashboard applies status query filters", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)

    await page.goto("/doctor/dashboard?status=review")
    await waitForPageLoad(page)

    await expect(page.getByRole("button", { name: /Needs Review/i })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("button", { name: /^All/i })).toHaveAttribute("aria-pressed", "false")

    tracker.assertNoErrors()
  })
})

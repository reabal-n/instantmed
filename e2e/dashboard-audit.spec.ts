/**
 * Dashboard Visual Audit
 *
 * Systematically visits all admin, doctor, and patient dashboard pages
 * to verify they load without 404 or error states.
 *
 * Run with: PLAYWRIGHT=1 pnpm e2e --grep "dashboard-audit"
 */

import { test, expect } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"
import { loginAsOperator, loginAsDoctor, loginAsPatient, logoutTestUser } from "./helpers/auth"

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
  "/doctor/repeat-rx",
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

const BENIGN_CONSOLE_PATTERNS = [
  /Download the React DevTools/i,
  /hydration/i,
  /Clerk: The publishable key/i,
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
    attach(page: import("@playwright/test").Page) {
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

async function assertPageLoads(page: import("@playwright/test").Page, path: string) {
  await page.goto(path)
  await waitForPageLoad(page)

  // Allow redirects (e.g. /admin/settings -> /admin/features)
  const has404 = await page.getByText(/404|not found|page not found/i).isVisible().catch(() => false)
  const hasError = await page.getByText(/error loading|failed to load|something went wrong/i).isVisible().catch(() => false)

  expect(has404, `${path} should not show 404`).toBe(false)
  expect(hasError, `${path} should not show error state`).toBe(false)
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
    expect(isRedirectedAway || hasUnauthorized).toBe(true)
  })
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
      "/admin/clinic",
      "/admin/doctors",
      "/admin/features",
      "/admin/analytics",
      "/admin/audit",
    ]

    for (const href of links) {
      await page.getByRole("link", { name: new RegExp(href.split("/").pop()!, "i") }).first().click()
      await waitForPageLoad(page)
      expect(page.url()).toContain(href)
    }

    tracker.assertNoErrors()
  })

  test("doctor sidebar links navigate correctly", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)

    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    const links = [
      { href: "/doctor/repeat-rx", label: /repeat rx/i },
      { href: "/doctor/scripts", label: /scripts/i },
      { href: "/doctor/patients", label: /patients/i },
    ]

    for (const { href, label } of links) {
      await page.getByRole("link", { name: label }).first().click()
      await waitForPageLoad(page)
      expect(page.url()).toContain(href)
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
      { href: "/patient/intakes", label: /my requests/i },
      { href: "/patient/prescriptions", label: /prescriptions/i },
      { href: "/patient/documents", label: /documents/i },
    ]

    for (const { href, label } of links) {
      await page.getByRole("link", { name: label }).first().click()
      await waitForPageLoad(page)
      expect(page.url()).toContain(href)
    }

    tracker.assertNoErrors()
    await logoutTestUser(page)
  })
})

import { test, expect, Page, ConsoleMessage } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"
import { loginAsOperator, loginAsPatient, logoutTestUser } from "./helpers/auth"

/**
 * Portal Smoke Tests
 * 
 * Tests that doctor and admin portals:
 * 1. Load without runtime errors
 * 2. Are protected by role-based access
 * 3. Show appropriate UI elements when authenticated
 * 
 * Environment variables required:
 * - PLAYWRIGHT_BASE_URL (optional, defaults to http://localhost:3000)
 * - E2E_SECRET (required for authenticated tests, defaults to "e2e-test-secret-local")
 * 
 * Prerequisites:
 * - Run `pnpm e2e:seed` to create test users before running tests
 */

// ============================================================================
// CONSOLE ERROR CATCHER
// ============================================================================

// Known benign warnings to ignore
const BENIGN_CONSOLE_PATTERNS = [
  /Download the React DevTools/i,
  /Warning: ReactDOM.render is deprecated/i,
  /Warning: componentWillMount has been renamed/i,
  /Warning: componentWillReceiveProps has been renamed/i,
  /hydration/i, // Next.js hydration warnings are often benign
  /Clerk: The publishable key/i, // Clerk dev warnings
  /PostHog/i, // Analytics warnings in test
  /Failed to load resource.*favicon/i,
  /ResizeObserver loop/i, // Browser layout warnings
  /third-party cookie/i,
  /Ignoring unsupported entryTypes/i,
]

function isBenignConsoleMessage(msg: ConsoleMessage): boolean {
  const text = msg.text()
  return BENIGN_CONSOLE_PATTERNS.some(pattern => pattern.test(text))
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

interface ConsoleErrorTracker {
  errors: string[]
  attach: (page: Page) => void
  assertNoErrors: () => void
}

function createConsoleErrorTracker(): ConsoleErrorTracker {
  const errors: string[] = []
  
  return {
    errors,
    attach(page: Page) {
      page.on("console", (msg) => {
        if (msg.type() === "error" && !isBenignConsoleMessage(msg)) {
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

// ============================================================================
// UNAUTHENTICATED ACCESS TESTS
// ============================================================================

test.describe("Portal Access Control - Unauthenticated", () => {
  test("unauthenticated user is redirected from /doctor", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    // Should redirect to sign-in or show auth prompt
    const url = page.url()
    const isRedirected = url.includes("/sign-in") || url.includes("/login")
    const hasSignInButton = await page.getByRole("button", { name: /sign in/i }).isVisible().catch(() => false)
    const hasClerkSignIn = await page.locator('[data-clerk-component="SignIn"]').isVisible().catch(() => false)
    
    expect(isRedirected || hasSignInButton || hasClerkSignIn).toBe(true)
    
    tracker.assertNoErrors()
  })

  test("unauthenticated user is redirected from /admin", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/admin")
    await waitForPageLoad(page)
    
    // Should redirect to sign-in or show auth prompt
    const url = page.url()
    const isRedirected = url.includes("/sign-in") || url.includes("/login")
    const hasSignInButton = await page.getByRole("button", { name: /sign in/i }).isVisible().catch(() => false)
    const hasClerkSignIn = await page.locator('[data-clerk-component="SignIn"]').isVisible().catch(() => false)
    
    expect(isRedirected || hasSignInButton || hasClerkSignIn).toBe(true)
    
    tracker.assertNoErrors()
  })

  test("unauthenticated user is redirected from /admin/studio", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/admin/studio")
    await waitForPageLoad(page)
    
    // Should redirect to sign-in
    const url = page.url()
    const isRedirected = url.includes("/sign-in") || url.includes("/login")
    const hasSignInButton = await page.getByRole("button", { name: /sign in/i }).isVisible().catch(() => false)
    
    expect(isRedirected || hasSignInButton).toBe(true)
    
    tracker.assertNoErrors()
  })
})

// ============================================================================
// AUTHENTICATED TESTS (using seeded operator user)
// ============================================================================

test.describe("Operator Portal Access - Admin + Doctor", () => {
  test.beforeEach(async ({ page }) => {
    // Login as operator (admin+doctor) using E2E auth endpoint
    const result = await loginAsOperator(page)
    if (!result.success) {
      // eslint-disable-next-line no-console
      console.warn("E2E login failed:", result.error)
    }
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("operator can access doctor dashboard without errors", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    // Should NOT show error messages
    const hasLoadError = await page.getByText(/error loading dashboard/i).isVisible().catch(() => false)
    const hasQueueError = await page.getByText(/unable to load queue/i).isVisible().catch(() => false)
    
    expect(hasLoadError).toBe(false)
    expect(hasQueueError).toBe(false)
    
    // Should show doctor UI elements (sidebar or navigation)
    const hasSidebar = await page.locator('[data-testid="doctor-sidebar"]').or(page.locator("nav")).isVisible().catch(() => false)
    const hasHeading = await page.getByRole("heading").first().isVisible().catch(() => false)
    
    expect(hasSidebar || hasHeading).toBe(true)
    
    tracker.assertNoErrors()
  })

  test("operator can access admin dashboard without 404", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/admin")
    await waitForPageLoad(page)
    
    // Should NOT show 404
    const has404 = await page.getByText(/404|not found|page not found/i).isVisible().catch(() => false)
    expect(has404).toBe(false)
    
    // Should show admin UI elements
    const hasHeading = await page.getByRole("heading").first().isVisible().catch(() => false)
    expect(hasHeading).toBe(true)
    
    // Should be on /admin
    expect(page.url()).toContain("/admin")
    
    tracker.assertNoErrors()
  })

  test("operator can access admin studio without errors", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/admin/studio")
    await waitForPageLoad(page)
    
    // Should NOT show 404 or error
    const has404 = await page.getByText(/404|not found/i).isVisible().catch(() => false)
    const hasError = await page.getByText(/error|failed to load/i).isVisible().catch(() => false)
    
    expect(has404).toBe(false)
    expect(hasError).toBe(false)
    
    // Should show studio UI (template studio heading or content)
    const hasStudioContent = await page.getByText(/template|studio|certificate/i).first().isVisible().catch(() => false)
    expect(hasStudioContent).toBe(true)
    
    tracker.assertNoErrors()
  })

  test("operator can navigate between admin pages", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    // Navigate to admin pages
    const adminPages = ["/admin", "/admin/studio", "/admin/audit", "/admin/settings"]
    
    for (const adminPage of adminPages) {
      await page.goto(adminPage)
      await waitForPageLoad(page)
      
      // Should not 404
      const has404 = await page.getByText(/404|not found/i).isVisible().catch(() => false)
      expect(has404, `Page ${adminPage} should not 404`).toBe(false)
    }
    
    tracker.assertNoErrors()
  })

  test("operator can navigate between doctor pages", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    // Navigate to doctor pages
    const doctorPages = ["/doctor/dashboard", "/doctor/queue", "/doctor/settings"]
    
    for (const doctorPage of doctorPages) {
      await page.goto(doctorPage)
      await waitForPageLoad(page)
      
      // Should not 404 or show error
      const has404 = await page.getByText(/404|not found/i).isVisible().catch(() => false)
      expect(has404, `Page ${doctorPage} should not 404`).toBe(false)
    }
    
    tracker.assertNoErrors()
  })
})

// ============================================================================
// PATIENT ROLE TESTS (using seeded patient user)
// ============================================================================

test.describe("Role Restrictions - Patient User", () => {
  test.beforeEach(async ({ page }) => {
    // Login as patient using E2E auth endpoint
    const result = await loginAsPatient(page)
    if (!result.success) {
      // eslint-disable-next-line no-console
      console.warn("E2E patient login failed:", result.error)
    }
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("patient cannot access /doctor", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/doctor/dashboard")
    await waitForPageLoad(page)

    // Should redirect away or show unauthorized
    const url = page.url()
    const isRedirectedAway = !url.includes("/doctor")
    const hasUnauthorized = await page.getByText(/unauthorized|not authorized|access denied|forbidden/i).isVisible().catch(() => false)
    
    expect(isRedirectedAway || hasUnauthorized).toBe(true)
    
    tracker.assertNoErrors()
  })

  test("patient cannot access /admin", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/admin")
    await waitForPageLoad(page)
    
    // Should redirect away or show unauthorized
    const url = page.url()
    const isRedirectedAway = !url.includes("/admin")
    const hasUnauthorized = await page.getByText(/unauthorized|not authorized|access denied|forbidden/i).isVisible().catch(() => false)
    
    expect(isRedirectedAway || hasUnauthorized).toBe(true)
    
    tracker.assertNoErrors()
  })
})

// ============================================================================
// PAGE LOAD TESTS (No Auth Required)
// ============================================================================

test.describe("Portal Pages - Basic Load", () => {
  test("sign-in page loads", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    await page.goto("/sign-in")
    await waitForPageLoad(page)
    
    // Should show sign-in form
    const hasSignIn = await page.locator('[data-clerk-component="SignIn"]').or(
      page.getByRole("button", { name: /sign in|continue/i })
    ).isVisible().catch(() => false)
    
    expect(hasSignIn).toBe(true)
    
    tracker.assertNoErrors()
  })

  test("public pages do not require auth", async ({ page }) => {
    const tracker = createConsoleErrorTracker()
    tracker.attach(page)
    
    const publicPages = ["/", "/medical-certificate", "/about"]
    
    for (const publicPage of publicPages) {
      await page.goto(publicPage)
      await waitForPageLoad(page)
      
      // Should not redirect to sign-in
      const url = page.url()
      expect(url.includes("/sign-in"), `${publicPage} should not redirect to sign-in`).toBe(false)
      
      // Should show content
      const hasContent = await page.getByRole("heading").first().isVisible().catch(() => false)
      expect(hasContent, `${publicPage} should have content`).toBe(true)
    }
    
    tracker.assertNoErrors()
  })
})

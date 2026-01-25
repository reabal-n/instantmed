/**
 * Role-Based Access Control (RBAC) E2E Tests
 * 
 * Verifies that:
 * - Patients cannot access /admin/* routes
 * - Patients cannot access /doctor/* routes
 * - API endpoints enforce role restrictions
 */

import { test, expect } from "@playwright/test"
import { waitForPageLoad } from "./helpers/test-utils"
import { loginAsPatient, logoutTestUser } from "./helpers/auth"

// Seeded test data IDs from scripts/e2e/seed.ts
const SEEDED_INTAKE_ID = "e2e00000-0000-0000-0000-000000000010"

test.describe("RBAC - Patient Access Restrictions", () => {
  test.beforeEach(async ({ page }) => {
    // Login as patient (not admin/doctor)
    const result = await loginAsPatient(page)
    expect(result.success, `Patient login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("patient is redirected from /admin to patient dashboard", async ({ page }) => {
    await page.goto("/admin")
    await waitForPageLoad(page)

    // Should be redirected away from /admin
    // Could redirect to / or /patient depending on implementation
    expect(page.url()).not.toContain("/admin")
    
    // Should be on patient dashboard or home
    const isPatientPage = page.url().includes("/patient") || page.url() === new URL("/", page.url()).href
    expect(isPatientPage).toBe(true)
  })

  test("patient is redirected from /admin/studio", async ({ page }) => {
    await page.goto("/admin/studio")
    await waitForPageLoad(page)

    // Should be redirected away from /admin
    expect(page.url()).not.toContain("/admin")
  })

  test("patient is redirected from /admin/clinic", async ({ page }) => {
    await page.goto("/admin/clinic")
    await waitForPageLoad(page)

    // Should be redirected away from /admin
    expect(page.url()).not.toContain("/admin")
  })

  test("patient is redirected from /doctor", async ({ page }) => {
    await page.goto("/doctor")
    await waitForPageLoad(page)

    // Should be redirected away from /doctor
    expect(page.url()).not.toContain("/doctor")
    
    // Should be on patient dashboard
    expect(page.url()).toContain("/patient")
  })

  test("patient is redirected from /doctor/intakes/[id]/document", async ({ page }) => {
    await page.goto(`/doctor/intakes/${SEEDED_INTAKE_ID}/document`)
    await waitForPageLoad(page)

    // Should be redirected away from /doctor
    expect(page.url()).not.toContain("/doctor")
    
    // Should be on patient dashboard
    expect(page.url()).toContain("/patient")
  })

  test("patient is redirected from /doctor/patients", async ({ page }) => {
    await page.goto("/doctor/patients")
    await waitForPageLoad(page)

    // Should be redirected away from /doctor
    expect(page.url()).not.toContain("/doctor")
  })
})

test.describe("RBAC - API Endpoint Restrictions", () => {
  test.beforeEach(async ({ page }) => {
    // Login as patient
    const result = await loginAsPatient(page)
    expect(result.success, `Patient login should succeed: ${result.error}`).toBe(true)
  })

  test.afterEach(async ({ page }) => {
    await logoutTestUser(page)
  })

  test("patient gets 401/403 from admin API endpoint", async ({ page }) => {
    // Try to access an admin-only API endpoint
    const response = await page.request.get("/api/admin/settings")
    
    // Should be 401 (Unauthorized) or 403 (Forbidden) or redirect (302/307)
    const status = response.status()
    const isBlocked = status === 401 || status === 403 || status === 302 || status === 307 || status === 404
    expect(isBlocked, `Expected 401/403/302/307/404 but got ${status}`).toBe(true)
  })

  test("patient gets 401/403 from doctor API endpoint", async ({ page }) => {
    // Try to access a doctor-only API endpoint (intake actions)
    const response = await page.request.post("/api/doctor/intakes/claim", {
      data: { intakeId: SEEDED_INTAKE_ID },
    })
    
    // Should be 401 (Unauthorized) or 403 (Forbidden) or redirect
    const status = response.status()
    const isBlocked = status === 401 || status === 403 || status === 302 || status === 307 || status === 404
    expect(isBlocked, `Expected 401/403/302/307/404 but got ${status}`).toBe(true)
  })
})

test.describe("RBAC - Unauthenticated Access", () => {
  test("unauthenticated user is redirected from /admin to sign-in", async ({ page }) => {
    // Don't login, just try to access admin
    await page.goto("/admin")
    await waitForPageLoad(page)

    // Should be redirected to sign-in
    expect(page.url()).toContain("/sign-in")
  })

  test("unauthenticated user is redirected from /doctor to sign-in", async ({ page }) => {
    // Don't login, just try to access doctor
    await page.goto("/doctor")
    await waitForPageLoad(page)

    // Should be redirected to sign-in
    expect(page.url()).toContain("/sign-in")
  })

  test("unauthenticated API request returns 401", async ({ page }) => {
    // Try to access protected API without auth
    const response = await page.request.get("/api/admin/settings", {
      headers: {
        // No auth cookies
      },
    })
    
    // Should be 401 or 403
    const status = response.status()
    const isBlocked = status === 401 || status === 403 || status === 404
    expect(isBlocked, `Expected 401/403/404 but got ${status}`).toBe(true)
  })
})

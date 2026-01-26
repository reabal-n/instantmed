/**
 * E2E Test Authentication Helper
 * 
 * Provides functions to authenticate as seeded test users in Playwright tests.
 * Uses the /api/test/login endpoint which is only available in non-production.
 * 
 * Required env vars:
 * - E2E_SECRET: Secret key for test auth endpoint
 */

import { Page, APIRequestContext } from "@playwright/test"

const E2E_SECRET = process.env.E2E_SECRET || "e2e-test-secret-local"
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001"

export type TestUserType = "operator" | "doctor" | "patient"

/**
 * Login as a test user via the E2E auth endpoint.
 * Sets cookies that the app's auth helpers will recognize.
 */
export async function loginAsTestUser(
  page: Page,
  userType: TestUserType
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await page.request.post(`${BASE_URL}/api/test/login`, {
      headers: {
        "X-E2E-SECRET": E2E_SECRET,
        "Content-Type": "application/json",
      },
      data: { userType },
    })

    if (!response.ok()) {
      const body = await response.json().catch(() => ({}))
      return { 
        success: false, 
        error: body.error || `Login failed with status ${response.status()}` 
      }
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

/**
 * Logout / clear E2E auth session.
 */
export async function logoutTestUser(page: Page): Promise<void> {
  await page.request.delete(`${BASE_URL}/api/test/login`, {
    headers: {
      "X-E2E-SECRET": E2E_SECRET,
    },
  }).catch(() => {})
}

/**
 * Login as operator (admin+doctor) user.
 * This user has access to both /admin and /doctor routes.
 */
export async function loginAsOperator(page: Page): Promise<{ success: boolean; error?: string }> {
  return loginAsTestUser(page, "operator")
}

/**
 * Login as doctor-only user (NOT admin).
 * This user has access to /doctor routes but NOT admin-only features.
 */
export async function loginAsDoctor(page: Page): Promise<{ success: boolean; error?: string }> {
  return loginAsTestUser(page, "doctor")
}

/**
 * Login as patient user.
 */
export async function loginAsPatient(page: Page): Promise<{ success: boolean; error?: string }> {
  return loginAsTestUser(page, "patient")
}

/**
 * Helper to use with API request context directly.
 */
export async function loginWithRequest(
  request: APIRequestContext,
  userType: TestUserType
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await request.post(`${BASE_URL}/api/test/login`, {
      headers: {
        "X-E2E-SECRET": E2E_SECRET,
        "Content-Type": "application/json",
      },
      data: { userType },
    })

    if (!response.ok()) {
      const body = await response.json().catch(() => ({}))
      return { 
        success: false, 
        error: body.error || `Login failed with status ${response.status()}` 
      }
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

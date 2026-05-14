/**
 * API-Level RBAC Contract Tests
 *
 * Ensures backend API routes properly reject unauthorized roles at the
 * server boundary, not just at the page/UI level.
 *
 * Tests cover:
 * - Unauthenticated requests   → denied (any 4xx)
 * - Patient role               → denied on doctor/admin endpoints (any 4xx)
 * - Operator role (admin+doc)  → auth check passes (not a middleware reject)
 *
 * Routes exercised:
 * - GET  /api/doctor/scripts             (doctor/admin only)
 * - POST /api/med-cert/preview          (doctor/admin only, CSRF after auth)
 *
 * Notes on response codes:
 * - Middleware returns **404** for unauthenticated API requests (security
 *   default to prevent endpoint enumeration). Tests treat 401/403/404 as "denied".
 * - POST routes also require X-CSRF-Token. Tests don't supply one, so even
 *   authenticated POSTs see 403 from CSRF. For operator-success tests on
 *   POST endpoints we treat the response as "auth passed" if it's anything
 *   other than a middleware 404 reject. CSRF is covered by lib/__tests__/csrf.test.ts.
 */

import { APIResponse, expect, test } from "@playwright/test"

import { loginWithRequest } from "./helpers/auth"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001"

/**
 * Returns true if the response status is in the "denied" range.
 * Covers auth rejection (404), forbidden (403), and unauthorized (401).
 */
function isDenied(status: number): boolean {
  return status === 401 || status === 403 || status === 404
}

/**
 * Returns true if the response indicates auth middleware rejected the request
 * BEFORE it reached the route handler (i.e. the operator wasn't recognized as
 * authenticated). Used by operator-success tests.
 *
 * Auth middleware returns 404 with no JSON error field for unauthenticated
 * API requests. A handler-level 401 will have an `error` field in the body.
 */
async function wasRejectedByMiddleware(response: APIResponse): Promise<boolean> {
  if (response.status() !== 404) return false
  const body = await response.json().catch(() => null)
  // Handler 404s (e.g. "Intake not found") have body.error. Middleware
  // 404s are an empty body / non-JSON.
  return !body || !body.error
}

// ============================================================================
// UNAUTHENTICATED REQUESTS - every route must reject
// ============================================================================

test.describe("API RBAC - Unauthenticated Requests", () => {
  test("GET /api/doctor/scripts is denied without auth", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/doctor/scripts`)
    expect(isDenied(response.status())).toBe(true)
  })

  test("POST /api/med-cert/preview is denied without auth", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/med-cert/preview`, {
      data: { draftData: { patient_full_name: "Test" } },
    })
    expect(isDenied(response.status())).toBe(true)
  })
})

// ============================================================================
// PATIENT ROLE - must be denied on doctor/admin endpoints
// ============================================================================

test.describe("API RBAC - Patient Role Restrictions", () => {
  test.beforeEach(async ({ request }) => {
    const result = await loginWithRequest(request, "patient")
    expect(result.success, `Patient login should succeed: ${result.error}`).toBe(true)
  })

  test("patient cannot GET /api/doctor/scripts", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/doctor/scripts`)
    expect(isDenied(response.status())).toBe(true)
  })

  test("patient cannot POST /api/med-cert/preview", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/med-cert/preview`, {
      data: { draftData: { patient_full_name: "Test" } },
    })
    expect(isDenied(response.status())).toBe(true)
  })
})

// ============================================================================
// OPERATOR ROLE - auth check should PASS (middleware lets through)
// ============================================================================

test.describe("API RBAC - Operator Role Access", () => {
  test.beforeEach(async ({ request }) => {
    const result = await loginWithRequest(request, "operator")
    expect(result.success, `Operator login should succeed: ${result.error}`).toBe(true)
  })

  test("operator can GET /api/doctor/scripts", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/doctor/scripts`)
    // GET - no CSRF. Should reach handler. Expect 200, or at worst a server-
    // side 500 (DB issue). Must NOT be an auth rejection.
    expect(await wasRejectedByMiddleware(response)).toBe(false)
    expect([401, 403]).not.toContain(response.status())

    if (response.status() === 200) {
      const body = await response.json()
      expect(body).toHaveProperty("tasks")
      expect(body).toHaveProperty("counts")
    }
  })

  test("operator POST /api/med-cert/preview - auth passes (CSRF may fail)", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/med-cert/preview`, {
      data: {
        draftData: {
          patient_full_name: "Test Patient",
          date_from: new Date().toISOString().split("T")[0],
          date_to: new Date().toISOString().split("T")[0],
          reason: "Test preview",
        },
      },
    })
    expect(await wasRejectedByMiddleware(response)).toBe(false)
  })
})

// ============================================================================
// RESPONSE SHAPE VALIDATION
// ============================================================================

test.describe("API RBAC - Response Shape Validation", () => {
  test("denied responses use a 4xx status code", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/doctor/scripts`)
    expect(isDenied(response.status())).toBe(true)
  })

  test("patient on doctor endpoint is denied", async ({ request }) => {
    await loginWithRequest(request, "patient")
    const response = await request.get(`${BASE_URL}/api/doctor/scripts`)
    expect(isDenied(response.status())).toBe(true)
  })
})

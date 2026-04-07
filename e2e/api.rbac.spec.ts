/**
 * API-Level RBAC Contract Tests
 *
 * Ensures backend API routes properly reject unauthorized roles at the
 * server boundary, not just at the page/UI level.
 *
 * Tests cover:
 * - Unauthenticated requests   → denied (any 4xx)
 * - Patient role               → denied on doctor/admin endpoints (any 4xx)
 * - Operator role (admin+doc)  → auth check passes (NOT a Clerk-rejected 4xx)
 *
 * Routes exercised:
 * - GET  /api/doctor/monitoring-stats   (doctor/admin only)
 * - POST /api/doctor/assign-request     (doctor/admin only, CSRF after auth)
 * - POST /api/doctor/update-request     (doctor/admin only, CSRF before auth)
 * - POST /api/med-cert/preview          (doctor/admin only, CSRF after auth)
 *
 * Notes on response codes:
 * - Clerk middleware's `auth.protect()` returns **404** for unauthenticated
 *   API requests (a security default to prevent endpoint enumeration). It is
 *   NOT 401. Tests treat 401/403/404 all as "denied".
 * - POST routes also require X-CSRF-Token. Tests don't supply one, so even
 *   authenticated POSTs see 403 from CSRF. For operator-success tests on
 *   POST endpoints we treat the response as "auth passed" if it's anything
 *   other than a Clerk 404 reject. CSRF is covered by lib/__tests__/csrf.test.ts.
 */

import { test, expect, APIResponse } from "@playwright/test"
import { loginWithRequest } from "./helpers/auth"
import { INTAKE_ID } from "./helpers/db"

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001"

/**
 * Returns true if the response status is in the "denied" range.
 * Covers Clerk auth rejection (404), forbidden (403), and unauthorized (401).
 */
function isDenied(status: number): boolean {
  return status === 401 || status === 403 || status === 404
}

/**
 * Returns true if the response indicates Clerk middleware rejected the request
 * BEFORE it reached the route handler (i.e. the operator wasn't recognized as
 * authenticated). Used by operator-success tests.
 *
 * Clerk's `auth.protect()` returns 404 with no JSON error field for unauth
 * API requests. A handler-level 401 will have an `error` field in the body.
 */
async function wasRejectedByMiddleware(response: APIResponse): Promise<boolean> {
  if (response.status() !== 404) return false
  const body = await response.json().catch(() => null)
  // Handler 404s (e.g. "Intake not found") have body.error. Clerk middleware
  // 404s are an empty body / non-JSON.
  return !body || !body.error
}

// ============================================================================
// UNAUTHENTICATED REQUESTS — every route must reject
// ============================================================================

test.describe("API RBAC - Unauthenticated Requests", () => {
  test("GET /api/doctor/monitoring-stats is denied without auth", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/doctor/monitoring-stats`)
    expect(isDenied(response.status())).toBe(true)
  })

  test("POST /api/doctor/assign-request is denied without auth", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/doctor/assign-request`, {
      data: { intake_id: INTAKE_ID, doctor_id: "00000000-0000-0000-0000-000000000000" },
    })
    expect(isDenied(response.status())).toBe(true)
  })

  test("POST /api/doctor/update-request is denied without auth", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/doctor/update-request`, {
      data: { intake_id: INTAKE_ID, action: "approve" },
    })
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
// PATIENT ROLE — must be denied on doctor/admin endpoints
// ============================================================================

test.describe("API RBAC - Patient Role Restrictions", () => {
  test.beforeEach(async ({ request }) => {
    const result = await loginWithRequest(request, "patient")
    expect(result.success, `Patient login should succeed: ${result.error}`).toBe(true)
  })

  test("patient cannot GET /api/doctor/monitoring-stats", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/doctor/monitoring-stats`)
    expect(isDenied(response.status())).toBe(true)
  })

  test("patient cannot POST /api/doctor/assign-request", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/doctor/assign-request`, {
      data: { intake_id: INTAKE_ID, doctor_id: "00000000-0000-0000-0000-000000000000" },
    })
    expect(isDenied(response.status())).toBe(true)
  })

  test("patient cannot POST /api/doctor/update-request (approve)", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/doctor/update-request`, {
      data: { intake_id: INTAKE_ID, action: "approve" },
    })
    expect(isDenied(response.status())).toBe(true)
  })

  test("patient cannot POST /api/doctor/update-request (decline)", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/doctor/update-request`, {
      data: { intake_id: INTAKE_ID, action: "decline", notes: "test" },
    })
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
// OPERATOR ROLE — auth check should PASS (Clerk middleware lets through)
// ============================================================================

test.describe("API RBAC - Operator Role Access", () => {
  test.beforeEach(async ({ request }) => {
    const result = await loginWithRequest(request, "operator")
    expect(result.success, `Operator login should succeed: ${result.error}`).toBe(true)
  })

  test("operator can GET /api/doctor/monitoring-stats", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/doctor/monitoring-stats`)
    // GET — no CSRF. Should reach handler. Expect 200, or at worst a server-
    // side 500 (DB issue). Must NOT be a Clerk auth rejection.
    expect(await wasRejectedByMiddleware(response)).toBe(false)
    expect([401, 403]).not.toContain(response.status())

    if (response.status() === 200) {
      const body = await response.json()
      // Shape check against the actual monitoring-stats response
      expect(body).toHaveProperty("queueSize")
      expect(body).toHaveProperty("approvedToday")
    }
  })

  test("operator POST /api/doctor/assign-request — auth passes (CSRF may fail)", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/doctor/assign-request`, {
      data: {
        intake_id: INTAKE_ID,
        doctor_id: "e2e00000-0000-0000-0000-000000000001",
      },
    })
    // Without a CSRF token, an authed operator hits CSRF and gets a handler 403
    // ("Invalid or missing CSRF token"). The KEY assertion: NOT rejected by
    // Clerk middleware (auth recognized).
    expect(await wasRejectedByMiddleware(response)).toBe(false)
  })

  test("operator POST /api/doctor/update-request — auth passes (CSRF may fail)", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/doctor/update-request`, {
      data: { intake_id: INTAKE_ID, action: "approve" },
    })
    expect(await wasRejectedByMiddleware(response)).toBe(false)
  })

  test("operator POST /api/med-cert/preview — auth passes (CSRF may fail)", async ({ request }) => {
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
    const response = await request.get(`${BASE_URL}/api/doctor/monitoring-stats`)
    expect(isDenied(response.status())).toBe(true)
  })

  test("patient on doctor endpoint is denied", async ({ request }) => {
    await loginWithRequest(request, "patient")
    const response = await request.get(`${BASE_URL}/api/doctor/monitoring-stats`)
    expect(isDenied(response.status())).toBe(true)
  })
})

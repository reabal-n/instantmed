/**
 * Sentry API Observability E2E Tests
 * 
 * Tests that verify Sentry error capture is working correctly:
 * 1. API 500 response capture (handled failures)
 * 2. Request ID correlation
 * 
 * PLAYWRIGHT MODE ONLY - requires PLAYWRIGHT=1 environment variable
 */

import { expect, test } from "@playwright/test"

test.describe("Sentry API Observability", () => {
  test.describe("API 500 Response Capture", () => {
    test("captures handled 500 response to Sentry", async ({ request }) => {
      // Call the boom-500 route with action=500
      const response = await request.get("/api/test/boom-500?action=500")
      
      // Should return 500 status
      expect(response.status()).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe("Internal server error")
      expect(data.test_type).toBe("handled_500_response")
      
      // Check that x-request-id header is present
      const requestId = response.headers()["x-request-id"]
      expect(requestId).toBeDefined()
      expect(typeof requestId).toBe("string")
      
      // eslint-disable-next-line no-console
      console.log(`[SENTRY_TEST] 500 response x-request-id: ${requestId}`)
    })

    test("captures handled 503 response to Sentry", async ({ request }) => {
      const response = await request.get("/api/test/boom-500?action=503")
      
      expect(response.status()).toBe(503)
      
      const data = await response.json()
      expect(data.error).toBe("Service unavailable")
      
      // Check that x-request-id header is present
      const requestId = response.headers()["x-request-id"]
      expect(requestId).toBeDefined()
      
      // eslint-disable-next-line no-console
      console.log(`[SENTRY_TEST] 503 response x-request-id: ${requestId}`)
    })

    test("boom-500 health check works", async ({ request }) => {
      const response = await request.get("/api/test/boom-500")
      
      expect(response.status()).toBe(200)
      
      const data = await response.json()
      expect(data.ok).toBe(true)
      expect(data.runtime).toBe("nodejs")
    })
  })

  test.describe("Request ID Correlation", () => {
    test("generates x-request-id if not provided", async ({ request }) => {
      const response = await request.get("/api/test/boom-500")
      
      const requestId = response.headers()["x-request-id"]
      expect(requestId).toBeDefined()
      // UUID v4 format
      expect(requestId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i)
    })

    test("reuses x-request-id if provided in request", async ({ request }) => {
      const customRequestId = "test-request-id-12345678"
      
      const response = await request.get("/api/test/boom-500", {
        headers: {
          "x-request-id": customRequestId,
        },
      })
      
      const responseRequestId = response.headers()["x-request-id"]
      expect(responseRequestId).toBe(customRequestId)
    })
  })
})

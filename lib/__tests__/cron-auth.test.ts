import { describe, it, expect, vi, beforeEach } from "vitest"

// Must mock server-only before import
vi.mock("server-only", () => ({}))

import { verifyCronRequest } from "@/lib/api/cron-auth"
import { NextRequest } from "next/server"

describe("cron-auth", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret")
    vi.stubEnv("VERCEL", "")
  })

  it("should allow valid CRON_SECRET", () => {
    const req = new NextRequest("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer test-cron-secret" },
    })
    expect(verifyCronRequest(req)).toBeNull()
  })

  it("should reject missing auth header", () => {
    const req = new NextRequest("https://example.com/api/cron/test")
    const result = verifyCronRequest(req)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(401)
  })

  it("should reject wrong secret", () => {
    const req = new NextRequest("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer wrong-secret" },
    })
    const result = verifyCronRequest(req)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(401)
  })

  it("should return 500 when CRON_SECRET not configured", () => {
    vi.stubEnv("CRON_SECRET", "")
    const req = new NextRequest("https://example.com/api/cron/test", {
      headers: { authorization: "Bearer anything" },
    })
    const result = verifyCronRequest(req)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(500)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Must mock server-only before import
vi.mock("server-only", () => ({}))

import { NextRequest } from "next/server"

import { verifyCronRequest, withCronTimeout } from "@/lib/api/cron-auth"

describe("cron-auth", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret")
    vi.stubEnv("VERCEL", "")
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
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

  it("returns a timeout and aborts even when the callback never settles", async () => {
    vi.useFakeTimers()
    const receivedSignal: { current?: AbortSignal } = {}

    const outcome = withCronTimeout(
      (signal) => {
        receivedSignal.current = signal
        return new Promise<string>(() => {})
      },
      { timeoutMs: 25, jobName: "hung-cron" },
    )

    await vi.advanceTimersByTimeAsync(25)

    await expect(outcome).resolves.toEqual({
      timedOut: true,
      jobName: "hung-cron",
    })
    expect(receivedSignal.current?.aborted).toBe(true)
  })
})

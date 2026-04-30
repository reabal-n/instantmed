import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/cron/expire-certificates/route"

import { mockSupabaseFrom } from "./setup"

const cronAuthMocks = vi.hoisted(() => ({
  acquireCronLock: vi.fn(async () => ({ acquired: true })),
  releaseCronLock: vi.fn(async () => undefined),
  verifyCronRequest: vi.fn(() => null),
}))

vi.mock("@/lib/api/cron-auth", () => cronAuthMocks)

vi.mock("@/lib/monitoring/cron-heartbeat", () => ({
  recordCronHeartbeat: vi.fn(),
}))

vi.mock("@/lib/observability/sentry", () => ({
  captureCronError: vi.fn(),
}))

function createCronRequest() {
  return new NextRequest("https://example.com/api/cron/expire-certificates", {
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

describe("expire-certificates cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cronAuthMocks.acquireCronLock.mockResolvedValue({ acquired: true })
    cronAuthMocks.releaseCronLock.mockResolvedValue(undefined)
    cronAuthMocks.verifyCronRequest.mockReturnValue(null)
  })

  it("releases its cron lock when certificate fetching fails", async () => {
    const chain = {
      eq: vi.fn(() => chain),
      limit: vi.fn(async () => ({
        data: null,
        error: { message: "database unavailable" },
      })),
      lt: vi.fn(() => chain),
      select: vi.fn(() => chain),
    }

    mockSupabaseFrom.mockReturnValue(chain)

    const response = await GET(createCronRequest())

    expect(response.status).toBe(500)
    expect(cronAuthMocks.releaseCronLock).toHaveBeenCalledWith("expire-certificates")
  })
})

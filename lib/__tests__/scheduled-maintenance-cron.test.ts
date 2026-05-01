import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
  revalidateTag: vi.fn(),
  upsert: vi.fn(),
  verifyCronRequest: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
}))

vi.mock("@/lib/api/cron-auth", () => ({
  verifyCronRequest: mocks.verifyCronRequest,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { GET } from "@/app/api/cron/scheduled-maintenance/route"

function createCronRequest() {
  return new NextRequest("https://instantmed.example/api/cron/scheduled-maintenance", {
    headers: { authorization: "Bearer test-cron-secret" },
  })
}

function createFeatureFlagClient(flags: Array<Record<string, unknown>>) {
  const selectChain = {
    in: vi.fn(async () => ({ data: flags, error: null })),
  }

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      upsert: mocks.upsert,
    })),
  }
}

describe("scheduled maintenance cron", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyCronRequest.mockReturnValue(null)
    mocks.upsert.mockResolvedValue({ error: null })
  })

  it("does not disable manually enabled maintenance mode after an old schedule expires", async () => {
    mocks.createServiceRoleClient.mockReturnValue(createFeatureFlagClient([
      {
        key: "maintenance_mode",
        value: true,
        updated_by: "manual-admin",
      },
      {
        key: "maintenance_scheduled_start",
        value: "2026-04-01T00:00:00.000Z",
      },
      {
        key: "maintenance_scheduled_end",
        value: "2026-04-01T01:00:00.000Z",
      },
    ]))

    const response = await GET(createCronRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.maintenance_mode).toBe(true)
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it("disables maintenance mode after an expired schedule when cron enabled it", async () => {
    mocks.createServiceRoleClient.mockReturnValue(createFeatureFlagClient([
      {
        key: "maintenance_mode",
        value: true,
        updated_by: "cron:scheduled-maintenance",
      },
      {
        key: "maintenance_scheduled_start",
        value: "2026-04-01T00:00:00.000Z",
      },
      {
        key: "maintenance_scheduled_end",
        value: "2026-04-01T01:00:00.000Z",
      },
    ]))

    const response = await GET(createCronRequest())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.maintenance_mode).toBe(false)
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "maintenance_mode",
        value: false,
        updated_by: "cron:scheduled-maintenance",
      }),
      { onConflict: "key" },
    )
    expect(mocks.revalidateTag).toHaveBeenCalledWith("feature-flags")
  })
})

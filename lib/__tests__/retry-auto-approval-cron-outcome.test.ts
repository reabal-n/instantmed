import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  attemptAutoApproval: vi.fn(),
  generateDraftsForIntake: vi.fn(),
  getFeatureFlags: vi.fn(),
  markDraftsReady: vi.fn(),
  recordCronHeartbeat: vi.fn(),
  recoverStale: vi.fn(),
  verifyCronRequest: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock("@/lib/api/cron-auth", () => ({
  verifyCronRequest: mocks.verifyCronRequest,
}))

vi.mock("@/lib/clinical/auto-approval-governance", () => ({
  getEffectiveAutoApprovalSettings: () => ({ delayMinutes: 0 }),
  isAutoApprovalGovernanceApproved: () => true,
}))

vi.mock("@/lib/clinical/auto-approval-pipeline", () => ({
  attemptAutoApproval: mocks.attemptAutoApproval,
}))

vi.mock("@/lib/clinical/auto-approval-state", () => ({
  markDraftsReady: mocks.markDraftsReady,
  recoverStale: mocks.recoverStale,
}))

vi.mock("@/app/actions/generate-drafts", () => ({
  generateDraftsForIntake: mocks.generateDraftsForIntake,
}))

vi.mock("@/lib/config/env", () => ({
  env: { appUrl: "https://instantmed.example" },
}))

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlags: mocks.getFeatureFlags,
}))

vi.mock("@/lib/monitoring/cron-heartbeat", () => ({
  recordCronHeartbeat: mocks.recordCronHeartbeat,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
}))

vi.mock("@/lib/observability/sentry", () => ({
  captureCronError: vi.fn(),
}))

type QueryResult = {
  data: unknown[] | null
  error: { message: string } | null
}

function createQuery(result: QueryResult) {
  const query: Record<string, unknown> = {}
  for (const method of ["eq", "gt", "in", "is", "like", "limit", "lt", "not", "order"]) {
    query[method] = vi.fn(() => query)
  }
  query.then = (
    resolve: (value: QueryResult) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return query
}

function createSupabaseClient(input: {
  documentResults?: QueryResult[]
  intakeResults: QueryResult[]
}) {
  const intakeResults = [...input.intakeResults]
  const documentResults = [...(input.documentResults ?? [])]

  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => {
        const result = table === "intakes"
          ? intakeResults.shift()
          : table === "document_drafts"
            ? documentResults.shift()
            : undefined
        if (!result) throw new Error(`Unexpected ${table} query`)
        return createQuery(result)
      }),
    })),
  }
}

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(),
}))

import { GET } from "@/app/api/cron/retry-auto-approval/route"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const emptyResult = (): QueryResult => ({ data: [], error: null })
const request = new NextRequest("https://instantmed.example/api/cron/retry-auto-approval")

describe("retry auto-approval cron outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyCronRequest.mockReturnValue(null)
    mocks.getFeatureFlags.mockResolvedValue({ ai_auto_approve_enabled: true })
    mocks.recordCronHeartbeat.mockResolvedValue(undefined)
    mocks.recoverStale.mockResolvedValue(true)
    mocks.markDraftsReady.mockResolvedValue(true)
    mocks.generateDraftsForIntake.mockResolvedValue({ success: true })
  })

  it("counts a pipeline result with success=false as failed work", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(createSupabaseClient({
      intakeResults: [
        emptyResult(),
        {
          data: [{
            id: "intake-1",
            auto_approval_state: "pending",
            auto_approval_attempts: 1,
            auto_approval_state_updated_at: new Date().toISOString(),
          }],
          error: null,
        },
        emptyResult(),
        emptyResult(),
        emptyResult(),
      ],
      documentResults: [{ data: [{ id: "draft-1" }], error: null }],
    }) as never)
    mocks.attemptAutoApproval.mockResolvedValue({
      success: false,
      autoApproved: false,
      reason: "No doctor available",
      error: "doctor lookup failed",
    })

    const response = await GET(request)

    await expect(response.json()).resolves.toMatchObject({
      approved: 0,
      failed: 1,
      skipped: 0,
    })
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "retry-auto-approval",
      expect.objectContaining({ status: "partial_failure" }),
    )
  })

  it("marks failed stale and awaiting-draft recovery transitions partial", async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(createSupabaseClient({
      intakeResults: [
        emptyResult(),
        emptyResult(),
        { data: [{ id: "stale-attempt" }], error: null },
        { data: [{ id: "stale-drafts" }], error: null },
      ],
    }) as never)
    mocks.recoverStale.mockResolvedValue(false)
    mocks.markDraftsReady.mockResolvedValue(false)

    const response = await GET(request)

    await expect(response.json()).resolves.toMatchObject({
      processed: 0,
      recovered: 0,
    })
    expect(mocks.recoverStale).toHaveBeenCalledOnce()
    expect(mocks.markDraftsReady).toHaveBeenCalledOnce()
    expect(mocks.recordCronHeartbeat).toHaveBeenCalledWith(
      "retry-auto-approval",
      expect.objectContaining({
        itemsProcessed: 0,
        status: "partial_failure",
      }),
    )
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SEEDED_E2E_PATIENT_PROFILE_ID } from "@/lib/data/seeded-e2e-data"

const mocks = vi.hoisted(() => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  viewError: null as string | null,
  queriedTables: [] as string[],
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    error: mocks.logError,
    warn: mocks.logWarn,
    info: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock("@/lib/stripe/price-config-health", () => ({
  countStripePriceConfigIssues: () => 0,
}))

type StuckViewRow = {
  id: string
  patient_id: string
  exclude_from_reporting: boolean | null
  reference_number: string
  status: "paid"
  payment_status: "paid"
  category: "medical_certificate"
  subtype: null
  service_name: string
  service_type: string
  is_priority: boolean
  patient_email: string
  patient_name: string
  created_at: string
  paid_at: string
  reviewed_at: null
  approved_at: null
  stuck_reason: "paid_no_review"
  stuck_age_minutes: number
}

function row(
  id: string,
  patientId: string,
  excludeFromReporting: boolean | null,
): StuckViewRow {
  return {
    id,
    patient_id: patientId,
    exclude_from_reporting: excludeFromReporting,
    reference_number: `IM-${id}`,
    status: "paid",
    payment_status: "paid",
    category: "medical_certificate",
    subtype: null,
    service_name: "Medical certificate",
    service_type: "medical_certificate",
    is_priority: false,
    patient_email: `${id}@example.test`,
    patient_name: id,
    created_at: "2026-08-14T00:00:00.000Z",
    paid_at: "2026-08-14T00:00:00.000Z",
    reviewed_at: null,
    approved_at: null,
    stuck_reason: "paid_no_review",
    stuck_age_minutes: 30,
  }
}

const defaultSourceRows = [
  row("legitimate-stuck", "11111111-1111-4111-8111-111111111111", null),
  row("seeded-stuck", SEEDED_E2E_PATIENT_PROFILE_ID, false),
  row("excluded-stuck", "22222222-2222-4222-8222-222222222222", true),
]
let sourceRows = [...defaultSourceRows]

function createStuckViewQuery() {
  let visibleRows = [...sourceRows]
  let head = false
  let rangeStart = 0
  let rangeEnd = Number.POSITIVE_INFINITY
  const query = {
    select: (_columns?: string, options?: { head?: boolean }) => {
      head = options?.head === true
      return query
    },
    order: () => query,
    range: (from: number, to: number) => {
      rangeStart = from
      rangeEnd = to
      return query
    },
    eq: (column: string, value: string) => {
      visibleRows = visibleRows.filter((item) => (
        item[column as keyof StuckViewRow] === value
      ))
      return query
    },
    or: (filter: string) => {
      if (filter === "exclude_from_reporting.is.null,exclude_from_reporting.eq.false") {
        visibleRows = visibleRows.filter((item) => item.exclude_from_reporting !== true)
      }
      return query
    },
    not: (column: string, operator: string, value: string) => {
      if (column === "patient_id" && operator === "in") {
        const excludedIds = new Set(value.slice(1, -1).split(","))
        visibleRows = visibleRows.filter((item) => !excludedIds.has(item.patient_id))
      }
      return query
    },
    then: (
      onFulfilled: (value: {
        data: StuckViewRow[] | null
        count: number | null
        error: { message: string } | null
      }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(
      mocks.viewError
        ? { data: null, count: null, error: { message: mocks.viewError } }
        : {
            data: head ? null : visibleRows.slice(rangeStart, rangeEnd + 1),
            count: head ? visibleRows.length : null,
            error: null,
          },
    ).then(onFulfilled, onRejected),
  }

  return query
}

function createZeroCountQuery() {
  const query: Record<string, unknown> = {}
  for (const method of ["select", "eq", "gte", "not", "in", "like", "or", "order"]) {
    query[method] = () => query
  }
  query.then = (
    onFulfilled: (value: { data: null; count: number; error: null }) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve({ data: null, count: 0, error: null }).then(onFulfilled, onRejected)
  return query
}

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    from: (table: string) => {
      mocks.queriedTables.push(table)
      return table === "v_stuck_intakes" ? createStuckViewQuery() : createZeroCountQuery()
    },
  }),
}))

describe("reportable stuck-intake boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.viewError = null
    mocks.queriedTables.length = 0
    sourceRows = [...defaultSourceRows]
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("PLAYWRIGHT", "")
    vi.stubEnv("E2E", "")
    vi.stubEnv("E2E_MODE", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("keeps System Health, Operations, and alerts on the same reportable rows", async () => {
    const { getStuckIntakes } = await import("@/lib/data/intake-ops")
    const { getSystemHealth } = await import("@/lib/data/system-health")

    const [result, health] = await Promise.all([getStuckIntakes(), getSystemHealth()])

    expect(result.error).toBeUndefined()
    expect(result.counts).toMatchObject({ paid_no_review: 1, total: 1 })
    expect(result.data.map((item) => item.id)).toEqual(["legitimate-stuck"])
    expect(health).toMatchObject({
      stuckIntakes: 1,
      totalIssues: 1,
      degraded: false,
    })
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Intake stuck: paid_no_review",
      expect.anything(),
    )
  })

  it("fails closed without a direct-table fallback or an all-clear alert", async () => {
    mocks.viewError = "column v_stuck_intakes.exclude_from_reporting does not exist"
    const { getStuckIntakes } = await import("@/lib/data/intake-ops")
    const { getSystemHealth } = await import("@/lib/data/system-health")

    const [result, health] = await Promise.all([getStuckIntakes(), getSystemHealth()])

    expect(result.data).toEqual([])
    expect(result.error).toContain("status is unavailable")
    expect(health.stuckIntakes).toBeNull()
    expect(health.degraded).toBe(true)
    expect(mocks.queriedTables).not.toContain("intakes")
    expect(mocks.captureMessage).not.toHaveBeenCalled()
  })

  it("pages Operations beyond the PostgREST ceiling so its total matches System Health", async () => {
    sourceRows = Array.from({ length: 1001 }, (_, index) => row(
      `bulk-${index.toString().padStart(4, "0")}`,
      `33333333-3333-4333-8333-${index.toString().padStart(12, "0")}`,
      false,
    ))
    const { getStuckIntakes } = await import("@/lib/data/intake-ops")
    const { getSystemHealth } = await import("@/lib/data/system-health")

    const [result, health] = await Promise.all([getStuckIntakes(), getSystemHealth()])
    const repeated = await getStuckIntakes()

    expect(result.error).toBeUndefined()
    expect(result.data).toHaveLength(1001)
    expect(result.counts.total).toBe(1001)
    expect(health.stuckIntakes).toBe(1001)
    expect(repeated.counts.total).toBe(1001)
    expect(mocks.queriedTables.filter((table) => table === "v_stuck_intakes")).toHaveLength(5)
    expect(mocks.captureMessage).toHaveBeenCalledTimes(1)
    expect(mocks.captureMessage).toHaveBeenCalledWith(
      "Intake stuck: paid_no_review",
      expect.objectContaining({
        extra: expect.objectContaining({ stuck_count: 1001 }),
      }),
    )
  })

  it("re-arms a recovered bucket when the same aggregate shape recurs", async () => {
    const { getStuckIntakes } = await import("@/lib/data/intake-ops")

    sourceRows = [row(
      "incident-a",
      "44444444-4444-4444-8444-444444444444",
      false,
    )]
    await getStuckIntakes()

    sourceRows = []
    await getStuckIntakes()

    sourceRows = [row(
      "incident-b",
      "55555555-5555-4555-8555-555555555555",
      false,
    )]
    await getStuckIntakes()

    expect(mocks.captureMessage).toHaveBeenCalledTimes(2)
  })

  it("does not treat buckets omitted by a filtered read as recovered", async () => {
    const { getStuckIntakes } = await import("@/lib/data/intake-ops")
    sourceRows = [
      row("med-bucket", "66666666-6666-4666-8666-666666666666", false),
      {
        ...row("rx-bucket", "77777777-7777-4777-8777-777777777777", false),
        service_name: "Repeat prescription",
        service_type: "prescription",
      },
    ]

    const fullBefore = await getStuckIntakes()
    const initialWarningCount = mocks.captureMessage.mock.calls.length
    const filteredA = await getStuckIntakes({ service_type: "medical_certificate" })
    const filteredEmpty = await getStuckIntakes({ service_type: "missing-service" })
    const fullAfter = await getStuckIntakes()

    expect(fullBefore.data.map((item) => item.id)).toEqual(["med-bucket", "rx-bucket"])
    expect(filteredA.data.map((item) => item.id)).toEqual(["med-bucket"])
    expect(filteredEmpty.data).toEqual([])
    expect(fullAfter.data.map((item) => item.id)).toEqual(["med-bucket", "rx-bucket"])
    expect(initialWarningCount).toBeGreaterThan(0)
    expect(mocks.captureMessage).toHaveBeenCalledTimes(initialWarningCount)
  })
})

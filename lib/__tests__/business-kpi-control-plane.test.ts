import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { getBusinessKPIData } from "@/lib/data/business-kpi"

type QueryResult = {
  count?: number | null
  data?: unknown[] | null
  error?: { message: string } | null
}

type SelectCall = {
  columns: string
  operations: string[]
  table: string
}

function createQuery(result: QueryResult, selectCall: SelectCall) {
  const query = {
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    in: vi.fn(() => query),
    lt: vi.fn(() => query),
    not: vi.fn((column: string, operator: string, value: unknown) => {
      selectCall.operations.push(`not:${column}:${operator}:${String(value)}`)
      return query
    }),
    order: vi.fn(() => query),
    then: (resolve: (value: QueryResult) => void) =>
      Promise.resolve(result).then(resolve),
  }
  return query
}

function createBusinessKpiSupabaseMock(results: QueryResult[]) {
  const selectCalls: SelectCall[] = []

  const supabase = {
    from: vi.fn((table: string) => ({
      select: vi.fn((columns: string) => {
        const result = results[selectCalls.length] || { data: [], error: null }
        const selectCall = { columns, operations: [], table }
        selectCalls.push(selectCall)
        return createQuery(result, selectCall)
      }),
    })),
  }

  return { selectCalls, supabase }
}

describe("business KPI control plane", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("exposes unit economics, support load, disputes, and repeat usage from backend truth", async () => {
    const now = new Date()
    const older = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
    const newer = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()

    const { selectCalls, supabase } = createBusinessKpiSupabaseMock([
      {
        data: [
          {
            amount_cents: 2995,
            category: "prescription",
            paid_at: older,
            patient_id: "patient-1",
          },
          {
            amount_cents: 1995,
            category: "medical_certificate",
            paid_at: newer,
            patient_id: "patient-1",
          },
          {
            amount_cents: 4995,
            category: "consult",
            paid_at: newer,
            patient_id: "patient-2",
          },
        ],
        error: null,
      },
      {
        data: [
          { amount_cents: 2995, paid_at: older },
          { amount_cents: 1995, paid_at: newer },
          { amount_cents: 4995, paid_at: newer },
        ],
        error: null,
      },
      { count: 1, data: null, error: null },
      { count: 2, data: null, error: null },
      { data: [{ approved_at: newer, paid_at: older }], error: null },
      { count: 1, data: null, error: null },
      { data: [{ reviewed_by: "doctor-1" }], error: null },
      { data: [{ status: "sent" }, { status: "failed" }], error: null },
      { count: 6, data: null, error: null },
      { count: 3, data: null, error: null },
      { count: 2, data: null, error: null },
      { data: [{ utm_source: "google" }, { utm_source: "google" }], error: null },
      { count: 100, data: null, error: null },
      { data: [{ amount_cents: 1995 }], error: null },
      { data: [{ amount_cents: 9985 }], error: null },
      { count: 0, data: null, error: null },
      { count: 1, data: null, error: null },
      { data: [{ amount_cents: 1995 }], error: null },
      { data: [{ amount_cents: 2995 }], error: null },
      {
        data: [
          { priority: "normal", status: "open" },
          { priority: "urgent", status: "in_progress" },
          { priority: "high", status: "resolved" },
          { priority: "low", status: "closed" },
        ],
        error: null,
      },
      {
        data: [
          { status: "needs_response" },
          { status: "won" },
        ],
        error: null,
      },
    ])

    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const data = await getBusinessKPIData()

    expect(selectCalls[0]).toMatchObject({
      columns: "amount_cents, paid_at, category, patient_id",
      table: "intakes",
    })
    expect(selectCalls.at(-2)).toMatchObject({ table: "support_tickets" })
    expect(selectCalls.at(-1)).toMatchObject({ table: "stripe_disputes" })
    expect(selectCalls.find((call) => call.columns === "utm_source")).toMatchObject({
      operations: expect.arrayContaining(["not:paid_at:is:null"]),
    })

    expect(data.unitEconomics).toMatchObject({
      aov: 33.3,
      paidOrdersMonth: 3,
      repeatOrderRate: 33.3,
      repeatPaidOrders: 1,
    })
    expect(data.risk).toMatchObject({
      activeDisputes: 1,
      chargebackRate: 66.7,
      chargebacksMonth: 2,
      highPrioritySupportTickets: 2,
      openSupportTickets: 2,
      supportTicketsMonth: 4,
      supportTicketsPer100Orders: 133.3,
    })
    expect(data.serviceRepeatUsage).toContainEqual({
      category: "medical_certificate",
      paidOrders: 1,
      repeatPaidOrders: 1,
      repeatRate: 100,
    })
    expect(data.launchReadiness.checks).toMatchObject({
      chargebackRateLow: false,
      supportLoadHealthy: false,
    })
  })
})

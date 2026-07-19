import { beforeEach, describe, expect, it, vi } from "vitest"

import { REVIEW_REQUEST_BATCH_SIZE } from "@/lib/email/review-request-timing"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import { findReviewRequestCandidates } from "@/lib/email/review-request"

type Row = Record<string, unknown>

class FakeQuery implements PromiseLike<{ data: Row[]; error: null }> {
  private rows: Row[]
  private limitCount: number | null = null
  private relatedRows: Row[]
  private relatedStatuses: unknown[] | null = null
  private relatedType: unknown = null

  constructor(rows: Row[], relatedRows: Row[] = []) {
    this.rows = [...rows]
    this.relatedRows = relatedRows
  }

  select(): this {
    return this
  }

  eq(column: string, value: unknown): this {
    if (column === "active_review_outbox.email_type") {
      this.relatedType = value
      return this
    }
    this.rows = this.rows.filter((row) => row[column] === value)
    return this
  }

  neq(column: string, value: unknown): this {
    this.rows = this.rows.filter((row) => row[column] !== value)
    return this
  }

  in(column: string, values: unknown[]): this {
    if (column === "active_review_outbox.status") {
      this.relatedStatuses = values
      return this
    }
    this.rows = this.rows.filter((row) => values.includes(row[column]))
    return this
  }

  is(column: string, value: unknown): this {
    if (column === "active_review_outbox" && value === null) {
      const ownedIntakeIds = new Set(
        this.relatedRows
          .filter((row) => (
            row.email_type === this.relatedType
            && this.relatedStatuses?.includes(row.status)
          ))
          .map((row) => row.intake_id),
      )
      this.rows = this.rows.filter((row) => !ownedIntakeIds.has(row.id))
      return this
    }
    this.rows = this.rows.filter((row) => row[column] === value)
    return this
  }

  not(column: string, operator: string, value: unknown): this {
    if (operator === "is") {
      this.rows = this.rows.filter((row) => row[column] !== value)
    }
    return this
  }

  gte(column: string, value: string): this {
    this.rows = this.rows.filter((row) => String(row[column]) >= value)
    return this
  }

  lte(column: string, value: string): this {
    this.rows = this.rows.filter((row) => String(row[column]) <= value)
    return this
  }

  order(column: string, opts: { ascending: boolean }): this {
    const direction = opts.ascending ? 1 : -1
    this.rows.sort((a, b) => (
      String(a[column]).localeCompare(String(b[column])) * direction
    ))
    return this
  }

  limit(count: number): this {
    this.limitCount = count
    return this
  }

  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const data = this.limitCount === null
      ? this.rows
      : this.rows.slice(0, this.limitCount)
    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected)
  }
}

function reviewCandidate(id: string, fulfilledAt: string): Row {
  return {
    id,
    patient_id: `patient-${id}`,
    category: "medical_certificate",
    status: "completed",
    payment_status: "paid",
    document_sent_at: fulfilledAt,
    script_sent_at: null,
    review_email_sent_at: null,
    review_email_suppressed_at: null,
    patient: {
      email: `${id}@example.com`,
      first_name: "Patient",
      email_bounced: false,
    },
  }
}

describe("findReviewRequestCandidates", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"))
  })

  it("does not let active outbox-owned rows monopolize the initial batch", async () => {
    const activeRows = Array.from(
      { length: REVIEW_REQUEST_BATCH_SIZE },
      (_, index) => ({
        intake_id: `intake-owned-${index}`,
        email_type: "review_request",
        status: index % 2 === 0 ? "pending" : "sending",
      }),
    )
    const intakes = [
      ...activeRows.map((row, index) => reviewCandidate(
        String(row.intake_id),
        new Date(Date.UTC(2026, 6, 1, 0, index)).toISOString(),
      )),
      reviewCandidate("intake-unowned", "2026-07-02T00:00:00.000Z"),
    ]

    mocks.createServiceRoleClient.mockReturnValue({
      from: () => new FakeQuery(intakes, activeRows),
    })

    const candidates = await findReviewRequestCandidates()

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "intake-unowned",
    ])
  })
})

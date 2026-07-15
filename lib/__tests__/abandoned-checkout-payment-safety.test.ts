import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  findAbandonedCheckouts,
  findAbandonedFollowups,
  sendAbandonedCheckoutEmail,
  sendAbandonedFollowupEmail,
} from "@/lib/email/abandoned-checkout"
import { PAYMENT_REPLACEMENT_LOCK } from "@/lib/stripe/payment-integrity"
import {
  HIGH_STAKES_PAYMENT_LOCK,
  MISSING_SAFETY_INFORMATION_PAYMENT_LOCK,
  PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER,
} from "@/lib/stripe/payment-safety-lock"

const mocks = vi.hoisted(() => ({
  canSendMarketingEmail: vi.fn(),
  createServiceRoleClient: vi.fn(),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  sendEmail: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/email/preferences", () => ({
  canSendMarketingEmail: mocks.canSendMarketingEmail,
}))

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: mocks.sendEmail,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => mocks.logger,
  logger: mocks.logger,
}))

vi.mock("@/lib/email/components/templates/abandoned-checkout", () => ({
  AbandonedCheckoutEmail: () => null,
  abandonedCheckoutSubject: (serviceName: string) => `Resume ${serviceName}`,
}))

vi.mock("@/lib/email/components/templates/abandoned-checkout-followup", () => ({
  AbandonedCheckoutFollowupEmail: () => null,
  abandonedCheckoutFollowupSubject: (serviceName: string) => `Reminder ${serviceName}`,
}))

type IntakeRow = {
  abandoned_email_sent_at: string | null
  abandoned_followup_sent_at: string | null
  category: string | null
  checkout_error: string | null
  created_at: string
  guest_email: string | null
  id: string
  patient: { email: string | null; first_name: string | null } | null
  patient_id: string
  payment_id: string | null
  payment_status: string | null
  status: string
  subtype: string | null
}

type FilterCall =
  | { method: "eq" | "gte" | "lte" | "not"; args: unknown[] }
  | { method: "in"; args: [string, readonly unknown[]] }
  | { method: "is"; args: [string, unknown] }
  | { method: "or"; args: [string] }

type QueryRecord = {
  filters: FilterCall[]
  operation: "select" | "update"
  payload?: Record<string, unknown>
}

function compare(rowValue: unknown, operator: string, value: string): boolean {
  if (operator === "is" && value === "null") return rowValue === null
  if (operator === "neq") return rowValue !== value
  return true
}

function matchesOrFilter(row: IntakeRow, filter: string): boolean {
  if (filter === PAYMENT_SAFETY_LOCK_EXCLUSION_FILTER) {
    return row.checkout_error === null || (
      row.checkout_error !== HIGH_STAKES_PAYMENT_LOCK &&
      row.checkout_error !== MISSING_SAFETY_INFORMATION_PAYMENT_LOCK
    )
  }

  if (filter.includes(PAYMENT_REPLACEMENT_LOCK)) {
    return row.checkout_error === null || (
      row.checkout_error !== HIGH_STAKES_PAYMENT_LOCK &&
      row.checkout_error !== MISSING_SAFETY_INFORMATION_PAYMENT_LOCK &&
      row.checkout_error !== PAYMENT_REPLACEMENT_LOCK
    )
  }

  return filter.split(",").some((part) => {
    const [column, operator, value] = part.split(".")
    return compare(row[column as keyof IntakeRow], operator, value)
  })
}

function matchesFilters(row: IntakeRow, filters: FilterCall[]): boolean {
  return filters.every((filter) => {
    const [column, value, extra] = filter.args
    if (filter.method === "eq") return row[column as keyof IntakeRow] === value
    if (filter.method === "in") return filter.args[1].includes(row[column as keyof IntakeRow])
    if (filter.method === "is") return row[column as keyof IntakeRow] === value
    if (filter.method === "not") {
      if (value === "is" && extra === null) return row[column as keyof IntakeRow] !== null
      return true
    }
    if (filter.method === "gte") return String(row[column as keyof IntakeRow]) >= String(value)
    if (filter.method === "lte") return String(row[column as keyof IntakeRow]) <= String(value)
    if (filter.method === "or") return matchesOrFilter(row, String(column))
    return true
  })
}

function createHarness(initialRows: IntakeRow[]) {
  const rows = initialRows.map((row) => ({ ...row }))
  const queries: QueryRecord[] = []
  let exactReadError: { code: string; message: string } | null = null

  function createBuilder(operation: "select" | "update", payload?: Record<string, unknown>) {
    const filters: FilterCall[] = []
    let wantsSingle = false

    const execute = () => {
      const record: QueryRecord = { operation, filters: [...filters], ...(payload ? { payload } : {}) }
      queries.push(record)
      const matching = rows.filter((row) => matchesFilters(row, filters))
      const isExactRead = operation === "select" && filters.some(
        (filter) => filter.method === "eq" && filter.args[0] === "id",
      )

      if (isExactRead && exactReadError) {
        const error = exactReadError
        exactReadError = null
        return { data: null, error }
      }

      if (operation === "update" && payload) {
        matching.forEach((row) => Object.assign(row, payload))
      }

      return {
        data: wantsSingle ? (matching[0] ?? null) : matching.map((row) => ({ ...row })),
        error: null,
      }
    }

    const builder = {
      eq(column: string, value: unknown) {
        filters.push({ method: "eq", args: [column, value] })
        return builder
      },
      gte(column: string, value: unknown) {
        filters.push({ method: "gte", args: [column, value] })
        return builder
      },
      in(column: string, values: readonly unknown[]) {
        filters.push({ method: "in", args: [column, values] })
        return builder
      },
      is(column: string, value: unknown) {
        filters.push({ method: "is", args: [column, value] })
        return builder
      },
      lte(column: string, value: unknown) {
        filters.push({ method: "lte", args: [column, value] })
        return builder
      },
      maybeSingle() {
        wantsSingle = true
        return Promise.resolve(execute())
      },
      not(column: string, operator: string, value: unknown) {
        filters.push({ method: "not", args: [column, operator, value] })
        return builder
      },
      or(filter: string) {
        filters.push({ method: "or", args: [filter] })
        return builder
      },
      select() {
        return builder
      },
      then<TResult1 = unknown, TResult2 = never>(
        onfulfilled?: ((value: { data: IntakeRow[] | IntakeRow | null; error: null | { code: string; message: string } }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return Promise.resolve(execute()).then(onfulfilled, onrejected)
      },
    }

    return builder
  }

  const supabase = {
    from(table: string) {
      expect(table).toBe("intakes")
      return {
        select() {
          return createBuilder("select")
        },
        update(payload: Record<string, unknown>) {
          return createBuilder("update", payload)
        },
      }
    },
  }

  return {
    failNextExactRead(error = { code: "QUERY_FAILED", message: "synthetic patient detail" }) {
      exactReadError = error
    },
    queries,
    rows,
    supabase,
  }
}

function row(overrides: Partial<IntakeRow> = {}): IntakeRow {
  return {
    abandoned_email_sent_at: null,
    abandoned_followup_sent_at: null,
    category: "prescription",
    checkout_error: null,
    created_at: "2026-07-15T00:00:00.000Z",
    guest_email: null,
    id: "intake-safe",
    patient: { email: "patient@example.test", first_name: "Ada" },
    patient_id: "patient-safe",
    payment_id: "cs_current",
    payment_status: "pending",
    status: "pending_payment",
    subtype: null,
    ...overrides,
  }
}

describe("abandoned checkout payment safety", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-15T01:00:00.000Z"))
    mocks.canSendMarketingEmail.mockResolvedValue(true)
    mocks.sendEmail.mockResolvedValue({ success: true })
  })

  it("finds ordinary null-error and unpaid first nudges while rejecting null payment and recovery locks", async () => {
    const harness = createHarness([
      row({ id: "pending-null-error" }),
      row({ id: "unpaid", payment_status: "unpaid" }),
      row({
        id: "ordinary-failure",
        status: "checkout_failed",
        payment_status: "failed",
        checkout_error: "Payment failed",
      }),
      row({ id: "null-payment", payment_status: null }),
      row({ id: "high-lock", checkout_error: HIGH_STAKES_PAYMENT_LOCK }),
      row({ id: "missing-lock", checkout_error: MISSING_SAFETY_INFORMATION_PAYMENT_LOCK }),
      row({ id: "replacement", checkout_error: PAYMENT_REPLACEMENT_LOCK }),
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const candidates = await findAbandonedCheckouts()

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "pending-null-error",
      "unpaid",
      "ordinary-failure",
    ])
    expect(harness.queries[0]?.filters).toEqual(expect.arrayContaining([
      { method: "in", args: ["status", ["pending_payment", "checkout_failed"]] },
      { method: "in", args: ["payment_status", ["pending", "unpaid", "failed"]] },
    ]))
  })

  it("finds ordinary followups with canonical payment states while excluding every recovery lock", async () => {
    const firstSentAt = "2026-07-14T00:00:00.000Z"
    const harness = createHarness([
      row({ id: "failed-null-error", payment_status: "failed", abandoned_email_sent_at: firstSentAt }),
      row({ id: "unpaid", payment_status: "unpaid", abandoned_email_sent_at: firstSentAt }),
      row({
        id: "ordinary-failure",
        status: "checkout_failed",
        payment_status: "failed",
        checkout_error: "Payment failed",
        abandoned_email_sent_at: firstSentAt,
      }),
      row({ id: "null-payment", payment_status: null, abandoned_email_sent_at: firstSentAt }),
      row({ id: "high-lock", checkout_error: HIGH_STAKES_PAYMENT_LOCK, abandoned_email_sent_at: firstSentAt }),
      row({ id: "missing-lock", checkout_error: MISSING_SAFETY_INFORMATION_PAYMENT_LOCK, abandoned_email_sent_at: firstSentAt }),
      row({ id: "replacement", checkout_error: PAYMENT_REPLACEMENT_LOCK, abandoned_email_sent_at: firstSentAt }),
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)

    const candidates = await findAbandonedFollowups()

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "failed-null-error",
      "unpaid",
      "ordinary-failure",
    ])
    expect(harness.queries[0]?.filters).toEqual(expect.arrayContaining([
      { method: "in", args: ["status", ["pending_payment", "checkout_failed"]] },
      { method: "in", args: ["payment_status", ["pending", "unpaid", "failed"]] },
    ]))
  })

  it("suppresses a first nudge when a safety hold begins after finder selection", async () => {
    const harness = createHarness([row()])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await findAbandonedCheckouts()
    expect(candidate).toBeDefined()

    harness.rows[0]!.checkout_error = MISSING_SAFETY_INFORMATION_PAYMENT_LOCK

    await expect(sendAbandonedCheckoutEmail(candidate!)).resolves.toBe(false)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("suppresses a followup when a safety hold begins after finder selection", async () => {
    const harness = createHarness([
      row({ abandoned_email_sent_at: "2026-07-14T00:00:00.000Z" }),
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await findAbandonedFollowups()
    expect(candidate).toBeDefined()

    harness.rows[0]!.checkout_error = HIGH_STAKES_PAYMENT_LOCK

    await expect(sendAbandonedFollowupEmail(candidate!)).resolves.toBe(false)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("does not stamp the first nudge when a safety hold wins while the email send completes", async () => {
    const harness = createHarness([row()])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await findAbandonedCheckouts()
    expect(candidate).toBeDefined()
    mocks.sendEmail.mockImplementationOnce(async () => {
      harness.rows[0]!.checkout_error = MISSING_SAFETY_INFORMATION_PAYMENT_LOCK
      return { success: true }
    })

    await expect(sendAbandonedCheckoutEmail(candidate!)).resolves.toBe(true)

    expect(mocks.sendEmail).toHaveBeenCalledOnce()
    expect(harness.rows[0]!.abandoned_email_sent_at).toBeNull()
  })

  it.each([
    ["paid", (current: IntakeRow) => { current.payment_status = "paid" }],
    ["replacement", (current: IntakeRow) => { current.checkout_error = PAYMENT_REPLACEMENT_LOCK }],
    ["terminal", (current: IntakeRow) => { current.status = "cancelled" }],
    ["duplicate timestamp", (current: IntakeRow) => { current.abandoned_email_sent_at = "2026-07-15T00:30:00.000Z" }],
  ])("fails closed before a first nudge when the candidate becomes %s", async (_name, mutate) => {
    const harness = createHarness([row()])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await findAbandonedCheckouts()
    expect(candidate).toBeDefined()
    mutate(harness.rows[0]!)

    await expect(sendAbandonedCheckoutEmail(candidate!)).resolves.toBe(false)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    ["paid", (current: IntakeRow) => { current.payment_status = "paid" }],
    ["replacement", (current: IntakeRow) => { current.checkout_error = PAYMENT_REPLACEMENT_LOCK }],
    ["terminal", (current: IntakeRow) => { current.status = "expired" }],
    ["duplicate timestamp", (current: IntakeRow) => { current.abandoned_followup_sent_at = "2026-07-15T00:30:00.000Z" }],
  ])("fails closed before a followup when the candidate becomes %s", async (_name, mutate) => {
    const harness = createHarness([
      row({ abandoned_email_sent_at: "2026-07-14T00:00:00.000Z" }),
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await findAbandonedFollowups()
    expect(candidate).toBeDefined()
    mutate(harness.rows[0]!)

    await expect(sendAbandonedFollowupEmail(candidate!)).resolves.toBe(false)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    ["first", sendAbandonedCheckoutEmail, findAbandonedCheckouts, null],
    ["followup", sendAbandonedFollowupEmail, findAbandonedFollowups, "2026-07-14T00:00:00.000Z"],
  ] as const)("fails closed on a %s eligibility read error without logging recipient data", async (
    _stage,
    send,
    find,
    firstSentAt,
  ) => {
    const harness = createHarness([row({ abandoned_email_sent_at: firstSentAt })])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await find()
    expect(candidate).toBeDefined()
    harness.failNextExactRead({
      code: "QUERY_FAILED",
      message: "Ada patient@example.test raw health and payment failure detail",
    })

    await expect(send(candidate!)).resolves.toBe(false)

    expect(mocks.sendEmail).not.toHaveBeenCalled()
    const emittedLogs = JSON.stringify([
      ...mocks.logger.debug.mock.calls,
      ...mocks.logger.info.mock.calls,
      ...mocks.logger.warn.mock.calls,
      ...mocks.logger.error.mock.calls,
    ])
    expect(emittedLogs).not.toContain("Ada")
    expect(emittedLogs).not.toContain("patient@example.test")
    expect(emittedLogs).not.toContain("raw health and payment failure detail")
  })

  it.each([
    ["first", sendAbandonedCheckoutEmail, findAbandonedCheckouts, null],
    ["followup", sendAbandonedFollowupEmail, findAbandonedFollowups, "2026-07-14T00:00:00.000Z"],
  ] as const)("suppresses a %s nudge when the current Checkout Session is replaced after selection", async (
    _stage,
    send,
    find,
    firstSentAt,
  ) => {
    const harness = createHarness([row({ abandoned_email_sent_at: firstSentAt })])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await find()
    expect(candidate).toBeDefined()

    harness.rows[0]!.payment_id = "cs_replacement"

    await expect(send(candidate!)).resolves.toBe(false)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    ["first", sendAbandonedCheckoutEmail, findAbandonedCheckouts, "abandoned_email_sent_at", null],
    ["followup", sendAbandonedFollowupEmail, findAbandonedFollowups, "abandoned_followup_sent_at", "2026-07-14T00:00:00.000Z"],
  ] as const)("does not stamp or emit a clean Sent log when the Session changes during a %s send", async (
    _stage,
    send,
    find,
    timestampColumn,
    firstSentAt,
  ) => {
    const harness = createHarness([row({ abandoned_email_sent_at: firstSentAt })])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await find()
    expect(candidate).toBeDefined()
    mocks.sendEmail.mockImplementationOnce(async () => {
      harness.rows[0]!.payment_id = "cs_replacement"
      return { success: true }
    })

    await expect(send(candidate!)).resolves.toBe(true)

    expect(harness.rows[0]![timestampColumn]).toBeNull()
    expect(mocks.logger.warn).toHaveBeenCalledWith(
      "Abandoned checkout email timestamp not marked because state changed",
      expect.objectContaining({ stage: _stage }),
    )
    expect(mocks.logger.info.mock.calls.some(([message]) => String(message).startsWith("Sent abandoned"))).toBe(false)
  })

  it.each([
    ["first", sendAbandonedCheckoutEmail, findAbandonedCheckouts, null],
    ["followup", sendAbandonedFollowupEmail, findAbandonedFollowups, "2026-07-14T00:00:00.000Z"],
  ] as const)("keeps a legitimate %s candidate without a Checkout Session eligible using null-safe ownership", async (
    _stage,
    send,
    find,
    firstSentAt,
  ) => {
    const harness = createHarness([
      row({ payment_id: null, abandoned_email_sent_at: firstSentAt }),
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await find()
    expect(candidate).toBeDefined()

    await expect(send(candidate!)).resolves.toBe(true)

    expect(mocks.sendEmail).toHaveBeenCalledOnce()
    const exactRead = harness.queries.find((query) => (
      query.operation === "select" && query.filters.some(
        (filter) => filter.method === "eq" && filter.args[0] === "id",
      )
    ))
    const mark = harness.queries.find((query) => query.operation === "update")
    for (const query of [exactRead, mark]) {
      expect(query?.filters).toContainEqual({ method: "is", args: ["payment_id", null] })
      expect(query?.filters).not.toContainEqual({ method: "eq", args: ["payment_id", null] })
    }
  })

  it("uses freshly read recipient, service, guest state, and guards the first timestamp", async () => {
    const harness = createHarness([row()])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await findAbandonedCheckouts()
    expect(candidate).toBeDefined()
    Object.assign(harness.rows[0]!, {
      category: "medical_certificate",
      guest_email: "fresh-guest@example.test",
      patient: null,
    })

    await expect(sendAbandonedCheckoutEmail(candidate!)).resolves.toBe(true)

    const email = mocks.sendEmail.mock.calls[0]![0]
    expect(email.to).toBe("fresh-guest@example.test")
    expect(email.subject).toBe("Resume Medical Certificate")
    expect(new URL(email.template.props.resumeUrl).pathname).toMatch(/^\/resume\//)
    expect(harness.rows[0]!.abandoned_email_sent_at).toBe("2026-07-15T01:00:00.000Z")
    const markQuery = harness.queries.find((query) => query.operation === "update")
    expect(markQuery?.filters).toEqual(expect.arrayContaining([
      { method: "in", args: ["status", ["pending_payment", "checkout_failed"]] },
      { method: "in", args: ["payment_status", ["pending", "unpaid", "failed"]] },
      { method: "is", args: ["abandoned_email_sent_at", null] },
    ]))
  })

  it("uses freshly read recipient and service state and guards the followup timestamp", async () => {
    const harness = createHarness([
      row({ abandoned_email_sent_at: "2026-07-14T00:00:00.000Z" }),
    ])
    mocks.createServiceRoleClient.mockReturnValue(harness.supabase)
    const [candidate] = await findAbandonedFollowups()
    expect(candidate).toBeDefined()
    Object.assign(harness.rows[0]!, {
      category: "medical_certificate",
      patient: { email: "fresh-patient@example.test", first_name: "Fresh" },
    })

    await expect(sendAbandonedFollowupEmail(candidate!)).resolves.toBe(true)

    const email = mocks.sendEmail.mock.calls[0]![0]
    expect(email.to).toBe("fresh-patient@example.test")
    expect(email.subject).toBe("Reminder Medical Certificate")
    expect(email.template.props.patientName).toBe("Fresh")
    expect(harness.rows[0]!.abandoned_followup_sent_at).toBe("2026-07-15T01:00:00.000Z")
    const markQuery = harness.queries.find((query) => query.operation === "update")
    expect(markQuery?.filters).toEqual(expect.arrayContaining([
      { method: "not", args: ["abandoned_email_sent_at", "is", null] },
      { method: "is", args: ["abandoned_followup_sent_at", null] },
    ]))
  })
})

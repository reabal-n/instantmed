import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { WaitCounter } from "@/components/marketing/wait-counter"
import { getWaitState } from "@/lib/brand/wait-counter"
import type { WaitState } from "@/lib/brand/wait-counter-types"

/**
 * The live wait device (docs/BRAND.md §6.1) may only assert activity it can
 * see. `getWaitState` returns `variant: "reviewing"` on a failed lookup, a
 * thrown client error, and an empty 24-hour window with nothing queued. None
 * of those is evidence that a doctor is looking at anything, so the rendered
 * copy must be the calm 24/7 availability fact (approved claim
 * `availability_24_7`), never a live-activity claim or a fabricated number.
 *
 * Reached from the hero pill on the home, medical-certificate, and business
 * pages, so this is public regulated-health advertising copy.
 */

const NOW = new Date("2026-09-20T01:00:00Z")

/** A rendered unverified state must never read as live doctor activity. */
const ACTIVITY_CLAIM = /right now|is reviewing|are reviewing|reviewing now|reviewing requests/i
/** Nor as a number the data does not support. */
const FABRICATED_NUMBER = /~\d+ min|ahead in the queue/i

const NEUTRAL_FACT = "Requests open 24/7"

type QueryResult = { data: unknown[] | null; error: { message: string } | null }

/** Minimal thenable stand-in for a PostgREST builder: every filter returns itself. */
function queryReturning(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  for (const method of ["select", "eq", "in", "not", "gte", "order", "limit", "or"]) {
    builder[method] = vi.fn(() => builder)
  }
  builder.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected)
  return builder
}

/** `getWaitState` issues the completed-rows query first, then the queue query. */
function clientReturning(completed: QueryResult, queue: QueryResult) {
  return {
    from: vi
      .fn()
      .mockReturnValueOnce(queryReturning(completed))
      .mockReturnValueOnce(queryReturning(queue)),
  }
}

const EMPTY: QueryResult = { data: [], error: null }
const FAILED: QueryResult = { data: null, error: { message: "relation unavailable" } }

function render(state: WaitState) {
  return renderToStaticMarkup(<WaitCounter state={state} variant="inline" />)
}

describe("wait counter never claims live doctor activity from unverified state", () => {
  beforeEach(() => {
    mocks.createServiceRoleClient.mockReset()
  })

  it("renders the neutral availability fact for the reviewing variant on every service", () => {
    for (const service of ["med-cert", "rx", "consult"] as const) {
      const html = render({ variant: "reviewing", service })
      expect(html).toContain(NEUTRAL_FACT)
      expect(html).not.toMatch(ACTIVITY_CLAIM)
      expect(html).not.toMatch(FABRICATED_NUMBER)
    }
  })

  it("degrades a failed metrics lookup to the neutral fact", async () => {
    for (const [completed, queue] of [
      [FAILED, EMPTY],
      [EMPTY, FAILED],
    ] as const) {
      mocks.createServiceRoleClient.mockReturnValue(clientReturning(completed, queue))
      const state = await getWaitState(NOW, "med-cert")
      expect(state.variant).toBe("reviewing")
      const html = render(state)
      expect(html).toContain(NEUTRAL_FACT)
      expect(html).not.toMatch(ACTIVITY_CLAIM)
    }
  })

  it("degrades a thrown client failure to the neutral fact", async () => {
    mocks.createServiceRoleClient.mockImplementation(() => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY missing")
    })
    const state = await getWaitState(NOW, "med-cert")
    expect(state.variant).toBe("reviewing")
    const html = render(state)
    expect(html).toContain(NEUTRAL_FACT)
    expect(html).not.toMatch(ACTIVITY_CLAIM)
  })

  it("degrades an empty 24-hour window with nothing queued to the neutral fact, not a fabricated count", async () => {
    mocks.createServiceRoleClient.mockReturnValue(clientReturning(EMPTY, EMPTY))
    const state = await getWaitState(NOW, "med-cert")
    expect(state.variant).toBe("reviewing")
    const html = render(state)
    expect(html).toContain(NEUTRAL_FACT)
    expect(html).not.toMatch(ACTIVITY_CLAIM)
    expect(html).not.toMatch(FABRICATED_NUMBER)
  })

  it("uses one canonical reporting filter and retains unlinked patient requests", async () => {
    const client = clientReturning(EMPTY, EMPTY)
    mocks.createServiceRoleClient.mockReturnValue(client)
    await getWaitState(NOW, "med-cert")
    for (const { value: query } of client.from.mock.results) {
      expect(query.or.mock.calls).toHaveLength(2)
      expect(query.or.mock.calls[0]).toEqual(["exclude_from_reporting.is.null,exclude_from_reporting.eq.false"])
      expect(query.or.mock.calls[1][0]).toMatch(/^patient_id\.is\.null,patient_id\.not\.in\.\(e2e/)
      expect(query.not.mock.calls.some(([column]: string[]) => column === "patient_id")).toBe(false)
    }
  })

  it("keeps the data-backed branches' copy unchanged", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      clientReturning(
        { data: [{ paid_at: "2026-09-20T00:00:00Z", approved_at: "2026-09-20T00:11:00Z" }], error: null },
        EMPTY,
      ),
    )
    const live = await getWaitState(NOW, "med-cert")
    expect(live.variant).toBe("live")
    expect(render({ ...live, sampleSize: 5 })).toContain("Medical certificates: median turnaround")
    expect(render({ ...live, sampleSize: 5 })).toContain("~11 min")

    mocks.createServiceRoleClient.mockReturnValue(
      clientReturning(EMPTY, {
        data: [
          { paid_at: "2026-09-20T00:50:00Z", submitted_at: null, created_at: null },
          { paid_at: "2026-09-20T00:55:00Z", submitted_at: null, created_at: null },
        ],
        error: null,
      }),
    )
    const queued = await getWaitState(NOW, "med-cert")
    expect(queued.variant).toBe("queued")
    expect(render(queued)).toBe("")

    expect(render({ variant: "hidden" })).toBe("")
  })
})

const healthy: WaitState = { variant: "live", service: "med-cert", medianMinutes: 24, sampleSize: 5, newestSampleAgeMinutes: 10, queueP95Minutes: 20 }
describe("public timing evidence", () => {
  it("suppresses stale, undersampled and pressured numeric timing", () => {
    for (const state of [
      { ...healthy, newestSampleAgeMinutes: 121 },
      { ...healthy, sampleSize: 4 },
      { ...healthy, queueP95Minutes: 61 },
      { ...healthy, medianMinutes: Number.NaN },
      { ...healthy, service: "rx" as const },
    ]) expect(render(state)).toBe("")
  })
  it("renders the supported sentence as one text block with its timeframe", () => {
    const html = render(healthy)
    expect(html).toContain("Medical certificates: median turnaround")
    expect(html).toContain("~24 min")
    expect(html).toContain("over the last 24 hours")
    expect(html).not.toContain("animate-wait-pulse")
  })
})

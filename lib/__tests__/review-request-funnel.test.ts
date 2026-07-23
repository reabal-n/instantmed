import { describe, expect, it, vi } from "vitest"

import {
  getReviewRequestFunnelSnapshot,
  PRODUCT_REVIEW_TOTAL_METRIC_NAME,
} from "@/lib/admin/review-request-funnel"
import { SEEDED_E2E_PATIENT_PROFILE_IDS } from "@/lib/data/seeded-e2e-data"

const NOW = new Date("2026-07-24T00:00:00.000Z")
const WINDOW_START = "2026-06-24T00:00:00.000Z"

interface StubOptions {
  funnelData?: Record<string, unknown> | null
  funnelError?: { message: string } | null
  baselineMetricData?: Array<Record<string, unknown>> | null
  latestMetricData?: Array<Record<string, unknown>> | null
  metricError?: { message: string } | null
  baselineMetricError?: { message: string } | null
  latestMetricError?: { message: string } | null
}

function createClient(options: StubOptions = {}) {
  const rpcSingle = vi.fn(async () => ({
    data: options.funnelData ?? {
      eligible: 12,
      sent: 8,
      delivered: 7,
      trackable_sent: 6,
      unique_redirect_traversals: 3,
    },
    error: options.funnelError ?? null,
  }))
  const rpc = vi.fn(() => ({ single: rpcSingle }))

  const limit = vi.fn(async (ascending: boolean, _count: number) => ({
    data: ascending
      ? options.baselineMetricData ?? []
      : options.latestMetricData ?? [],
    error: ascending
      ? options.baselineMetricError ?? options.metricError ?? null
      : options.latestMetricError ?? options.metricError ?? null,
  }))
  const order = vi.fn((_column: string, config: { ascending: boolean }) => ({
    limit: (count: number) => limit(config.ascending, count),
  }))
  const eq = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  return {
    client: { rpc, from } as never,
    rpc,
    from,
    select,
    eq,
    order,
    limit,
  }
}

describe("getReviewRequestFunnelSnapshot", () => {
  it("loads a fixed 30-day aggregate, excludes every seeded patient, and rates only trackable sends", async () => {
    const { client, rpc, eq, order, limit } = createClient({
      baselineMetricData: [
        { metric_value: "2", recorded_at: "2026-07-10T00:00:00.000Z" },
      ],
      latestMetricData: [
        { metric_value: "5", recorded_at: "2026-07-23T00:00:00.000Z" },
      ],
    })

    const snapshot = await getReviewRequestFunnelSnapshot(client, NOW)

    expect(rpc).toHaveBeenCalledWith("get_review_request_funnel", {
      p_window_start: WINDOW_START,
      p_as_of: NOW.toISOString(),
      p_excluded_patient_ids: [...SEEDED_E2E_PATIENT_PROFILE_IDS],
    })
    expect(eq).toHaveBeenCalledWith("metric_name", PRODUCT_REVIEW_TOTAL_METRIC_NAME)
    expect(order).toHaveBeenCalledWith("recorded_at", { ascending: true })
    expect(order).toHaveBeenCalledWith("recorded_at", { ascending: false })
    expect(limit).toHaveBeenCalledWith(true, 1)
    expect(limit).toHaveBeenCalledWith(false, 1)
    expect(snapshot.funnel).toMatchObject({
      status: "live",
      eligible: 12,
      sent: 8,
      delivered: 7,
      trackableSent: 6,
      uniqueRedirectTraversals: 3,
      traversalRate: 50,
    })
    expect(snapshot.external).toMatchObject({
      status: "live",
      total: 5,
      delta: 3,
      baselineTotal: 2,
    })
  })

  it("keeps no-sends and pre-trackable baseline states distinct", async () => {
    const noSends = createClient({
      funnelData: {
        eligible: 4,
        sent: 0,
        delivered: 0,
        trackable_sent: 0,
        unique_redirect_traversals: 0,
      },
    })
    const baseline = createClient({
      funnelData: {
        eligible: 9,
        sent: 5,
        delivered: 4,
        trackable_sent: 0,
        unique_redirect_traversals: 0,
      },
    })

    await expect(getReviewRequestFunnelSnapshot(noSends.client, NOW)).resolves.toMatchObject({
      funnel: { status: "no_sends", traversalRate: null },
    })
    await expect(getReviewRequestFunnelSnapshot(baseline.client, NOW)).resolves.toMatchObject({
      funnel: { status: "baseline", traversalRate: null },
    })
  })

  it("degrades only the failed axis and never fabricates zero counts", async () => {
    const funnelFailure = createClient({
      funnelError: { message: "rpc unavailable" },
      baselineMetricData: [{ metric_value: "2", recorded_at: "2026-07-23T00:00:00.000Z" }],
      latestMetricData: [{ metric_value: "2", recorded_at: "2026-07-23T00:00:00.000Z" }],
    })
    const externalFailure = createClient({
      metricError: { message: "metrics unavailable" },
    })

    const first = await getReviewRequestFunnelSnapshot(funnelFailure.client, NOW)
    expect(first.funnel).toEqual({
      status: "degraded",
      eligible: null,
      sent: null,
      delivered: null,
      trackableSent: null,
      uniqueRedirectTraversals: null,
      traversalRate: null,
    })
    expect(first.external).toMatchObject({ status: "baseline", total: 2, delta: null })

    const second = await getReviewRequestFunnelSnapshot(externalFailure.client, NOW)
    expect(second.funnel.status).toBe("live")
    expect(second.external).toEqual({
      status: "degraded",
      total: null,
      delta: null,
      baselineTotal: null,
      latestRecordedAt: null,
    })
  })

  it("keeps the external axis available when constructing the funnel query throws", async () => {
    const thrown = createClient({
      baselineMetricData: [{ metric_value: "2", recorded_at: "2026-07-23T00:00:00.000Z" }],
      latestMetricData: [{ metric_value: "2", recorded_at: "2026-07-23T00:00:00.000Z" }],
    })
    thrown.rpc.mockImplementationOnce(() => {
      throw new Error("rpc construction failed")
    })

    await expect(getReviewRequestFunnelSnapshot(thrown.client, NOW)).resolves.toMatchObject({
      funnel: { status: "degraded", eligible: null },
      external: { status: "baseline", total: 2 },
    })
  })

  it("degrades external evidence if either bounded baseline/latest read fails", async () => {
    const failedBaseline = createClient({
      baselineMetricError: { message: "oldest read unavailable" },
      latestMetricData: [{ metric_value: "5", recorded_at: "2026-07-23T00:00:00.000Z" }],
    })

    await expect(getReviewRequestFunnelSnapshot(failedBaseline.client, NOW)).resolves.toMatchObject({
      funnel: { status: "live" },
      external: { status: "degraded", total: null, delta: null },
    })
  })

  it("rejects an impossible funnel where sent exceeds eligible", async () => {
    const impossible = createClient({
      funnelData: {
        eligible: 4,
        sent: 5,
        delivered: 4,
        trackable_sent: 5,
        unique_redirect_traversals: 1,
      },
    })

    await expect(getReviewRequestFunnelSnapshot(impossible.client, NOW)).resolves.toMatchObject({
      funnel: { status: "degraded", eligible: null, sent: null },
    })
  })

  it("distinguishes a missing baseline, one snapshot, and stale two-snapshot evidence", async () => {
    const due = createClient()
    const baseline = createClient({
      baselineMetricData: [{ metric_value: 2, recorded_at: "2026-07-23T00:00:00.000Z" }],
      latestMetricData: [{ metric_value: 2, recorded_at: "2026-07-23T00:00:00.000Z" }],
    })
    const staleBaseline = createClient({
      baselineMetricData: [{ metric_value: 2, recorded_at: "2026-07-01T00:00:00.000Z" }],
      latestMetricData: [{ metric_value: 2, recorded_at: "2026-07-01T00:00:00.000Z" }],
    })
    const stale = createClient({
      baselineMetricData: [
        { metric_value: 2, recorded_at: "2026-05-01T00:00:00.000Z" },
      ],
      latestMetricData: [
        { metric_value: 4, recorded_at: "2026-06-01T00:00:00.000Z" },
      ],
    })

    await expect(getReviewRequestFunnelSnapshot(due.client, NOW)).resolves.toMatchObject({
      external: { status: "due", total: null, delta: null },
    })
    await expect(getReviewRequestFunnelSnapshot(baseline.client, NOW)).resolves.toMatchObject({
      external: { status: "baseline", total: 2, delta: null },
    })
    await expect(getReviewRequestFunnelSnapshot(staleBaseline.client, NOW)).resolves.toMatchObject({
      external: {
        status: "stale",
        total: 2,
        delta: null,
        baselineTotal: 2,
        latestRecordedAt: "2026-07-01T00:00:00.000Z",
      },
    })
    await expect(getReviewRequestFunnelSnapshot(stale.client, NOW)).resolves.toMatchObject({
      external: { status: "stale", total: 4, delta: 2, baselineTotal: 2 },
    })
  })
})

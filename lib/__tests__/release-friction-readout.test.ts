import { readFileSync } from "node:fs"
import { mkdtemp, readFile, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { buildUnavailableGuestAccountLinkageSnapshot } from "@/lib/admin/guest-account-linkage"
import {
  assertAggregateReceiptSafe,
  buildReleaseCashSnapshot,
  buildReleaseDashboardWindows,
  buildReleaseFrictionReceipt,
  buildReleaseMeasurementWindows,
  getReleaseFrictionDashboardSnapshot,
  parseReleaseFrictionArgs,
  RELEASE_FRICTION_USAGE,
  writeAggregateReceiptAtomic,
} from "@/lib/admin/release-friction-readout"
import { buildUnavailablePostHogReleaseConversionSnapshot } from "@/lib/analytics/posthog-release-conversion"
import type { CustomerGrowthRevenueEvidence } from "@/lib/data/customer-growth-revenue-read"

const SHA = "99e25c8f9329bd66da009d68127199405b37cd07"
const RELEASE_AT = "2026-09-05T01:02:03.456Z"
const DAY_MS = 24 * 60 * 60 * 1000

function evidence(): CustomerGrowthRevenueEvidence {
  return {
    disputeRows: [
      {
        funds_reinstated_at: null,
        funds_reinstated_cents: null,
        funds_withdrawn_at: "2026-09-03T00:00:00.000Z",
        funds_withdrawn_cents: 4_000,
        intake_id: "paid-a",
        order_amount_cents: 10_000,
      },
      {
        funds_reinstated_at: "2026-09-04T00:00:00.000Z",
        funds_reinstated_cents: 10_000,
        funds_withdrawn_at: "2026-09-03T00:00:00.000Z",
        funds_withdrawn_cents: 10_000,
        intake_id: "paid-c",
        order_amount_cents: 10_000,
      },
    ],
    paidRows: [
      {
        amount_cents: 10_000,
        category: "prescription",
        declined_at: "2026-09-06T00:00:00.000Z",
        id: "paid-a",
        paid_at: "2026-09-01T00:00:00.000Z",
        payment_status: "partially_refunded",
        status: "declined",
        subtype: null,
      },
      {
        amount_cents: 10_000,
        category: "prescription",
        declined_at: null,
        id: "paid-b",
        paid_at: "2026-09-01T12:00:00.000Z",
        payment_status: "refunded",
        status: "approved",
        subtype: null,
      },
      {
        amount_cents: 10_000,
        category: "prescription",
        declined_at: null,
        id: "paid-c",
        paid_at: "2026-09-02T00:00:00.000Z",
        payment_status: "disputed",
        status: "approved",
        subtype: null,
      },
      {
        amount_cents: 10_000,
        category: "prescription",
        declined_at: null,
        id: "excluded-at-end",
        paid_at: "2026-09-08T00:00:00.000Z",
        payment_status: "paid",
        status: "pending",
        subtype: null,
      },
    ],
    refundRows: [
      {
        amount_cents: 10_000,
        id: "paid-a",
        refund_amount_cents: 3_000,
        refund_status: "succeeded",
        refunded_at: "2026-09-02T00:00:00.000Z",
        stripe_refund_id: "refund-1",
      },
      {
        amount_cents: 10_000,
        id: "paid-a",
        refund_amount_cents: 2_000,
        refund_status: "succeeded",
        refunded_at: "2026-09-03T00:00:00.000Z",
        stripe_refund_id: "refund-2",
      },
      // Duplicate webhook/ledger material must not double-count the refund.
      {
        amount_cents: 10_000,
        id: "paid-a",
        refund_amount_cents: 2_000,
        refund_status: "succeeded",
        refunded_at: "2026-09-03T00:00:00.000Z",
        stripe_refund_id: "refund-2",
      },
      {
        amount_cents: 10_000,
        id: "paid-b",
        refund_amount_cents: 10_000,
        refund_reversed_at: "2026-09-05T00:00:00.000Z",
        refund_status: "succeeded",
        refunded_at: "2026-09-04T00:00:00.000Z",
        stripe_refund_id: "refund-3",
      },
    ],
  }
}

describe("release friction readout", () => {
  it("uses equal half-open cohorts with matched follow-up exposure", () => {
    const windows = buildReleaseMeasurementWindows({
      asOf: new Date("2026-09-20T00:00:00.000Z"),
      releaseAt: new Date(RELEASE_AT),
      window: "7d",
    })
    expect(Date.parse(windows.baseline.to) - Date.parse(windows.baseline.from)).toBe(7 * DAY_MS)
    expect(windows.baseline.to).toBe(RELEASE_AT)
    expect(windows.release.from).toBe(RELEASE_AT)
    expect(Date.parse(windows.release.to) - Date.parse(windows.release.from)).toBe(7 * DAY_MS)
    expect(windows.baseline.asOf).toBe("2026-09-13T00:00:00.000Z")
    expect(windows.release.asOf).toBe("2026-09-20T00:00:00.000Z")
    expect(Date.parse(windows.baseline.asOf) - Date.parse(windows.baseline.to)).toBe(
      Date.parse(windows.release.asOf) - Date.parse(windows.release.to),
    )
  })

  it("pairs D+7 and D+14 with equal-length, unambiguous baselines", () => {
    const rows = buildReleaseDashboardWindows({
      asOf: new Date("2026-09-20T00:00:00.000Z"),
      releaseAt: new Date(RELEASE_AT),
    })
    expect(rows.map(({ label }) => label)).toEqual([
      "Baseline · 7d",
      "D+7",
      "Baseline · 14d",
      "D+14",
    ])
    for (let index = 0; index < rows.length; index += 2) {
      const baseline = rows[index]
      const release = rows[index + 1]
      expect(Date.parse(baseline.to) - Date.parse(baseline.from)).toBe(
        Date.parse(release.to) - Date.parse(release.from),
      )
      expect(Date.parse(baseline.asOf) - Date.parse(baseline.to)).toBe(
        Date.parse(release.asOf) - Date.parse(release.to),
      )
    }
  })

  it("rejects a release boundary that is still in the future", () => {
    expect(() => buildReleaseMeasurementWindows({
      asOf: new Date("2026-09-05T00:00:00.000Z"),
      releaseAt: new Date("2026-09-05T00:00:00.001Z"),
      window: "7d",
    })).toThrow("Release boundary cannot be in the future")
  })

  it("uses canonical cash evidence and counts distinct outstanding refund/dispute orders", () => {
    const cash = buildReleaseCashSnapshot(evidence(), {
      asOf: new Date("2026-09-08T00:00:00.000Z"),
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-08T00:00:00.000Z"),
    })
    expect(cash).toMatchObject({
      availability: "available",
      disputedCents: 4_000,
      disputedOrders: 1,
      grossCents: 30_000,
      netCents: 21_000,
      paidOrders: 3,
      refundedCents: 5_000,
      refundedOrders: 1,
      refundsPer100Paid: 33.3,
      observationFollowUpHours: 0,
      prescription: {
        declinedOrders: 1,
        declinesPer100Paid: 33.3,
        paidOrders: 3,
        refundedCents: 5_000,
        refundedOrders: 1,
        refundsPer100Paid: 33.3,
      },
    })
    expect(JSON.stringify(cash)).not.toMatch(/paid-a|paid-b|refund-/)
  })

  it("counts multiple outstanding disputes for one intake as one disputed order", () => {
    const input = evidence()
    input.disputeRows = [
      {
        funds_reinstated_at: null,
        funds_reinstated_cents: null,
        funds_withdrawn_at: "2026-09-03T00:00:00.000Z",
        funds_withdrawn_cents: 1_000,
        intake_id: "paid-a",
        order_amount_cents: 10_000,
      },
      {
        funds_reinstated_at: null,
        funds_reinstated_cents: null,
        funds_withdrawn_at: "2026-09-04T00:00:00.000Z",
        funds_withdrawn_cents: 2_000,
        intake_id: "paid-a",
        order_amount_cents: 10_000,
      },
    ]
    input.refundRows = []

    const cash = buildReleaseCashSnapshot(input, {
      asOf: new Date("2026-09-08T00:00:00.000Z"),
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-08T00:00:00.000Z"),
    })

    expect(cash.disputedCents).toBe(3_000)
    expect(cash.disputedOrders).toBe(1)
  })

  it("never presents an incomplete cash cohort as a completed zero", () => {
    const notStarted = buildReleaseCashSnapshot(evidence(), {
      asOf: new Date("2026-08-31T23:59:59.999Z"),
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-08T00:00:00.000Z"),
    })
    expect(notStarted).toMatchObject({
      availability: "degraded",
      cohortStatus: "in_progress",
      paidOrders: null,
      reason: "cohort_in_progress",
    })

    const inProgress = buildReleaseCashSnapshot(evidence(), {
      asOf: new Date("2026-09-07T23:59:59.999Z"),
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-08T00:00:00.000Z"),
    })
    expect(inProgress).toMatchObject({
      availability: "degraded",
      cohortStatus: "in_progress",
      paidOrders: null,
      reason: "cohort_in_progress",
      refundedOrders: null,
    })

    const complete = buildReleaseCashSnapshot(evidence(), {
      asOf: new Date("2026-09-08T00:00:00.000Z"),
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-08T00:00:00.000Z"),
    })
    expect(complete.cohortStatus).toBe("complete")
    expect(complete.paidOrders).toBe(3)
  })

  it("counts a prescription decline only once its durable decline timestamp reaches the matched cutoff", () => {
    const input = evidence()
    input.paidRows[0].declined_at = "2026-09-08T00:00:00.001Z"

    const cash = buildReleaseCashSnapshot(input, {
      asOf: new Date("2026-09-08T00:00:00.000Z"),
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-08T00:00:00.000Z"),
    })

    expect(cash.prescription).toMatchObject({
      declinedOrders: 0,
      declinesPer100Paid: 0,
      paidOrders: 3,
    })
  })

  it("strictly validates release CLI arguments and rejects ambiguous numeric input", () => {
    const now = new Date("2026-09-20T00:00:00.000Z")
    expect(parseReleaseFrictionArgs([
      `--release-sha=${SHA.toUpperCase()}`,
      `--release-at=${RELEASE_AT}`,
      "--window=14d",
      "--support-contacts=0",
      "--output=artifacts/release.json",
    ], { now })).toMatchObject({
      output: "artifacts/release.json",
      releaseAt: RELEASE_AT,
      releaseSha: SHA,
      supportContacts: 0,
      window: "14d",
    })

    const invalidCases = [
      [],
      [`--release-sha=${SHA}`, `--release-at=${RELEASE_AT}`, "--window=30d"],
      ["--release-sha=abc", `--release-at=${RELEASE_AT}`, "--window=7d"],
      [`--release-sha=${SHA}`, "--release-at=2026-09-05", "--window=7d"],
      [`--release-sha=${SHA}`, `--release-at=${RELEASE_AT}`, "--window=7d", "--support-contacts="],
      [`--release-sha=${SHA}`, `--release-at=${RELEASE_AT}`, "--window=7d", "--support-contacts=-1"],
      [`--release-sha=${SHA}`, `--release-at=${RELEASE_AT}`, "--window=7d", "--support-contacts=1.5"],
      [`--release-sha=${SHA}`, `--release-at=${RELEASE_AT}`, "--window=7d", "--support-contacts=1e2"],
      [`--release-sha=${SHA}`, `--release-at=${RELEASE_AT}`, "--window=7d", `--support-contacts=${Number.MAX_SAFE_INTEGER + 1}`],
      [`--release-sha=${SHA}`, `--release-sha=${SHA}`, `--release-at=${RELEASE_AT}`, "--window=7d"],
      [`--release-sha=${SHA}`, `--release-at=${RELEASE_AT}`, "--window=7d", "--output="],
      [`--release-sha=${SHA}`, "--release-at=2026-09-20T00:00:00.001Z", "--window=7d"],
    ]
    for (const args of invalidCases) {
      expect(() => parseReleaseFrictionArgs(args, { now }), args.join(" ")).toThrow()
    }
  })

  it("shows the immutable ready-time argument in the executable CLI usage", () => {
    expect(RELEASE_FRICTION_USAGE).toBe(
      "Usage: pnpm analytics:release-friction --release-sha=<40-hex-sha> --release-at=<canonical-utc-ready-time> --window=<7d|14d> [--support-contacts=<count>] [--output=<path>]",
    )
  })

  it("keeps a future configured release unavailable without starting source reads", async () => {
    const snapshot = await getReleaseFrictionDashboardSnapshot({} as never, {
      env: {
        INSTANTMED_RELEASE_MEASUREMENT_AT: "2026-09-20T00:00:00.001Z",
        INSTANTMED_RELEASE_MEASUREMENT_SHA: SHA,
      },
      now: new Date("2026-09-20T00:00:00.000Z"),
    })
    expect(snapshot).toMatchObject({
      availability: "unavailable",
      periods: [],
      reason: "release_boundary_in_future",
    })
  })

  it("keeps optional support evidence unavailable and recursively rejects sensitive receipts", () => {
    const unavailable = {
      asOf: "2026-09-20T00:00:00.000Z",
      availability: "unavailable" as const,
      cohortStatus: "unavailable" as const,
      disputedCents: null,
      disputedOrders: null,
      from: "2026-09-01T00:00:00.000Z",
      grossCents: null,
      netCents: null,
      observationFollowUpHours: null,
      paidOrders: null,
      prescription: {
        declinedOrders: null,
        declinesPer100Paid: null,
        paidOrders: null,
        refundedCents: null,
        refundedOrders: null,
        refundsPer100Paid: null,
      },
      reason: "query_failed",
      refundedCents: null,
      refundedOrders: null,
      refundsPer100Paid: null,
      to: "2026-09-08T00:00:00.000Z",
    }
    const window = {
      asOf: new Date(unavailable.asOf),
      from: new Date(unavailable.from),
      to: new Date(unavailable.to),
    }
    const guestLinkage = buildUnavailableGuestAccountLinkageSnapshot({
      ...window,
      reason: "query_failed",
    })
    const posthog = buildUnavailablePostHogReleaseConversionSnapshot(
      window,
      "query_failed",
    )
    const receipt = buildReleaseFrictionReceipt({
      baseline: { availability: "unavailable", cash: unavailable, guestLinkage, posthog, reason: "no_usable_evidence" },
      generatedAt: new Date("2026-09-20T00:00:00.000Z"),
      release: { availability: "unavailable", cash: unavailable, guestLinkage, posthog, reason: "no_usable_evidence" },
      releaseAt: RELEASE_AT,
      releaseSha: SHA,
      window: "7d",
    })
    expect(receipt).toMatchObject({
      reason: "no_usable_evidence",
      support: {
        asOf: "2026-09-20T00:00:00.000Z",
        availability: "unavailable",
        contacts: null,
        contactsPer100PaidOrders: null,
        reason: "not_provided",
      },
    })
    expect(() => assertAggregateReceiptSafe(receipt)).not.toThrow()
    expect(() => assertAggregateReceiptSafe({ nested: { email: "patient@example.com" } })).toThrow()
    expect(() => assertAggregateReceiptSafe({ nested: { guest_email: "redacted" } })).toThrow()
    expect(() => assertAggregateReceiptSafe({ nested: { authUserId: "redacted" } })).toThrow()
    expect(() => assertAggregateReceiptSafe({ nested: { medicationName: "redacted" } })).toThrow()
    expect(() => assertAggregateReceiptSafe({ nested: { rawUpstreamBody: "redacted" } })).toThrow()
    expect(() => assertAggregateReceiptSafe({ note: "patient@example.com" })).toThrow()
    expect(() => assertAggregateReceiptSafe({ rows: [{ flow_instance_id: A_UUID }] })).toThrow()
    expect(() => assertAggregateReceiptSafe({ note: A_UUID })).toThrow()
  })

  it("writes an aggregate JSON receipt atomically", async () => {
    const directory = await mkdtemp(join(tmpdir(), "instantmed-release-readout-"))
    const output = join(directory, "nested", "receipt.json")
    const value = { availability: "available", paidOrders: 3, releaseSha: SHA }
    await writeAggregateReceiptAtomic(output, value)
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(value)
    expect((await stat(output)).mode & 0o777).toBe(0o600)
  })

  it("provides a package invocation that loads local env without exposing it", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>
    }
    expect(packageJson.scripts?.["analytics:release-friction"]).toBe(
      "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/release-friction-readout.ts",
    )
    const script = readFileSync(
      join(process.cwd(), "scripts/release-friction-readout.ts"),
      "utf8",
    )
    expect(script).toContain("parseReleaseFrictionArgs(process.argv.slice(2),")
    expect(script).toContain("now: generatedAt")
    expect(script).toContain("RELEASE_FRICTION_USAGE")
    expect(script).toContain("writeAggregateReceiptAtomic")
    expect(script).toContain("process.stdout.write")
    expect(script).not.toMatch(/console\.log|SUPABASE_SERVICE_ROLE_KEY.*stdout|POSTHOG_PROJECT_API_KEY.*stdout/)

    const exampleEnv = readFileSync(join(process.cwd(), ".env.example"), "utf8")
    expect(exampleEnv).toContain("POSTHOG_PROJECT_API_KEY=")
    expect(exampleEnv).toContain("POSTHOG_PROJECT_ID=")
    expect(exampleEnv).toContain("INSTANTMED_RELEASE_MEASUREMENT_SHA=")
    expect(exampleEnv).toContain("INSTANTMED_RELEASE_MEASUREMENT_AT=")
    expect(exampleEnv).toContain("exact 40-character deployment Git SHA")
    expect(exampleEnv).toContain("canonical UTC Vercel ready timestamp")
  })
})

const A_UUID = "11111111-1111-4111-8111-111111111111"

import { describe, expect, it, vi } from "vitest"

import {
  buildUnavailableRefillReminderFunnelSnapshot,
  getRefillReminderFunnelSnapshot,
} from "@/lib/admin/refill-reminder-funnel"
import { SEEDED_E2E_PATIENT_PROFILE_IDS } from "@/lib/data/seeded-e2e-data"

const NOW = new Date("2026-09-05T00:00:00.000Z")
const FROM = "2026-06-07T00:00:00.000Z"

const MATURE_WAVE = {
  week_start: "2026-07-26T14:00:00.000Z",
  week_end_exclusive: "2026-08-02T14:00:00.000Z",
  maturity_at: "2026-08-22T01:00:00.000Z",
  sent: 10,
  delivered: 9,
  observed_provider_clicks: 4,
  utm_attributed_paid_renewals_within_21d: 2,
  same_patient_paid_reorders_within_21d: 3,
  utm_converted_sends_within_21d: 2,
  same_patient_converted_sends_within_21d: 3,
}

const MATURING_WAVE = {
  week_start: "2026-08-23T14:00:00.000Z",
  week_end_exclusive: "2026-08-30T14:00:00.000Z",
  maturity_at: "2026-09-15T02:00:00.000Z",
  sent: 5,
  delivered: 4,
  observed_provider_clicks: 1,
  utm_attributed_paid_renewals_within_21d: 1,
  same_patient_paid_reorders_within_21d: 1,
  utm_converted_sends_within_21d: 1,
  same_patient_converted_sends_within_21d: 1,
}

type ClientOptions = {
  heartbeat?: Record<string, unknown> | null
  heartbeatError?: { message: string } | null
  rpcError?: { message: string } | null
  waves?: Array<Record<string, unknown>> | null
}

function createClient(options: ClientOptions = {}) {
  const rpc = vi.fn(async () => ({
    data: options.waves ?? [MATURE_WAVE, MATURING_WAVE],
    error: options.rpcError ?? null,
  }))
  const maybeSingle = vi.fn(async () => ({
    data: options.heartbeat === undefined
      ? {
          job_name: "refill-reminders",
          last_run_at: "2026-09-04T23:00:00.000Z",
          last_status: "ok",
          last_success_at: "2026-09-04T23:00:00.000Z",
          last_failure_at: null,
          last_failure_status: null,
        }
      : options.heartbeat,
    error: options.heartbeatError ?? null,
  }))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))

  return { client: { rpc, from } as never, eq, from, maybeSingle, rpc, select }
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys)
    return keys
  }
  if (!value || typeof value !== "object") return keys
  for (const [key, item] of Object.entries(value)) {
    keys.add(key)
    collectKeys(item, keys)
  }
  return keys
}

describe("getRefillReminderFunnelSnapshot", () => {
  it("builds mature rates only from matched converted sends and keeps maturing orders out of totals", async () => {
    const { client, eq, rpc } = createClient()

    const snapshot = await getRefillReminderFunnelSnapshot(client, NOW)

    expect(rpc).toHaveBeenCalledWith("get_refill_reminder_funnel", {
      p_as_of: NOW.toISOString(),
      p_excluded_patient_ids: [...SEEDED_E2E_PATIENT_PROFILE_IDS],
      p_from: FROM,
      p_to: NOW.toISOString(),
    })
    expect(eq).toHaveBeenCalledWith("job_name", "refill-reminders")
    expect(snapshot).toMatchObject({
      availability: "available",
      schedulerEvidence: "healthy",
      from: FROM,
      to: NOW.toISOString(),
      sent: 15,
      delivered: 13,
      observedProviderClicks: 5,
      eligibleSentCohort: 10,
      utmAttributedPaidRenewalsWithin21d: 2,
      samePatientPaidReordersWithin21d: 3,
      utmConversionWithin21dPercent: 20,
      samePatientReorderWithin21dPercent: 30,
      retainedRevenueAvailability: "unavailable",
    })
    expect(snapshot.waves).toEqual([
      expect.objectContaining({
        cohortStatus: "mature",
        eligibleSentCohort: 10,
        utmConversionWithin21dPercent: 20,
        samePatientReorderWithin21dPercent: 30,
      }),
      expect.objectContaining({
        cohortStatus: "maturing",
        eligibleSentCohort: null,
        utmConversionWithin21dPercent: null,
        samePatientReorderWithin21dPercent: null,
      }),
    ])

    const outputKeys = [...collectKeys(snapshot)]
    expect(outputKeys).not.toEqual(expect.arrayContaining([
      "patient_id",
      "intake_id",
      "prescription_id",
      "provider_message_id",
      "to_email",
    ]))
  })

  it("keeps scheduler failure, absence, and query unavailability separate from cohort evidence", async () => {
    const failed = createClient({
      heartbeat: {
        job_name: "refill-reminders",
        last_run_at: "2026-09-04T23:00:00.000Z",
        last_status: "partial_failure",
        last_success_at: "2026-09-03T23:00:00.000Z",
        last_failure_at: "2026-09-04T23:00:00.000Z",
        last_failure_status: "partial_failure",
      },
    })
    const missing = createClient({ heartbeat: null })
    const unavailable = createClient({ heartbeatError: { message: "read failed" } })

    await expect(getRefillReminderFunnelSnapshot(failed.client, NOW)).resolves.toMatchObject({
      availability: "available",
      schedulerEvidence: "missing",
    })
    await expect(getRefillReminderFunnelSnapshot(missing.client, NOW)).resolves.toMatchObject({
      availability: "available",
      schedulerEvidence: "missing",
    })
    await expect(getRefillReminderFunnelSnapshot(unavailable.client, NOW)).resolves.toMatchObject({
      availability: "available",
      schedulerEvidence: "unavailable",
    })
  })

  it("uses the critical-cron freshness boundary instead of delivery evidence", async () => {
    const stale = createClient({
      heartbeat: {
        job_name: "refill-reminders",
        last_run_at: "2026-09-03T22:59:59.000Z",
        last_status: "ok",
        last_success_at: "2026-09-03T22:59:59.000Z",
        last_failure_at: null,
        last_failure_status: null,
      },
    })

    await expect(getRefillReminderFunnelSnapshot(stale.client, NOW)).resolves.toMatchObject({
      availability: "available",
      delivered: 13,
      schedulerEvidence: "missing",
    })
  })

  it("fails closed on impossible aggregate rows instead of fabricating safe-looking zeros", async () => {
    const impossible = createClient({
      waves: [{ ...MATURE_WAVE, delivered: 11 }],
    })

    await expect(getRefillReminderFunnelSnapshot(impossible.client, NOW)).resolves.toEqual(
      buildUnavailableRefillReminderFunnelSnapshot(NOW, "invalid_rpc_response"),
    )
  })

  it("keeps an empty real-send window available without inventing a conversion rate", async () => {
    const empty = createClient({ waves: [] })

    await expect(getRefillReminderFunnelSnapshot(empty.client, NOW)).resolves.toMatchObject({
      availability: "available",
      sent: 0,
      eligibleSentCohort: 0,
      utmAttributedPaidRenewalsWithin21d: 0,
      utmConversionWithin21dPercent: null,
      waves: [],
    })
  })
})

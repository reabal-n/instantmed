import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { BusinessAlert } from "@/lib/monitoring/alert-sections"
import { recordCriticalAlertSent, shouldSendCriticalAlert } from "@/lib/monitoring/critical-alert-cooldown"
import { deliverCriticalBusinessAlerts } from "@/lib/monitoring/critical-alert-dispatch"
import { advanceIncidents } from "@/lib/monitoring/incident-state"
import type { Incident } from "@/lib/monitoring/monitor-state"

const mocks = vi.hoisted(() => ({ db: vi.fn(), warn: vi.fn(), send: vi.fn() }))
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: mocks.db }))
vi.mock("@/lib/observability/logger", () => ({ createLogger: () => ({ warn: mocks.warn }) }))
vi.mock("@/lib/notifications/telegram", () => ({ sendCriticalBusinessAlertViaTelegram: mocks.send }))

type Row = { action: string; actor_type: string; metadata: Record<string, unknown>; created_at: string }
let rows: Row[]
let readError: boolean
let writeError: boolean
const now = Date.parse("2026-09-08T00:00:00Z")
const incident = { metric: 22, at: now - 86400000 }
const detail = "1 approved medical certificate intake is missing a current valid certificate"

// Model the audit table boundary, including JSON-field filters and failed writes.
// Assertions below exercise delivery behavior across polls, not the query spelling.
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(Date, "now").mockReturnValue(now)
  rows = []
  readError = false
  writeError = false
  mocks.send.mockResolvedValue(true)
  mocks.db.mockImplementation(() => ({
    from(table: string) {
      expect(table).toBe("audit_logs")
      const predicates: Array<(row: Row) => boolean> = []
      const value = (row: Row, column: string) => column.startsWith("metadata->>")
        ? String(row.metadata[column.slice("metadata->>".length)] ?? "")
        : row[column as keyof Row]
      const query = {
        select: () => query,
        eq(column: string, expected: unknown) { predicates.push(row => value(row, column) === expected); return query },
        in(column: string, expected: unknown[]) { predicates.push(row => expected.includes(value(row, column))); return query },
        gte(column: string, expected: string) { predicates.push(row => String(value(row, column)) >= expected); return query },
        limit: () => query,
        maybeSingle: async () => ({ data: rows.find(row => predicates.every(predicate => predicate(row))) ?? null, error: readError ? { message: "unavailable" } : null }),
        insert: async (row: Omit<Row, "created_at">) => {
          if (!writeError) rows.push({ ...row, created_at: new Date(Date.now()).toISOString() })
          return { error: writeError ? { message: "unavailable" } : null }
        },
      }
      return query
    },
  }))
})
afterEach(() => vi.restoreAllMocks())

describe("critical Telegram incident delivery receipts", () => {
  it("keeps an unchanged incident quiet beyond four hours and seven days, including copy changes", async () => {
    await recordCriticalAlertSent(detail, { incident })
    vi.spyOn(Date, "now").mockReturnValue(now + 8 * 86400000)
    expect(await shouldSendCriticalAlert("Updated aggregate wording", { incident })).toBe(false)
  })

  it("cannot let a delayed delivery of an old incident acknowledge its recurrence", async () => {
    await recordCriticalAlertSent(detail, { incident })
    const recurrence = { ...incident, at: now - 1000 }
    expect(await shouldSendCriticalAlert(detail, { incident: recurrence })).toBe(true)
  })

  it("acknowledges only the exact operator-selected incident and keeps categories independent", async () => {
    rows.push({ action: "critical_business_alert_acknowledged", actor_type: "system", created_at: new Date(now).toISOString(), metadata: { incident_metric: incident.metric, incident_at: incident.at } })
    expect(await shouldSendCriticalAlert(detail, { incident })).toBe(false)
    expect(await shouldSendCriticalAlert(detail, { incident: { ...incident, at: now } })).toBe(true)
    expect(await shouldSendCriticalAlert(detail, { incident: { ...incident, metric: 23 } })).toBe(true)
  })

  it("never treats an old text-only receipt as evidence of delivery of a new incident", async () => {
    await recordCriticalAlertSent(detail)
    expect(await shouldSendCriticalAlert(detail, { incident })).toBe(true)
  })

  it("fails open on receipt lookup failure", async () => {
    await recordCriticalAlertSent(detail, { incident })
    readError = true
    expect(await shouldSendCriticalAlert(detail, { incident })).toBe(true)
    expect(mocks.warn).toHaveBeenCalled()
  })

  it("keeps failed receipt writes visible and eligible for another delivery", async () => {
    writeError = true
    expect(await recordCriticalAlertSent(detail, { incident })).toBe(false)
    expect(await shouldSendCriticalAlert(detail, { incident })).toBe(true)
  })

  it("retains bounded text cooldowns only for unavailable incident state", async () => {
    await recordCriticalAlertSent(detail)
    expect(await shouldSendCriticalAlert(detail)).toBe(false)
    vi.spyOn(Date, "now").mockReturnValue(now + 5 * 3600000)
    expect(await shouldSendCriticalAlert(detail)).toBe(true)
    expect(await shouldSendCriticalAlert(detail, { cooldownHours: 7 * 24 })).toBe(false)
  })

  it("stores no alert prose and preserves a hash for application rollback", async () => {
    await recordCriticalAlertSent(detail, { incident })
    expect(rows[0].metadata).toEqual({ incident_metric: incident.metric, incident_at: incident.at, fingerprint: expect.stringMatching(/^[0-9a-f]{32}$/) })
    expect(JSON.stringify(rows)).not.toContain(detail)
  })
})

describe("critical Telegram delivery across accepted observations", () => {
  const alert: BusinessAlert = { metric: "ops_approved_certificate_missing_record", severity: "critical", count: 1, detail }
  const active = (at: number, count = 1): Incident => ({ metric: incident.metric, at, severity: 2, count, active: true })
  const accepted = (incidents: Incident[]) => ({ status: "accepted" as const, incidents })

  it("retries an unchanged incident after a failed send, then stays quiet after delivery", async () => {
    mocks.send.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const first = active(now - 1000)
    expect(await deliverCriticalBusinessAlerts([alert], accepted([first]))).toBe(false)
    expect(rows).toHaveLength(0)
    const next = advanceIncidents([first], [first], [first.metric], now)
    expect(await deliverCriticalBusinessAlerts([alert], accepted(next.incidents))).toBe(true)
    expect(await deliverCriticalBusinessAlerts([alert], accepted(next.incidents))).toBe(true)
    expect(mocks.send).toHaveBeenCalledTimes(2)
    expect(rows).toHaveLength(1)
  })

  it("does not re-bundle an acknowledged incident with a new critical category", async () => {
    const first = active(now - 1000)
    await recordCriticalAlertSent(detail, { incident: first })
    const payment: BusinessAlert = { metric: "payment_failed", severity: "critical", count: 5, detail: "5 recent payment failures" }
    await deliverCriticalBusinessAlerts([alert, payment], accepted([first, { ...active(now, 5), metric: 0 }]))
    expect(mocks.send).toHaveBeenCalledWith(payment.detail)
    expect(rows).toHaveLength(2)
  })

  it("keeps improvements quiet and re-pages a count rise from the accepted lower count", async () => {
    let state = [active(now - 3000, 5)]
    await deliverCriticalBusinessAlerts([{ ...alert, count: 5 }], accepted(state))
    state = advanceIncidents(state, [{ ...state[0], count: 4 }], [incident.metric], now - 2000).incidents
    await deliverCriticalBusinessAlerts([{ ...alert, count: 4, detail: "changing age and aggregate wording" }], accepted(state))
    expect(mocks.send).toHaveBeenCalledTimes(1)
    state = advanceIncidents(state, [{ ...state[0], count: 5 }], [incident.metric], now - 1000).incidents
    await deliverCriticalBusinessAlerts([{ ...alert, count: 5 }], accepted(state))
    expect(mocks.send).toHaveBeenCalledTimes(2)
  })

  it("pages increased severity and recurrence after verified recovery, while unknown is not recovery", async () => {
    let state = [{ ...active(now - 4000), severity: 1 }]
    await deliverCriticalBusinessAlerts([{ ...alert, severity: "warning" }], accepted(state))
    expect(mocks.send).not.toHaveBeenCalled()
    state = advanceIncidents(state, [active(now - 3000)], [incident.metric], now - 3000).incidents
    await deliverCriticalBusinessAlerts([alert], accepted(state))
    state = advanceIncidents(state, [], [], now - 2000).incidents
    await deliverCriticalBusinessAlerts([alert], accepted(state))
    expect(mocks.send).toHaveBeenCalledTimes(1)
    state = advanceIncidents(state, [], [incident.metric], now - 1000).incidents
    state = advanceIncidents(state, [active(now)], [incident.metric], now).incidents
    await deliverCriticalBusinessAlerts([alert], accepted(state))
    expect(mocks.send).toHaveBeenCalledTimes(2)
  })

  it("does not let a delayed old send suppress the failed delivery of a recurrence", async () => {
    let finishOld!: (delivered: boolean) => void
    mocks.send.mockImplementationOnce(() => new Promise<boolean>(resolve => { finishOld = resolve }))
      .mockResolvedValueOnce(false).mockResolvedValue(true)
    const oldDelivery = deliverCriticalBusinessAlerts([alert], accepted([active(now - 3000)]))
    await vi.waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1))
    const recurrence = accepted([active(now - 1000)])
    expect(await deliverCriticalBusinessAlerts([alert], recurrence)).toBe(false)
    finishOld(true)
    await oldDelivery
    expect(await deliverCriticalBusinessAlerts([alert], recurrence)).toBe(true)
    expect(await deliverCriticalBusinessAlerts([alert], recurrence)).toBe(true)
    expect(mocks.send).toHaveBeenCalledTimes(3)
    expect(rows.map(row => row.metadata.incident_at)).toEqual([now - 3000, now - 1000])
  })

  it("never dispatches stale observations after another poll wins", async () => {
    expect(await deliverCriticalBusinessAlerts([alert], { status: "superseded" })).toBe(true)
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("falls back to existing bounded delivery behavior during a state-store outage", async () => {
    expect(await deliverCriticalBusinessAlerts([alert], { status: "unavailable" })).toBe(true)
    expect(await deliverCriticalBusinessAlerts([alert], { status: "unavailable" })).toBe(true)
    expect(mocks.send).toHaveBeenCalledTimes(1)
    expect(rows[0].metadata.cooldown_hours).toBe(4)
    expect(rows[0].metadata.incident_at).toBeUndefined()
  })

  it("reports failed receipt persistence and retries delivery on the next poll", async () => {
    writeError = true
    expect(await deliverCriticalBusinessAlerts([alert], accepted([active(now)]))).toBe(false)
    writeError = false
    expect(await deliverCriticalBusinessAlerts([alert], accepted([active(now)]))).toBe(true)
    expect(mocks.send).toHaveBeenCalledTimes(2)
  })

  it("keeps a mismatched accepted token visible through the fallback instead of silencing it", async () => {
    expect(await deliverCriticalBusinessAlerts([alert], accepted([active(now, 2)]))).toBe(false)
    expect(mocks.send).toHaveBeenCalledWith(detail)
    expect(mocks.warn).toHaveBeenCalled()
    expect(rows[0].metadata.incident_at).toBeUndefined()
  })
})

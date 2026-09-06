import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildGoogleAdsPurchaseImportAlert, type GoogleAdsPurchaseImportHealthSnapshot } from "@/lib/monitoring/google-ads-purchase-import-health"
import { dispatchBusinessIncidents, INCIDENT_METRICS, knownGooglePurchaseIncidentMetrics } from "@/lib/monitoring/incident-state"

const mocks = vi.hoisted(() => ({ capture: vi.fn(), read: vi.fn(), append: vi.fn() }))
vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.capture }))
vi.mock("@/lib/monitoring/monitor-state", async importOriginal => ({
  ...await importOriginal<object>(), readMonitorState: mocks.read, appendMonitorState: mocks.append,
}))
function purchaseSnapshot(overrides: Partial<GoogleAdsPurchaseImportHealthSnapshot> = {}): GoogleAdsPurchaseImportHealthSnapshot {
  return { acceptedCustomerDataTerms: true, enhancedConversionsForLeadsEnabled: true,
    generatedAt: "2026-09-06T00:00:00Z", localNetRevenueAud: 100, localOrders: 5,
    preflightOk: true, purchaseAllConversions: 5, purchaseAllConversionsValueAud: 100,
    purchaseConversions: 5, purchaseConversionValueAud: 100, queryErrors: [], rangeDays: 30, ...overrides }
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.read.mockResolvedValue({ version: 1, state: { enabledAt: 1, checkedAt: 1, incidents: [] } })
  mocks.append.mockResolvedValue(true)
})
describe("business Sentry dispatch", () => {
  it("groups count changes by stable category, without detail prose", async () => {
    await dispatchBusinessIncidents([{ metric: "payment_failed", severity: "warning", count: 5, detail: "do not capture this" }], ["payment_failed"], 10)
    expect(mocks.capture).toHaveBeenCalledWith("business-alert: payment_failed active", expect.objectContaining({ fingerprint: ["business-alert", "payment_failed"], extra: { count: 5 } }))
    expect(JSON.stringify(mocks.capture.mock.calls)).not.toContain("do not capture")
  })
  it("makes worse severity and a new category visible independently", async () => {
    mocks.read.mockResolvedValue({ version: 2, state: { enabledAt: 1, checkedAt: 2, incidents: [{ metric: 0, severity: 1, count: 5, active: true, at: 2 }] } })
    await dispatchBusinessIncidents([{ metric: "payment_failed", severity: "critical", count: 5, detail: "" }, { metric: "email_delivery_failed", severity: "warning", count: 2, detail: "" }], [], 10)
    expect(mocks.capture).toHaveBeenCalledTimes(2)
  })
  it("unknown sections never emit recovery", async () => {
    mocks.read.mockResolvedValue({ version: 2, state: { enabledAt: 1, checkedAt: 2, incidents: [{ metric: 0, severity: 1, count: 5, active: true, at: 2 }] } })
    await dispatchBusinessIncidents([], [], 10)
    expect(mocks.capture).not.toHaveBeenCalled()
    expect(mocks.append.mock.calls[0][2].incidents[0].active).toBe(true)
  })
  it("failed Google preflight preserves purchase risk while independent categories recover", async () => {
    const purchaseMetric = INCIDENT_METRICS.indexOf("google_ads_purchase_imports_zero")
    mocks.read.mockResolvedValue({ version: 2, state: { enabledAt: 1, checkedAt: 2, incidents: [
      { metric: purchaseMetric, severity: 2, count: 5, active: true, at: 2 },
      { metric: 0, severity: 1, count: 5, active: true, at: 2 },
    ] } })
    const known = [...knownGooglePurchaseIncidentMetrics(purchaseSnapshot({ preflightOk: false, queryErrors: [] })), "payment_failed"]
    await dispatchBusinessIncidents([{ metric: "google_ads_purchase_import_health_unavailable", severity: "critical", count: 5, detail: "unavailable" }], known, 10)
    const incidents = mocks.append.mock.calls[0][2].incidents
    expect(incidents.find((item: { metric: number }) => item.metric === purchaseMetric).active).toBe(true)
    expect(incidents.find((item: { metric: number }) => item.metric === 0).active).toBe(false)
    expect(mocks.capture).not.toHaveBeenCalledWith("business-alert: google_ads_purchase_imports_zero recovered", expect.anything())
    expect(mocks.capture).toHaveBeenCalledWith("business-alert: google_ads_purchase_import_health_unavailable active", expect.anything())
  })
  it.each([
    { prior: "google_ads_purchase_imports_zero", masked: { acceptedCustomerDataTerms: false, purchaseAllConversions: 0, purchaseConversions: 0 }, selected: "google_ads_purchase_enhanced_conversions_setup_incomplete", unmasked: { purchaseAllConversions: 0, purchaseConversions: 0 } },
    { prior: "google_ads_purchase_primary_conversions_zero", masked: { purchaseAllConversions: 0, purchaseConversions: 0 }, selected: "google_ads_purchase_imports_zero", unmasked: { purchaseAllConversions: 5, purchaseConversions: 0 } },
  ])("preserves $prior when masked by $selected and recovers only after its predicate clears", async ({ prior, masked, selected, unmasked }) => {
    const priorId = INCIDENT_METRICS.indexOf(prior)
    let state = { enabledAt: 1, checkedAt: 2, incidents: [{ metric: priorId, severity: 2, count: 5, active: true, at: 2 }] }
    mocks.read.mockImplementation(async () => ({ version: 2, state }))
    mocks.append.mockImplementation(async (_key, _version, next) => { state = next; return true })
    const snapshot = purchaseSnapshot(masked)
    const alert = buildGoogleAdsPurchaseImportAlert(snapshot)!
    expect(alert.metric).toBe(selected)
    await dispatchBusinessIncidents([alert], knownGooglePurchaseIncidentMetrics(snapshot), 10)
    expect(state.incidents.find(item => item.metric === priorId)?.active).toBe(true)
    expect(mocks.capture).not.toHaveBeenCalledWith(`business-alert: ${prior} recovered`, expect.anything())
    // Clearing only the masking fault makes the older predicate visible again.
    const next = purchaseSnapshot(unmasked)
    await dispatchBusinessIncidents([buildGoogleAdsPurchaseImportAlert(next)!], knownGooglePurchaseIncidentMetrics(next), 20)
    expect(state.incidents.find(item => item.metric === priorId)?.active).toBe(true)
    const healthy = purchaseSnapshot()
    await dispatchBusinessIncidents([], knownGooglePurchaseIncidentMetrics(healthy), 30)
    expect(state.incidents.find(item => item.metric === priorId)?.active).toBe(false)
    expect(mocks.capture.mock.calls.filter(call => call[0] === `business-alert: ${prior} recovered`)).toHaveLength(1)
  })
  it("read/write/claim failures fail open", async () => {
    mocks.append.mockRejectedValue(new Error("private provider detail"))
    expect(await dispatchBusinessIncidents([{ metric: "payment_failed", severity: "critical", count: 5, detail: "private prose" }], [], 10)).toBe(false)
    expect(mocks.capture).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(mocks.capture.mock.calls)).not.toContain("private")
  })
  it("bounded CAS losers do not publish a duplicate claim", async () => {
    mocks.append.mockResolvedValueOnce(false)
    mocks.read.mockResolvedValueOnce({ version: 1, state: { enabledAt: 1, checkedAt: 1, incidents: [] } })
      .mockResolvedValueOnce({ version: 2, state: { enabledAt: 1, checkedAt: 10, incidents: [] } })
    expect(await dispatchBusinessIncidents([], [], 10)).toBe(true)
    expect(mocks.capture).not.toHaveBeenCalled()
  })
})

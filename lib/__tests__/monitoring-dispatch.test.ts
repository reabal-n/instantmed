import { beforeEach, describe, expect, it, vi } from "vitest"

import { dispatchBusinessIncidents } from "@/lib/monitoring/incident-state"

const mocks = vi.hoisted(() => ({ capture: vi.fn(), read: vi.fn(), append: vi.fn() }))
vi.mock("@sentry/nextjs", () => ({ captureMessage: mocks.capture }))
vi.mock("@/lib/monitoring/monitor-state", async importOriginal => ({
  ...await importOriginal<object>(), readMonitorState: mocks.read, appendMonitorState: mocks.append,
}))
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

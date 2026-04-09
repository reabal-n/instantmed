import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  calculateWaitTime,
  getWaitTimeSeverity,
  calculateSlaCountdown,
} from "@/lib/doctor/queue-utils"

describe("calculateWaitTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-09T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns minutes for recent submissions", () => {
    expect(calculateWaitTime("2026-04-09T11:45:00Z")).toBe("15m")
  })

  it("returns hours and minutes for older submissions", () => {
    expect(calculateWaitTime("2026-04-09T10:30:00Z")).toBe("1h 30m")
  })

  it("returns 0m for just-submitted", () => {
    expect(calculateWaitTime("2026-04-09T12:00:00Z")).toBe("0m")
  })
})

describe("getWaitTimeSeverity", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-09T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns normal for recent (< 30min)", () => {
    expect(getWaitTimeSeverity("2026-04-09T11:45:00Z")).toBe("normal")
  })

  it("returns warning for 30-60min wait", () => {
    expect(getWaitTimeSeverity("2026-04-09T11:20:00Z")).toBe("warning")
  })

  it("returns critical for > 60min wait", () => {
    expect(getWaitTimeSeverity("2026-04-09T10:30:00Z")).toBe("critical")
  })

  it("uses SLA deadline when provided — normal", () => {
    expect(
      getWaitTimeSeverity("2026-04-09T10:00:00Z", "2026-04-09T13:00:00Z"),
    ).toBe("normal")
  })

  it("uses SLA deadline — warning when < 30min left", () => {
    expect(
      getWaitTimeSeverity("2026-04-09T10:00:00Z", "2026-04-09T12:20:00Z"),
    ).toBe("warning")
  })

  it("uses SLA deadline — critical when past", () => {
    expect(
      getWaitTimeSeverity("2026-04-09T10:00:00Z", "2026-04-09T11:30:00Z"),
    ).toBe("critical")
  })
})

describe("calculateSlaCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-09T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null for null/undefined deadline", () => {
    expect(calculateSlaCountdown(null)).toBeNull()
    expect(calculateSlaCountdown(undefined)).toBeNull()
  })

  it("returns time remaining for future deadline", () => {
    expect(calculateSlaCountdown("2026-04-09T14:30:00Z")).toBe("2h 30m left")
  })

  it("returns minutes only when < 1h left", () => {
    expect(calculateSlaCountdown("2026-04-09T12:45:00Z")).toBe("45m left")
  })

  it("returns overdue for past deadline", () => {
    expect(calculateSlaCountdown("2026-04-09T11:30:00Z")).toBe("30m overdue")
  })

  it("returns hours overdue for long breaches", () => {
    expect(calculateSlaCountdown("2026-04-09T10:00:00Z")).toBe("2h 0m overdue")
  })
})

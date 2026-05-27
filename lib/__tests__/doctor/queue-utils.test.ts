import { afterEach,beforeEach, describe, expect, it, vi } from "vitest"

import {
  calculateLiveWaitTime,
  calculateSlaCountdown,
  calculateWaitTime,
  getQueueEnteredAt,
  getQueueStatusMeta,
  getWaitTimeSeverity,
  isHydratedQueueRealtimeInsert,
  QUEUE_REVIEW_STATUSES,
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

describe("calculateLiveWaitTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-09T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps just-arrived rows calm instead of flashing 0s", () => {
    expect(calculateLiveWaitTime("2026-04-09T12:00:00Z")).toBe("just now")
    expect(calculateLiveWaitTime("2026-04-09T11:59:57Z")).toBe("just now")
  })

  it("shows truthful seconds during the first minute", () => {
    expect(calculateLiveWaitTime("2026-04-09T11:59:48Z")).toBe("12s")
    expect(calculateLiveWaitTime("2026-04-09T11:59:01Z")).toBe("59s")
  })

  it("falls back to compact minute and hour labels after the first minute", () => {
    expect(calculateLiveWaitTime("2026-04-09T11:45:00Z")).toBe("15m")
    expect(calculateLiveWaitTime("2026-04-09T10:30:00Z")).toBe("1h 30m")
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

  it("returns normal before 75% of the 2h target", () => {
    expect(getWaitTimeSeverity("2026-04-09T11:45:00Z")).toBe("normal")
    expect(getWaitTimeSeverity("2026-04-09T10:45:00Z")).toBe("normal")
  })

  it("returns warning after 75% of the 2h target", () => {
    expect(getWaitTimeSeverity("2026-04-09T10:20:00Z")).toBe("warning")
  })

  it("returns critical only after the 2h target is breached", () => {
    expect(getWaitTimeSeverity("2026-04-09T09:50:00Z")).toBe("critical")
  })

  it("uses SLA deadline when provided - normal", () => {
    expect(
      getWaitTimeSeverity("2026-04-09T10:00:00Z", "2026-04-09T13:00:00Z"),
    ).toBe("normal")
  })

  it("uses SLA deadline - warning when < 30min left", () => {
    expect(
      getWaitTimeSeverity("2026-04-09T10:00:00Z", "2026-04-09T12:20:00Z"),
    ).toBe("warning")
  })

  it("uses SLA deadline - critical when past", () => {
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

describe("doctor queue operational helpers", () => {
  it("treats awaiting_script as a first-class queue status", () => {
    expect(QUEUE_REVIEW_STATUSES).toContain("awaiting_script")
  })

  it("uses paid_at before submitted_at or created_at for queue wait time", () => {
    const enteredAt = getQueueEnteredAt({
      paid_at: "2026-04-09T11:40:00Z",
      submitted_at: "2026-04-09T11:00:00Z",
      created_at: "2026-04-09T10:00:00Z",
    })

    expect(enteredAt).toBe("2026-04-09T11:40:00Z")
  })

  it("falls back to submitted_at for legacy paid rows without paid_at", () => {
    const enteredAt = getQueueEnteredAt({
      paid_at: null,
      submitted_at: "2026-04-09T11:00:00Z",
      created_at: "2026-04-09T10:00:00Z",
    })

    expect(enteredAt).toBe("2026-04-09T11:00:00Z")
  })

  it("labels script cases truthfully", () => {
    expect(getQueueStatusMeta("awaiting_script")).toMatchObject({
      label: "Awaiting script",
      tone: "script",
    })
  })

  it("rejects raw realtime inserts that do not include joined queue data", () => {
    expect(
      isHydratedQueueRealtimeInsert({
        id: "intake-1",
        status: "paid",
      }),
    ).toBe(false)

    expect(
      isHydratedQueueRealtimeInsert({
        id: "intake-1",
        status: "paid",
        patient: { id: "patient-1", full_name: "Hydrated Patient" },
        service: { id: "service-1", type: "med_certs" },
      }),
    ).toBe(true)
  })
})

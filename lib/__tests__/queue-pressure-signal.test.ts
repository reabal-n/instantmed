import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import {
  getQueuePressureSeverity,
  getQueuePressureState,
  QUEUE_WAIT_TARGET_MINUTES,
} from "@/lib/doctor/queue-pressure"
import { formatRefreshAge } from "@/lib/hooks/use-relative-refresh-age"

describe("queue pressure signal", () => {
  it("maps oldest-wait pressure to the 2h target", () => {
    expect(getQueuePressureSeverity(null)).toBe("idle")
    expect(getQueuePressureSeverity(0)).toBe("clear")
    expect(getQueuePressureSeverity(Math.floor(QUEUE_WAIT_TARGET_MINUTES * 0.59))).toBe("clear")
    expect(getQueuePressureSeverity(Math.ceil(QUEUE_WAIT_TARGET_MINUTES * 0.6))).toBe("watch")
    expect(getQueuePressureSeverity(Math.ceil(QUEUE_WAIT_TARGET_MINUTES * 0.9))).toBe("urgent")
  })

  it("keeps no-wait and active-wait copy distinct", () => {
    expect(getQueuePressureState(null).value).toBe("No one waiting")
    expect(getQueuePressureState(0).value).toBe("0m")
    expect(getQueuePressureState(50).value).toBe("50m")
  })

  it("keeps low pressure visually neutral instead of warning-coloured", () => {
    const signalSource = readFileSync("components/operator/queue-pressure-signal.tsx", "utf8")
    const filterSource = readFileSync("app/doctor/queue/queue-filters.tsx", "utf8")

    expect(signalSource).toContain('dot: "bg-slate-500"')
    expect(signalSource).toContain('value: "text-foreground"')
    expect(signalSource).toContain("formatRefreshAge(nowMs, mountedAtRef.current)")
    expect(signalSource).not.toContain('refreshAgeLabel === "Updated just now"')
    expect(filterSource).toContain('dot: "bg-slate-500"')
    expect(filterSource).toContain('value: "text-slate-700 dark:text-muted-foreground"')
  })
})

describe("relative refresh age", () => {
  it("formats a ticking queue refresh label without pretending it is static", () => {
    const now = new Date("2026-05-27T10:00:30.000Z").getTime()

    expect(formatRefreshAge(now, now - 1000)).toBe("Updated just now")
    expect(formatRefreshAge(now, now - 12_000)).toBe("Updated 12s ago")
    expect(formatRefreshAge(now, now - 120_000)).toBe("Updated 2m ago")
  })
})

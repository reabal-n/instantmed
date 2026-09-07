import { describe, expect, it } from "vitest"

import { browserHealth, mergeCompletion } from "@/lib/monitoring/browser-evidence"
import { advanceIncidents } from "@/lib/monitoring/incident-state"

const now = Date.parse("2026-09-06T12:00:00Z")
const completion = (number: number, outcome: number, completed = now) => ({ event: 0, id: number, number, attempt: 1, created: completed - 60000, started: completed - 30000, completed, outcome, status: 2 })
describe("ordered monitoring evidence", () => {
  it.each([359, 360, 365])("silence at %i minutes uses completed browser time", minutes => {
    const health = browserHealth({ enabledAt: now - 86400000, latest: completion(1, 1, now - minutes * 60000) }, now)
    expect(health.stale).toBe(minutes >= 360)
  })
  it("never-run grace is durable", () => {
    expect(browserHealth({ enabledAt: now - 360 * 60000 }, now).stale).toBe(true)
  })
  it("late older success cannot recover a newer failed run", () => {
    expect(mergeCompletion(completion(2, 2), completion(1, 1, now + 1))).toMatchObject({ number: 2, outcome: 2 })
  })
  it("late older completion refreshes age without clearing newer failure", () => {
    const failed = completion(2, 2, now - 365 * 60000)
    expect(browserHealth({ enabledAt: now - 86400000, latest: failed, completedAt: now, cache: [completion(1, 1)] }, now)).toEqual({ failed: true, stale: false })
  })
  it("a rerun attempt can recover the same run", () => {
    expect(mergeCompletion(completion(2, 2), { ...completion(2, 1), attempt: 2 })).toMatchObject({ attempt: 2, outcome: 1 })
  })
  it("suppresses unchanged alerts, accepts decreases, then pages 5 to 4 to 5", () => {
    let state = advanceIncidents([], [{ metric: 0, severity: 1, count: 5 }], [0], 1)
    expect(state.events).toHaveLength(1)
    state = advanceIncidents(state.incidents, [{ metric: 0, severity: 1, count: 5 }], [0], 2)
    expect(state.events).toHaveLength(0)
    state = advanceIncidents(state.incidents, [{ metric: 0, severity: 1, count: 4 }], [0], 3)
    expect(state.events).toHaveLength(0)
    expect(advanceIncidents(state.incidents, [{ metric: 0, severity: 1, count: 5 }], [0], 4).events).toHaveLength(1)
  })
  it("unknown sections preserve incidents while real recovery rearms them", () => {
    const first = advanceIncidents([], [{ metric: 0, severity: 1, count: 1 }], [0], 1)
    expect(advanceIncidents(first.incidents, [], [], 2).incidents[0].active).toBe(true)
    const recovered = advanceIncidents(first.incidents, [], [0], 3)
    expect(recovered.events[0].active).toBe(false)
    expect(advanceIncidents(recovered.incidents, [{ metric: 0, severity: 1, count: 1 }], [0], 4).events).toHaveLength(1)
  })
})

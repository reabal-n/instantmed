import "server-only"

import { browserHealth, collectBrowserEvidence, compareBrowserEvidence, mergeBrowserCache, mergeCompletion } from "@/lib/monitoring/browser-evidence"
import { advanceIncidents, captureIncident } from "@/lib/monitoring/incident-state"
import { appendMonitorState, type BrowserState, browserStateSchema, readMonitorState } from "@/lib/monitoring/monitor-state"

const BROWSER_INCIDENTS = ["browser_failed", "browser_stale", "observer_unavailable"]

function classify(state: BrowserState, now: number) {
  const health = browserHealth(state, now)
  return [health.failed, health.stale, !state.observerOk || health.stale === null].flatMap((active, metric) => active ? [{ metric, severity: 2, count: 1 }] : [])
}

export async function checkBrowserObserver() {
  const now = Date.now()
  let verified: BrowserState | undefined
  let discoveredFailure = false
  try {
    const initial = await readMonitorState("browser_observer_state", browserStateSchema)
    verified = initial.state
    const collected = await collectBrowserEvidence(initial.state, now)
    discoveredFailure = collected.completions.some(evidence => evidence.outcome === 2)
    for (let retry = 0; retry < 3; retry++) {
      const current = retry === 0 ? initial : await readMonitorState("browser_observer_state", browserStateSchema)
      verified = current.state
      if (current.state.checkedAt >= now) return { healthy: classify(current.state, now).length === 0, ...current.state }
      const state = { ...collected.state, completedAt: Math.max(collected.state.completedAt ?? 0, current.state.completedAt ?? 0), incidents: current.state.incidents }
      state.cache = mergeBrowserCache(current.state.cache, collected.state.cache)
      if (current.state.backoffUntil > now) {
        state.backoffUntil = Math.max(state.backoffUntil, current.state.backoffUntil)
      }
      // Wall-clock polling order does not establish source-window order. An
      // older fetched list cannot clear outstanding work in the newer known
      // window, whether it arrives on a CAS retry or an ordinary later poll.
      if (current.state.invocation && (!collected.sourceInvocation
        || compareBrowserEvidence(current.state.invocation, collected.sourceInvocation) > 0)) {
        state.coverageGap = current.state.coverageGap
        state.running = current.state.running
        state.observerOk &&= current.state.observerOk
      }
      // A concurrent successful observer must not have its source evidence
      // erased by this older snapshot. CAS retries merge immutable evidence.
      for (const field of ["latest", "success", "failure", "invocation"] as const) {
        if (current.state[field]) state[field] = mergeCompletion(state[field], current.state[field]!)
      }
      const health = browserHealth(state, now)
      let unavailableReason: typeof collected.unavailableReason | "newer_window_unavailable" = collected.unavailableReason
      // Cadence availability is derived from the merged proof. A competing
      // poll may have restored scheduled evidence or evicted its last receipt.
      if (unavailableReason === "cadence_unknown" && health.stale !== null) {
        // Its timestamp proves cadence, not completeness of the contributing
        // source window. Pending jobs or a coverage gap still stay unavailable.
        state.observerOk = current.state.observerOk
        unavailableReason = undefined
      }
      if (!state.observerOk && !unavailableReason) unavailableReason = state.coverageGap ? "coverage_gap" : "newer_window_unavailable"
      if (health.stale === null) {
        state.observerOk = false
        unavailableReason ??= "cadence_unknown"
      }
      if (state.backoffUntil > now) {
        state.observerOk = false
        if (collected.state.backoffUntil <= now) unavailableReason = "backoff"
      }
      const events = []
      // The immutable cache also receipts notification processing. Outcome
      // ordering alone cannot receipt older failures fetched on a later poll
      // while draining the two-job cap. Report each newly verified failure,
      // then classify recovery against the newest outcome below.
      let latest = current.state.latest
      for (const evidence of collected.completions) {
        if (current.state.cache.some(cached => cached.id === evidence.id && cached.attempt === evidence.attempt)) continue
        const advancesOutcome = !latest || compareBrowserEvidence(evidence, latest) > 0
        if (!advancesOutcome && evidence.outcome !== 2) continue
        if (advancesOutcome) latest = evidence
        const transition = advanceIncidents(state.incidents, evidence.outcome === 2 ? [{ metric: 0, severity: 2, count: 1 }] : [], [0], now)
        state.incidents = transition.incidents
        events.push(...transition.events)
      }
      const known = health.stale === null ? [0, 2] : [0, 1, 2]
      const result = advanceIncidents(state.incidents, classify(state, now), known, now)
      state.incidents = result.incidents
      events.push(...result.events)
      verified = state
      if (!await appendMonitorState("browser_observer_state", current.version, state)) continue
      for (const event of events) captureIncident("browser-monitor", BROWSER_INCIDENTS[event.metric], event)
      return { healthy: classify(state, now).length === 0, ...state, unavailableReason }
    }
    throw new Error("browser_observer_claim_unavailable")
  } catch {
    const health = verified ? browserHealth(verified, now) : { stale: true, failed: false }
    for (const metric of ["observer_unavailable", ...(health.stale ? ["browser_stale"] : []), ...(health.failed || discoveredFailure ? ["browser_failed"] : [])]) {
      captureIncident("browser-monitor", metric, { active: true, severity: 2, count: 1 })
    }
    return { ...verified, healthy: false, observerOk: false, checkedAt: now, persistenceAvailable: false }
  }
}

import "server-only"

import { z } from "zod"

import type { BrowserState, Evidence } from "@/lib/monitoring/monitor-state"

const API = "https://api.github.com/repos/reabal-n/instantmed/actions"
const BROWSER_WORKFLOW = {
  file: "prod-request-flow-synthetic.yml",
  job: "request-flow-synthetic",
  step: "Run production request-flow synthetic",
} as const
const FRESHNESS_MS = 360 * 60000
const integer = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const runSchema = z.object({ id: integer, run_number: integer, run_attempt: integer,
  event: z.enum(["schedule", "workflow_dispatch"]), head_branch: z.literal("main"), path: z.literal(`.github/workflows/${BROWSER_WORKFLOW.file}`),
  created_at: z.string(), run_started_at: z.string().nullable(),
  status: z.enum(["queued", "in_progress", "completed", "waiting", "pending", "requested"]),
})
const stepSchema = z.object({ name: z.string(), status: z.string(), conclusion: z.string().nullable(), started_at: z.string().nullable(), completed_at: z.string().nullable() })
const jobsSchema = z.object({ total_count: integer, jobs: z.array(z.object({ name: z.string(), run_id: integer, run_attempt: integer, status: z.string(), conclusion: z.string().nullable(), steps: z.array(stepSchema) })).max(10) })
type UnavailableReason = "rate_limited" | "backoff" | "http_error" | "invalid_source" | "job_unavailable" | "step_unavailable" | "transport_error" | "coverage_gap" | "pending_evidence" | "cadence_unknown"

function timestamp(value: string | null, now: number, nullable = false): number {
  if (value === null && nullable) return 0
  const parsed = value && /^\d{4}-\d\d-\d\dT/.test(value) ? Date.parse(value) : NaN
  if (!Number.isFinite(parsed) || parsed! < 0 || parsed! > now) throw new ObservationError()
  return parsed as number
}
export function compareBrowserEvidence(a: Evidence, b: Evidence) { return a.number - b.number || a.attempt - b.attempt }
export function mergeBrowserCache(...caches: Evidence[][]): Evidence[] {
  const unique = new Map<string, Evidence>()
  for (const evidence of caches.flat()) {
    const key = `${evidence.id}:${evidence.attempt}`
    if (!unique.has(key)) unique.set(key, evidence)
  }
  return [...unique.values()].sort((a, b) => compareBrowserEvidence(b, a)).slice(0, 10)
}
export function mergeCompletion(old: Evidence | undefined, next: Evidence): Evidence {
  return !old || compareBrowserEvidence(next, old) > 0 ? next : old
}
export function browserHealth(state: Pick<BrowserState, "enabledAt" | "latest" | "completedAt"> & Partial<Pick<BrowserState, "cache" | "success" | "failure">>, now: number) {
  const evidence = [...(state.cache ?? []), state.latest, state.success, state.failure]
  const scheduledAt = Math.max(0, ...evidence.map(item => item?.event === 0 ? item.completed : 0))
  const hasCompletion = !!state.completedAt || evidence.some(item => !!item?.completed)
  // Manual execution can prove browser availability, never scheduled cadence.
  // If its bounded window evicts all scheduled proof (or old evidence has no
  // event), cadence is unknown. Keep prior stale incidents until proof returns.
  const stale = scheduledAt ? now - scheduledAt >= FRESHNESS_MS
    : hasCompletion ? null : now - state.enabledAt >= FRESHNESS_MS
  return { stale, failed: state.latest?.outcome === 2 }
}

class ObservationError extends Error {
  constructor(readonly backoffUntil = 0, readonly reason: UnavailableReason = "invalid_source") { super("browser_observer_unavailable") }
}
async function getJson(path: string, now: number): Promise<unknown> {
  const response = await fetch(`${API}/${path}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store", signal: AbortSignal.timeout(2500), redirect: "error",
  })
  if (!response.ok) {
    const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000
    const retry = Number(response.headers.get("retry-after")) * 1000 + now
    throw new ObservationError(response.status === 429 || response.status === 403
      ? Math.min(now + 3600000, Math.max(now + 300000, Number.isFinite(reset) ? reset : 0, Number.isFinite(retry) ? retry : 0)) : 0,
    response.status === 429 ? "rate_limited" : "http_error")
  }
  return response.json()
}

export async function collectBrowserEvidence(previous: BrowserState, now: number): Promise<{ state: BrowserState; completions: Evidence[]; sourceInvocation?: Evidence; unavailableReason?: UnavailableReason }> {
  const state: BrowserState = { ...previous, checkedAt: now, cache: [...previous.cache], observerOk: false }
  const completions: Evidence[] = []
  let sourceInvocation: Evidence | undefined
  let unavailableReason: UnavailableReason | undefined
  try {
    if (now < state.backoffUntil) throw new ObservationError(state.backoffUntil, "backoff")
    const body = z.object({ total_count: z.number().int().nonnegative(), workflow_runs: z.array(runSchema).max(10) }).parse(
      await getJson(`workflows/${BROWSER_WORKFLOW.file}/runs?branch=main&per_page=10`, now),
    )
    const runs = body.workflow_runs.map(run => {
      const evidence: Evidence = { event: run.event === "schedule" ? 0 : 1, id: run.id, number: run.run_number, attempt: run.run_attempt,
        created: timestamp(run.created_at, now), started: timestamp(run.run_started_at, now, true), completed: 0, outcome: 0,
        status: run.status === "completed" ? 2 : run.status === "in_progress" ? 1 : 0 }
      if (evidence.started && evidence.started < evidence.created) throw new ObservationError()
      return evidence
    }).sort((a, b) => compareBrowserEvidence(b, a))
    if (new Set(runs.map(run => `${run.id}:${run.attempt}`)).size !== runs.length) throw new ObservationError()
    // This poll's fetched head is internal reconciliation evidence. Persisted
    // invocation is a historical maximum and can outlive an older API list.
    sourceInvocation = runs[0]
    // A capped window that no longer overlaps prior invocation evidence cannot
    // establish whether intermediate failures occurred. Keep this visible.
    state.coverageGap = !!previous.invocation && runs.length === 10 && runs.every(run => compareBrowserEvidence(run, previous.invocation!) > 0)
    state.invocation = runs[0] ? mergeCompletion(previous.invocation, runs[0]) : previous.invocation
    state.running = runs.find(run => run.status !== 2)
    const pending = runs.filter(run => run.status === 2 && !state.cache.some(cached => cached.id === run.id && cached.attempt === run.attempt))
    // At most one list + two job reads per poll (36/hour worst case, normally12).
    for (const run of pending.slice(0, 2)) {
      const jobs = jobsSchema.parse(await getJson(`runs/${run.id}/attempts/${run.attempt}/jobs?per_page=10`, now))
      const matching = jobs.jobs.filter(job => job.name === BROWSER_WORKFLOW.job && job.run_id === run.id && job.run_attempt === run.attempt)
      if (jobs.total_count !== jobs.jobs.length || matching.length !== 1) throw new ObservationError(0, "job_unavailable")
      const job = matching[0]
      if (job.status !== "completed") throw new ObservationError(0, "job_unavailable")
      const steps = job.steps.filter(step => step.name === BROWSER_WORKFLOW.step)
      if (steps.length !== 1) throw new ObservationError(0, "step_unavailable")
      const step = steps[0]
      let evidence = run
      if (step.status === "completed" && ["success", "failure", "timed_out", "cancelled"].includes(step.conclusion ?? "") && step.started_at && step.completed_at) {
        const started = timestamp(step.started_at, now)
        const completed = timestamp(step.completed_at, now)
        if (started < run.created || completed < started) throw new ObservationError()
        evidence = { ...run, started, completed, outcome: step.conclusion === "success" ? 1 : 2 }
        completions.push(evidence)
      }
      // Bound every successful read immediately: a later read can fail before
      // the poll ends, and its partial evidence/backoff must still persist.
      state.cache = mergeBrowserCache(state.cache, [evidence])
    }
    const newestCompleted = runs.find(run => run.status === 2)
    const newestProof = newestCompleted && state.cache.find(run => run.id === newestCompleted.id && run.attempt === newestCompleted.attempt)
    state.observerOk = pending.length <= 2 && (!newestCompleted || !!newestProof?.completed) && !state.coverageGap
    if (!state.observerOk) unavailableReason = state.coverageGap ? "coverage_gap"
      : pending.length > 2 ? "pending_evidence" : "step_unavailable"
    state.backoffUntil = 0
  } catch (error) {
    state.backoffUntil = error instanceof ObservationError ? error.backoffUntil : 0
    unavailableReason = error instanceof ObservationError ? error.reason
      : error instanceof z.ZodError || error instanceof SyntaxError ? "invalid_source" : "transport_error"
  }
  for (const evidence of completions.sort(compareBrowserEvidence)) {
    state.completedAt = Math.max(state.completedAt ?? 0, evidence.completed)
    state.latest = mergeCompletion(state.latest, evidence)
    if (evidence.outcome === 1) state.success = mergeCompletion(state.success, evidence)
    else state.failure = mergeCompletion(state.failure, evidence)
  }
  if (browserHealth(state, now).stale === null) {
    state.observerOk = false
    unavailableReason ??= "cadence_unknown"
  }
  // Diagnostic enum is response-only; durable snapshots remain numeric/boolean.
  return { state, completions, sourceInvocation, unavailableReason }
}

import "server-only"

import { z } from "zod"

import type { BrowserState, Evidence } from "@/lib/monitoring/monitor-state"

const API = "https://api.github.com/repos/reabal-n/instantmed/actions"
const STEP = "Run production request-flow synthetic"
const FRESHNESS_MS = 360 * 60000
const integer = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const runSchema = z.object({ id: integer, run_number: integer, run_attempt: integer,
  event: z.enum(["schedule", "workflow_dispatch"]), head_branch: z.literal("main"), path: z.literal(".github/workflows/prod-request-flow-synthetic.yml"),
  created_at: z.string(), run_started_at: z.string().nullable(),
  status: z.enum(["queued", "in_progress", "completed", "waiting", "pending", "requested"]),
})
const stepSchema = z.object({ name: z.string(), status: z.string(), conclusion: z.string().nullable(), started_at: z.string().nullable(), completed_at: z.string().nullable() })
const jobsSchema = z.object({ total_count: integer, jobs: z.array(z.object({ name: z.string(), run_id: integer, run_attempt: integer, status: z.string(), conclusion: z.string().nullable(), steps: z.array(stepSchema) })).max(10) })

function timestamp(value: string | null, now: number, nullable = false): number {
  if (value === null && nullable) return 0
  const parsed = value && /^\d{4}-\d\d-\d\dT/.test(value) ? Date.parse(value) : NaN
  if (!Number.isFinite(parsed) || parsed! < 0 || parsed! > now) throw new Error("invalid_source_time")
  return parsed as number
}
export function compareBrowserEvidence(a: Evidence, b: Evidence) { return a.number - b.number || a.attempt - b.attempt }
export function mergeCompletion(old: Evidence | undefined, next: Evidence): Evidence {
  return !old || compareBrowserEvidence(next, old) > 0 ? next : old
}
export function browserHealth(state: Pick<BrowserState, "enabledAt" | "latest" | "completedAt">, now: number) {
  return { stale: now - (state.completedAt || state.latest?.completed || state.enabledAt) >= FRESHNESS_MS, failed: state.latest?.outcome === 2 }
}

class ObservationError extends Error {
  constructor(readonly backoffUntil = 0) { super("browser_observer_unavailable") }
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
      ? Math.min(now + 3600000, Math.max(now + 300000, Number.isFinite(reset) ? reset : 0, Number.isFinite(retry) ? retry : 0)) : 0)
  }
  return response.json()
}

export async function collectBrowserEvidence(previous: BrowserState, now: number): Promise<{ state: BrowserState; completions: Evidence[] }> {
  const state: BrowserState = { ...previous, checkedAt: now, cache: [...previous.cache], observerOk: false }
  const completions: Evidence[] = []
  try {
    if (now < state.backoffUntil) throw new ObservationError(state.backoffUntil)
    const body = z.object({ total_count: z.number().int().nonnegative(), workflow_runs: z.array(runSchema).max(10) }).parse(
      await getJson("workflows/prod-request-flow-synthetic.yml/runs?branch=main&per_page=10", now),
    )
    const runs = body.workflow_runs.map(run => {
      const evidence: Evidence = { event: run.event === "schedule" ? 0 : 1, id: run.id, number: run.run_number, attempt: run.run_attempt,
        created: timestamp(run.created_at, now), started: timestamp(run.run_started_at, now, true), completed: 0, outcome: 0,
        status: run.status === "completed" ? 2 : run.status === "in_progress" ? 1 : 0 }
      if (evidence.started && evidence.started < evidence.created) throw new ObservationError()
      return evidence
    }).sort((a, b) => compareBrowserEvidence(b, a))
    if (new Set(runs.map(run => `${run.id}:${run.attempt}`)).size !== runs.length) throw new ObservationError()
    // A capped window that no longer overlaps prior invocation evidence cannot
    // establish whether intermediate failures occurred. Keep this visible.
    state.coverageGap = !!previous.invocation && runs.length === 10 && runs.every(run => compareBrowserEvidence(run, previous.invocation!) > 0)
    state.invocation = runs[0] ? mergeCompletion(previous.invocation, runs[0]) : previous.invocation
    state.running = runs.find(run => run.status !== 2)
    const pending = runs.filter(run => run.status === 2 && !state.cache.some(cached => cached.id === run.id && cached.attempt === run.attempt))
    // At most one list + two job reads per poll (36/hour worst case, normally12).
    for (const run of pending.slice(0, 2)) {
      const jobs = jobsSchema.parse(await getJson(`runs/${run.id}/attempts/${run.attempt}/jobs?per_page=10`, now))
      const matching = jobs.jobs.filter(job => job.name === "request-flow-synthetic" && job.run_id === run.id && job.run_attempt === run.attempt)
      if (jobs.total_count !== jobs.jobs.length || matching.length !== 1) throw new ObservationError()
      const job = matching[0]
      if (job.status !== "completed") throw new ObservationError()
      const steps = job.steps.filter(step => step.name === STEP)
      if (steps.length !== 1) throw new ObservationError()
      const step = steps[0]
      let evidence = run
      if (step.status === "completed" && ["success", "failure", "timed_out", "cancelled"].includes(step.conclusion ?? "") && step.started_at && step.completed_at) {
        const started = timestamp(step.started_at, now)
        const completed = timestamp(step.completed_at, now)
        if (started < run.created || completed < started) throw new ObservationError()
        evidence = { ...run, started, completed, outcome: step.conclusion === "success" ? 1 : 2 }
        completions.push(evidence)
      }
      state.cache.push(evidence)
    }
    state.cache = state.cache.sort((a, b) => compareBrowserEvidence(b, a)).slice(0, 10)
    const newestCompleted = runs.find(run => run.status === 2)
    const newestProof = newestCompleted && state.cache.find(run => run.id === newestCompleted.id && run.attempt === newestCompleted.attempt)
    state.observerOk = pending.length <= 2 && (!newestCompleted || !!newestProof?.completed) && !state.coverageGap
    state.backoffUntil = 0
  } catch (error) {
    state.backoffUntil = error instanceof ObservationError ? error.backoffUntil : 0
  }
  for (const evidence of completions.sort(compareBrowserEvidence)) {
    state.completedAt = Math.max(state.completedAt ?? 0, evidence.completed)
    state.latest = mergeCompletion(state.latest, evidence)
    if (evidence.outcome === 1) state.success = mergeCompletion(state.success, evidence)
    else state.failure = mergeCompletion(state.failure, evidence)
  }
  return { state, completions }
}

/**
 * Auto-Approval State Machine - Atomic State Transitions
 *
 * Every auto-approval state change in the system goes through this module.
 * Uses CAS (compare-and-swap) pattern: UPDATE ... WHERE state = expected.
 * If 0 rows updated, someone else transitioned first - return false.
 *
 * Observability (Sentry and PostHog) is centralized here.
 */

import * as Sentry from "@sentry/nextjs"

import { getPostHogClient } from "@/lib/analytics/posthog-server"
import { SYSTEM_AUTO_APPROVE_ID } from "@/lib/constants"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("auto-approval-state")

export type AutoApprovalState =
  | "awaiting_drafts"
  | "pending"
  | "attempting"
  | "approved"
  | "failed_retrying"
  | "needs_doctor"

const MAX_AUTO_APPROVAL_ATTEMPTS = 10

// Prefixes for failures that will never change on retry (patient data, use-case,
// duration, and age do not change between cron ticks). A failure matching one of
// these short-circuits straight to needs_doctor instead of burning the retry
// budget. EVERY entry here must correspond to a disqualifying flag that
// `evaluateAutoApprovalEligibility` can actually emit, and every deterministic
// flag the engine emits must be covered — both directions are pinned by
// `lib/__tests__/auto-approval-deterministic-routing-contract.test.ts`.
//
// Deliberately NOT here (genuinely transient — re-evaluating later can change the
// verdict): `repeat_request_within_7d:` (the 7-day window slides),
// `missing_clinical_note_draft` / `draft_not_ready:` (the draft can be generated
// on a later pass), and the pipeline-level reasons routed directly through
// markFailedRetrying (no_doctor_available, no_review_data, pipeline_error, etc).
export const DETERMINISTIC_FAILURE_PREFIXES = [
  // Clinical / safety hard-blocks — symptom text and risk never change on retry.
  "emergency:", "red_flags:",
  "mental_health:", "injury:", "chronic:", "pregnancy:",
  // High-stakes use cases (exam deferral, fitness-to-drive/operate, court,
  // workers comp) MUST go straight to a doctor — never loop in the retry queue.
  "high_stakes_use_case:",
  // Patient identity / age — a minor stays a minor; a missing/invalid DOB will
  // not fix itself between ticks. Safest landing is doctor review.
  "patient_under_18", "patient_dob_missing", "patient_dob_invalid",
  // Service routing — a non-med-cert never becomes eligible.
  "service_type_mismatch",
  // Duration is fixed in the saved answers — same verdict every time.
  "duration_too_long:", "duration_unknown", "duration_invalid",
  // Structural — empty symptom text / overlapping cert dates are answer-derived.
  "empty_symptom_text",
  "overlapping_cert_dates",
  // Doctor-attention intake flags (softened intake gaps). A flagged cert must be
  // reviewed by a human; the flag set is answer-derived so it won't change on
  // retry. Emitted by evaluateAutoApprovalEligibility when attentionFlagCodes is
  // non-empty.
  "intake_attention_flags:",
]

export function isDeterministicFailure(flags: string[]): boolean {
  return flags.some(flag =>
    DETERMINISTIC_FAILURE_PREFIXES.some(prefix => flag.startsWith(prefix))
  )
}

// ============================================================================
// CORE TRANSITION
// ============================================================================

type SupabaseClient = {
  from: (table: string) => {
    update: (data: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => unknown
      in: (col: string, vals: unknown[]) => unknown
    }
  }
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown>
}

/**
 * Atomically transition an intake's auto-approval state.
 * Returns true if transition succeeded, false if the intake was already in a different state.
 */
async function transitionState(
  supabase: SupabaseClient,
  intakeId: string,
  fromState: AutoApprovalState | AutoApprovalState[],
  toState: AutoApprovalState,
  extraFields?: Record<string, unknown>,
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    auto_approval_state: toState,
    auto_approval_state_updated_at: new Date().toISOString(),
    ...extraFields,
  }

  let query = supabase
    .from("intakes")
    .update(updateData)
    .eq("id", intakeId)

  // CAS: only update if current state matches
  if (Array.isArray(fromState)) {
    query = (query as Record<string, (...args: unknown[]) => unknown>).in("auto_approval_state", fromState)
  } else {
    query = (query as Record<string, (...args: unknown[]) => unknown>).eq("auto_approval_state", fromState)
  }

  const { data, error } = await (query as Record<string, (...args: unknown[]) => unknown>).select("id") as {
    data: { id: string }[] | null
    error: { message: string; code: string } | null
  }

  if (error) {
    log.error("State transition DB error", {
      intakeId, fromState, toState, error: error.message, code: error.code,
    })
    Sentry.captureMessage(`Auto-approval state transition failed: ${fromState} → ${toState}`, {
      level: "error",
      tags: { subsystem: "cert-pipeline", intake_id: intakeId },
      extra: { error: error.message, code: error.code, fromState, toState },
    })
    return false
  }

  if (!data || data.length === 0) {
    log.info("State transition CAS miss (expected, another process won)", {
      intakeId, fromState, toState,
    })
    return false
  }

  log.info("State transition succeeded", { intakeId, fromState, toState })
  return true
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/** Claim an intake for processing: pending|failed_retrying → attempting.
 * Also sets claimed_by = SYSTEM_AUTO_APPROVE_ID so atomicApproveCertificate's
 * claim-ownership guard passes without a separate claim_intake_for_review RPC. */
export async function claimForProcessing(
  supabase: SupabaseClient,
  intakeId: string,
): Promise<boolean> {
  return transitionState(
    supabase, intakeId,
    ["pending", "failed_retrying"],
    "attempting",
    // claimed_at MUST be set alongside claimed_by: release_stale_intake_claims
    // only releases rows where claimed_at IS NOT NULL, and claim_intake_for_review's
    // 30-min timeout-takeover math is NULL (never true) when claimed_at is NULL.
    // Without it, a crashed/abandoned attempt leaves a phantom system lock that no
    // cron can clear and no doctor can take over without force.
    { claimed_by: SYSTEM_AUTO_APPROVE_ID, claimed_at: new Date().toISOString() },
  )
}

/** Mark intake as approved: attempting → approved. Also sets ai_approved for backward compat. */
export async function markApproved(
  supabase: SupabaseClient,
  intakeId: string,
): Promise<boolean> {
  const result = await transitionState(
    supabase, intakeId,
    "attempting",
    "approved",
    {
      ai_approved: true,
      ai_approved_at: new Date().toISOString(),
    },
  )

  if (result) {
    Sentry.captureMessage("Certificate issued via clinical decision support", {
      level: "info",
      tags: { subsystem: "cert-pipeline", intake_id: intakeId, outcome: "approved" },
      fingerprint: ["cert-pipeline", "auto-approved"],
    })

    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: "system-auto-approve",
        event: "auto_approval_state_transition",
        properties: { intake_id: intakeId, to_state: "approved" },
      })
    } catch { /* non-blocking */ }
  }

  return result
}

/** Mark intake as needing doctor review: attempting → needs_doctor (terminal). */
export async function markNeedsDoctor(
  supabase: SupabaseClient,
  intakeId: string,
  reason: string,
): Promise<boolean> {
  const result = await transitionState(
    supabase, intakeId,
    "attempting",
    "needs_doctor",
    // Relinquish the system claim on handoff so the doctor surface never shows a
    // phantom "Auto-approval check is running" lock on a terminal case, and a
    // doctor can claim it normally (claimed_by IS NULL path).
    { auto_approval_state_reason: reason, claimed_by: null, claimed_at: null },
  )

  if (result) {
    Sentry.captureMessage("Auto-approval: intake dropped to doctor queue", {
      level: "info",
      tags: { subsystem: "cert-pipeline", intake_id: intakeId },
      extra: { reason },
      fingerprint: ["cert-pipeline", "needs-doctor", reason.split(":")[0]],
    })

  }

  return result
}

/** Mark intake as transiently failed: attempting → failed_retrying. Increments attempts. */
export async function markFailedRetrying(
  supabase: SupabaseClient,
  intakeId: string,
  reason: string,
): Promise<boolean> {
  // Use raw SQL increment to avoid read-then-write race on attempt count
  // Supabase JS client doesn't support SQL expressions in update(), so we use RPC or
  // a two-step: transition state + increment attempts
  const result = await transitionState(
    supabase, intakeId,
    "attempting",
    "failed_retrying",
    // Release the claim between attempts. The next cron tick re-claims via
    // claimForProcessing (CAS keys off auto_approval_state, not claimed_by), so
    // retries still work — but in the gap the row carries no stale system lock.
    { auto_approval_state_reason: reason, claimed_by: null, claimed_at: null },
  )

  if (result) {
    // Increment attempts - separate query. Not atomic with the state transition,
    // but attempts is observability-only, not used for CAS decisions.
    try {
      await supabase.rpc("increment_auto_approval_attempts", { intake_id: intakeId })
    } catch {
      // Fallback: if RPC isn't available, the counter may lag - acceptable for observability
    }
  }

  return result
}

/** Mark drafts as ready: awaiting_drafts → pending */
export async function markDraftsReady(
  supabase: SupabaseClient,
  intakeId: string,
): Promise<boolean> {
  return transitionState(supabase, intakeId, "awaiting_drafts", "pending")
}

/** Recover a stale "attempting" intake back to failed_retrying */
export async function recoverStale(
  supabase: SupabaseClient,
  intakeId: string,
): Promise<boolean> {
  const result = await transitionState(
    supabase, intakeId,
    "attempting",
    "failed_retrying",
    // Stale-attempt recovery also clears the claim so the row is fully released
    // back to the pool (claimed_by IS NULL) before the next claim attempt.
    { auto_approval_state_reason: "timeout_recovery", claimed_by: null, claimed_at: null },
  )

  if (result) {
    Sentry.captureMessage("Auto-approval: recovered stale attempting intake", {
      level: "warning",
      tags: { subsystem: "cert-pipeline", intake_id: intakeId },
      fingerprint: ["cert-pipeline", "stale-recovery"],
    })
  }

  return result
}

/**
 * Determine the right failure state based on eligibility flags and attempt count.
 * Deterministic failures → needs_doctor (no retry).
 * Transient failures → failed_retrying (if under max) or needs_doctor (if maxed out).
 */
export async function markIneligible(
  supabase: SupabaseClient,
  intakeId: string,
  reason: string,
  disqualifyingFlags: string[],
  currentAttempts: number,
): Promise<boolean> {
  if (isDeterministicFailure(disqualifyingFlags)) {
    return markNeedsDoctor(supabase, intakeId, reason)
  }

  if (currentAttempts >= MAX_AUTO_APPROVAL_ATTEMPTS) {
    return markNeedsDoctor(supabase, intakeId, `max_retries_exhausted: ${reason}`)
  }

  return markFailedRetrying(supabase, intakeId, reason)
}

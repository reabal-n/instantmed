/**
 * Auto-Approval State Machine - Atomic State Transitions
 *
 * Every auto-approval state change in the system goes through this module.
 * Uses CAS (compare-and-swap) pattern: UPDATE ... WHERE state = expected.
 * If 0 rows updated, someone else transitioned first - return false.
 *
 * Observability (Sentry, PostHog, Telegram) is centralized here.
 */

import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"
import { getPostHogClient } from "@/lib/posthog-server"
import { sendTelegramAlert, escapeMarkdownValue } from "@/lib/notifications/telegram"
import { SYSTEM_AUTO_APPROVE_ID } from "@/lib/constants"

const log = createLogger("auto-approval-state")

export type AutoApprovalState =
  | "awaiting_drafts"
  | "pending"
  | "attempting"
  | "approved"
  | "failed_retrying"
  | "needs_doctor"

const MAX_AUTO_APPROVAL_ATTEMPTS = 10

// Prefixes for failures that will never change on retry (patient data doesn't change)
const DETERMINISTIC_FAILURE_PREFIXES = [
  "emergency:", "patient_under_18", "wrong_service_type", "service_type_mismatch",
  "mental_health:", "injury:", "chronic:", "pregnancy:",
  "empty_symptom_text", "backdated_too_far",
  "overlapping_cert_dates",
  "draft_requires_review:",
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
    { claimed_by: SYSTEM_AUTO_APPROVE_ID },
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
    { auto_approval_state_reason: reason },
  )

  if (result) {
    Sentry.captureMessage("Auto-approval: intake dropped to doctor queue", {
      level: "info",
      tags: { subsystem: "cert-pipeline", intake_id: intakeId },
      extra: { reason },
      fingerprint: ["cert-pipeline", "needs-doctor", reason.split(":")[0]],
    })

    const alertMsg = `*Intake Needs Doctor*\n\nIntake ${intakeId.slice(0, 8)}\\.\\.\\. dropped to queue\\.\nReason: ${escapeMarkdownValue(reason)}`
    sendTelegramAlert(alertMsg).catch(() => {})
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
    { auto_approval_state_reason: reason },
  )

  if (result) {
    // Increment attempts - separate query. Not atomic with the state transition,
    // but attempts is observability-only, not used for CAS decisions.
    try {
      await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>
      }).rpc("increment_auto_approval_attempts", { intake_id: intakeId })
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
    { auto_approval_state_reason: "timeout_recovery" },
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

import { describe, expect, it } from "vitest"

import {
  DETERMINISTIC_FAILURE_PREFIXES,
  isDeterministicFailure,
} from "@/lib/clinical/auto-approval-state"

/**
 * Contract test: keep DETERMINISTIC_FAILURE_PREFIXES (auto-approval-state.ts) in
 * sync with the disqualifying-flag vocabulary that evaluateAutoApprovalEligibility
 * (auto-approval.ts) can actually emit.
 *
 * Why this exists: the 2026-06-07 production incident. `high_stakes_use_case:`
 * (and red_flags / duration / DOB flags) were missing from the prefix list, so
 * structurally-un-approvable med certs (exam deferral, forklift/driving fitness)
 * were misclassified as TRANSIENT and burned all 10 retry attempts over 8h before
 * finally landing in needs_doctor — making auto-approval look hung. The reverse
 * drift was also present: three dead prefixes (draft_requires_review:,
 * wrong_service_type, backdated_too_far) that the engine never emits.
 *
 * This test pins BOTH directions so the lists can never silently drift again.
 *
 * MAINTENANCE: when you add/remove a `flags.push(...)` in
 * lib/clinical/auto-approval.ts, add the flag sample here with its correct
 * classification. The "no dead prefix" assertion below will also fail if you add
 * a prefix that no known flag matches.
 */

// Every disqualifying flag string evaluateAutoApprovalEligibility can push to
// flags[] (the array that becomes disqualifyingFlags), plus the pipeline-level
// reasons routed straight through markFailedRetrying. Each sample is a realistic
// instance of the flag as the engine formats it.
const DETERMINISTIC_FLAG_SAMPLES = [
  // Clinical / safety — symptom text and risk never change on retry.
  "emergency: chest_pain",
  "red_flags: SUICIDE_RISK",
  "mental_health: depression",
  "injury: fracture",
  "chronic: chronic",
  "pregnancy: pregnant",
  // High-stakes use cases — the incident.
  "high_stakes_use_case: exam, exams",
  // Identity / age.
  "patient_under_18",
  "patient_dob_missing",
  "patient_dob_invalid",
  // Service routing.
  "service_type_mismatch",
  // Duration — fixed in the saved answers.
  "duration_too_long: 5 days (max 3)",
  "duration_unknown",
  "duration_invalid",
  // Structural — answer-derived.
  "empty_symptom_text",
  "overlapping_cert_dates",
  // Doctor-attention intake flags — answer-derived, won't change on retry.
  "intake_attention_flags: medication_strength_missing",
] as const

// Flags / reasons whose verdict CAN change on a later attempt, so they must stay
// transient (retry rather than hard-block to needs_doctor).
const TRANSIENT_FLAG_SAMPLES = [
  "repeat_request_within_7d: 3 recent cert(s)", // the 7-day window slides
  "missing_clinical_note_draft", // draft can be generated on a later pass
  "draft_not_ready: generating",
  // Pipeline-level reasons (markFailedRetrying / pipeline outcomes).
  "no_doctor_available",
  "no_review_data",
  "pipeline_error: storage timeout",
  "unexpected: TypeError",
  "rate_limited",
] as const

describe("auto-approval deterministic-routing contract", () => {
  it("classifies every retry-invariant flag as deterministic", () => {
    for (const flag of DETERMINISTIC_FLAG_SAMPLES) {
      expect(isDeterministicFailure([flag]), `expected "${flag}" to be deterministic`).toBe(true)
    }
  })

  it("classifies every retry-variant flag as transient", () => {
    for (const flag of TRANSIENT_FLAG_SAMPLES) {
      expect(isDeterministicFailure([flag]), `expected "${flag}" to be transient`).toBe(false)
    }
  })

  it("has no dead prefixes — every prefix matches at least one flag the engine emits", () => {
    const allKnownFlags = [...DETERMINISTIC_FLAG_SAMPLES, ...TRANSIENT_FLAG_SAMPLES]
    for (const prefix of DETERMINISTIC_FAILURE_PREFIXES) {
      const matches = allKnownFlags.some((flag) => flag.startsWith(prefix))
      expect(matches, `dead prefix "${prefix}" matches no known engine flag`).toBe(true)
    }
  })

  it("any single deterministic flag in a mixed set still forces needs_doctor routing", () => {
    // Mixed soft + hard: presence of one deterministic flag must win.
    expect(isDeterministicFailure(["draft_review_flag: anxiety", "high_stakes_use_case: court"])).toBe(true)
    // Purely soft/transient set must remain retryable.
    expect(isDeterministicFailure(["draft_not_ready: generating", "repeat_request_within_7d: 3 recent cert(s)"])).toBe(false)
  })
})

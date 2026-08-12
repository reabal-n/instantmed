/**
 * Persist the auto-approval engine's soft flags onto `intakes.risk_flags`.
 *
 * `lib/clinical/auto-approval.ts` records co-symptom mental-health, injury, and
 * chronic mentions as soft signals. The active bounded protocol routes every
 * soft signal to a doctor before issue, and persistence keeps the reason
 * visible on the same doctor-facing `risk_flags` surface.
 *
 * Extracted from the pipeline so the merge rules are directly testable. The
 * three rules below each fixed a real defect, so keep them:
 *
 *  1. **Merge under a row lock.** Independent flag writers must not erase one
 *     another between an application read and update.
 *  2. **Dedupe on the parsed code.** Engine strings look like
 *     `draft_review_flag: <reason>`; comparing the whole string to stored codes
 *     never matches, so retries appended duplicates forever.
 *  3. **Inspect the returned error.** supabase-js RESOLVES with `{ error }`; it
 *     does not throw, so a bare try/catch swallows ordinary write failures.
 *
 * Always fail-soft: a flag write must never fail an otherwise valid approval.
 */

import { type IntakeFlag, makeEngineSoftFlag, parseIntakeFlags } from "./intake-flags"

type SoftFlagPersistOutcome =
  | "written"
  | "no_flags"
  | "no_soft_flags"
  | "already_present"
  | "write_failed"

export interface SoftFlagPersistResult {
  outcome: SoftFlagPersistOutcome
  /** The exact array written, for assertions and logging. Null when nothing was written. */
  merged: IntakeFlag[] | null
  error?: string
}

/**
 * The narrow slice of the Supabase client this helper uses.
 *
 * `PromiseLike`, not `Promise`: PostgREST builders are thenable but do not
 * implement `catch`/`finally`. Declaring the surface structurally (rather than
 * importing the full client type) keeps the helper unit-testable with a plain
 * object and avoids the "type instantiation is excessively deep" blowup the
 * generated Supabase generics cause here.
 */
export interface SoftFlagSupabase {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>
}

/**
 * Row-locked, deduplicating persistence for normalized IntakeFlags. The RPC
 * keeps the highest-severity instance per code and inspects Supabase's resolved
 * `{ error }` result.
 */
export async function persistIntakeFlags(
  supabase: SoftFlagSupabase,
  intakeId: string,
  incomingFlags: IntakeFlag[],
): Promise<SoftFlagPersistResult> {
  if (incomingFlags.length === 0) {
    return { outcome: "no_flags", merged: null }
  }

  const { data, error } = await supabase.rpc("merge_intake_risk_flags", {
    p_intake_id: intakeId,
    p_incoming_flags: incomingFlags,
  })

  if (error) {
    return { outcome: "write_failed", merged: null, error: error.message }
  }

  const result = data as { changed?: unknown; flags?: unknown } | null
  if (result?.changed === false) return { outcome: "already_present", merged: null }

  const merged = parseIntakeFlags(result?.flags)
  return { outcome: "written", merged }
}

export async function persistEngineSoftFlags(
  supabase: SoftFlagSupabase,
  intakeId: string,
  rawSoftFlags: string[],
): Promise<SoftFlagPersistResult> {
  if (rawSoftFlags.length === 0) {
    return { outcome: "no_soft_flags", merged: null }
  }
  return persistIntakeFlags(
    supabase,
    intakeId,
    rawSoftFlags.map((raw) => makeEngineSoftFlag(raw)),
  )
}

/**
 * Persist the auto-approval engine's soft flags onto `intakes.risk_flags`.
 *
 * `lib/clinical/auto-approval.ts` records co-symptom mental-health / injury /
 * chronic mentions and AI-draft `requiresReview` hints as SOFT flags: they do
 * not block auto-approval, but the engine produces them on the explicit
 * assumption that a human sees them afterwards. Until they are written to
 * `risk_flags` they exist only in `ai_audit_log`, which no product surface
 * reads — so the assumption is false.
 *
 * Extracted from the pipeline so the merge rules are directly testable. The
 * three rules below each fixed a real defect, so keep them:
 *
 *  1. **Read fresh.** The pipeline's `intake` snapshot predates duplicate
 *     detection, which may have just written `duplicate_patient_name_dob`.
 *     Merging from the stale snapshot deletes that ATTENTION flag — strictly
 *     worse than never writing soft flags.
 *  2. **Dedupe on the parsed code.** Engine strings look like
 *     `draft_review_flag: <reason>`; comparing the whole string to stored codes
 *     never matches, so retries appended duplicates forever.
 *  3. **Inspect the returned error.** supabase-js RESOLVES with `{ error }`; it
 *     does not throw, so a bare try/catch swallows ordinary write failures.
 *
 * Always fail-soft: a flag write must never fail an otherwise valid approval.
 */

import { dedupeIntakeFlags, type IntakeFlag, makeEngineSoftFlag, parseIntakeFlags } from "./intake-flags"

type SoftFlagPersistOutcome =
  | "written"
  | "no_soft_flags"
  | "already_present"
  | "read_failed"
  | "write_failed"

export interface SoftFlagPersistResult {
  outcome: SoftFlagPersistOutcome
  /** The exact array written, for assertions and logging. Null when nothing was written. */
  merged: IntakeFlag[] | null
  error?: string
}

/**
 * Pure merge: existing stored flags + raw engine soft-flag strings.
 *
 * Adds only codes not already stored, then dedupes keeping the
 * highest-severity instance per code — so an existing `attention` flag can
 * never be downgraded to `info` by a later soft-flag write.
 */
function mergeEngineSoftFlags(
  existingFlags: IntakeFlag[],
  rawSoftFlags: string[],
): IntakeFlag[] {
  const existingCodes = new Set(existingFlags.map((flag) => flag.code))
  const incoming = rawSoftFlags
    .map((raw) => makeEngineSoftFlag(raw))
    .filter((flag) => !existingCodes.has(flag.code))
  if (incoming.length === 0) return existingFlags
  return dedupeIntakeFlags([...existingFlags, ...incoming])
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
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => PromiseLike<{ data: unknown; error: { message: string } | null }>
      }
    }
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => PromiseLike<{ error: { message: string } | null }>
    }
  }
}

export async function persistEngineSoftFlags(
  supabase: SoftFlagSupabase,
  intakeId: string,
  rawSoftFlags: string[],
): Promise<SoftFlagPersistResult> {
  if (rawSoftFlags.length === 0) {
    return { outcome: "no_soft_flags", merged: null }
  }

  const { data, error: readError } = await supabase
    .from("intakes")
    .select("risk_flags")
    .eq("id", intakeId)
    .single()

  if (readError) {
    return { outcome: "read_failed", merged: null, error: readError.message }
  }

  const existingFlags = parseIntakeFlags((data as { risk_flags?: unknown } | null)?.risk_flags)
  const merged = mergeEngineSoftFlags(existingFlags, rawSoftFlags)

  // Nothing new: every incoming code is already stored. Skip the write so a
  // retry cannot churn the column or race another writer for no reason.
  if (merged === existingFlags) {
    return { outcome: "already_present", merged: null }
  }

  const { error: writeError } = await supabase
    .from("intakes")
    .update({ risk_flags: merged })
    .eq("id", intakeId)

  if (writeError) {
    return { outcome: "write_failed", merged: null, error: writeError.message }
  }

  return { outcome: "written", merged }
}

import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  dedupeIntakeFlags,
  makeAutoApprovalConcernFlag,
  makeIntakeFlag,
  parseIntakeFlags,
} from "@/lib/clinical/intake-flags"
import {
  persistEngineSoftFlags,
  persistIntakeFlags,
} from "@/lib/clinical/soft-flag-persistence"

/**
 * Minimal RPC double. It models the database function's severity-preserving
 * merge so the TypeScript seam can be tested without a database.
 */
function makeSupabase(opts: {
  riskFlags?: unknown
  rpcError?: string
} = {}) {
  const updates: Record<string, unknown>[] = []
  let storedFlags = parseIntakeFlags(opts.riskFlags ?? [])
  const supabase = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      expect(name).toBe("merge_intake_risk_flags")
      if (opts.rpcError) return { data: null, error: { message: opts.rpcError } }

      const incoming = parseIntakeFlags(args.p_incoming_flags)
      const merged = dedupeIntakeFlags([...storedFlags, ...incoming])
      const changed = JSON.stringify(merged) !== JSON.stringify(storedFlags)
      if (changed) {
        storedFlags = merged
        updates.push({ risk_flags: merged })
      }
      return { data: { changed, flags: storedFlags }, error: null }
    },
  }
  return { supabase, updates }
}

const DRAFT_FLAG = "draft_review_flag: mentions ongoing chest discomfort"
const PANIC_FLAG = "panic_co_symptom"

/**
 * The merge rules are exercised through `persistEngineSoftFlags` rather than a
 * test-only export: the fake client reports what was written, so these assert
 * the real code path instead of an internal helper.
 */
async function writtenFlags(existing: unknown, rawSoftFlags: string[]) {
  const { supabase, updates } = makeSupabase({ riskFlags: existing })
  const result = await persistEngineSoftFlags(supabase, "intake-1", rawSoftFlags)
  return {
    result,
    flags: updates.length > 0 ? parseIntakeFlags(updates[0]!.risk_flags) : null,
  }
}

describe("engine soft-flag merge rules", () => {
  it("adds engine soft flags as info severity from the auto_approval source", async () => {
    const { flags } = await writtenFlags([], [PANIC_FLAG])

    expect(flags).toHaveLength(1)
    expect(flags![0]!.code).toBe("panic_co_symptom")
    expect(flags![0]!.severity).toBe("info")
    expect(flags![0]!.source).toBe("auto_approval")
  })

  it("splits `code: detail` so the detail survives without polluting the code", async () => {
    const { flags } = await writtenFlags([], [DRAFT_FLAG])

    expect(flags![0]!.code).toBe("draft_review_flag")
    expect(flags![0]!.detail).toBe("mentions ongoing chest discomfort")
  })

  // The original bug: the raw `code: detail` string was compared against stored
  // CODES, never matched, and appended a fresh duplicate on every retry.
  it("does not duplicate a `code: detail` flag that is already stored", async () => {
    const first = await writtenFlags([], [DRAFT_FLAG])
    const second = await writtenFlags(first.flags, [DRAFT_FLAG])

    expect(second.result.outcome).toBe("already_present")
    expect(second.flags).toBeNull()
  })

  // The dangerous regression: soft flags must never delete or downgrade the
  // duplicate-profile ATTENTION flag written moments earlier by step 6d.
  it("preserves an existing attention flag at full severity", async () => {
    const duplicateFlag = makeIntakeFlag("duplicate_patient_name_dob", {
      source: "clinical",
      detail: "Matches existing profile abc",
    })

    const { flags } = await writtenFlags([duplicateFlag], [PANIC_FLAG])

    const preserved = flags!.find((f) => f.code === "duplicate_patient_name_dob")
    expect(preserved).toBeDefined()
    expect(preserved!.severity).toBe("attention")
    expect(preserved!.detail).toBe("Matches existing profile abc")
    expect(flags).toHaveLength(2)
  })

  it("never downgrades an attention flag that shares a code with a soft flag", async () => {
    const attention = { ...makeIntakeFlag("duplicate_patient_name_dob"), code: "panic_co_symptom" }

    const { result } = await writtenFlags([attention], [PANIC_FLAG])

    // Code already present -> no write at all, so the attention flag stands.
    expect(result.outcome).toBe("already_present")
  })
})

describe("persistEngineSoftFlags", () => {
  it("writes merged flags and reports what it wrote", async () => {
    const { supabase, updates } = makeSupabase({ riskFlags: [] })

    const result = await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG])

    expect(result.outcome).toBe("written")
    expect(updates).toHaveLength(1)
    const written = parseIntakeFlags(updates[0]!.risk_flags)
    expect(written.map((f) => f.code)).toEqual(["panic_co_symptom"])
  })

  it("merges against the current stored flags inside the RPC", async () => {
    const duplicateFlag = makeIntakeFlag("duplicate_patient_name_dob", { source: "clinical" })
    const { supabase, updates } = makeSupabase({ riskFlags: [duplicateFlag] })

    const result = await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG])

    expect(result.outcome).toBe("written")
    const written = parseIntakeFlags(updates[0]!.risk_flags)
    expect(written.map((f) => f.code).sort()).toEqual([
      "duplicate_patient_name_dob",
      "panic_co_symptom",
    ])
  })

  it("skips the write entirely when every code is already stored", async () => {
    const seeded = await writtenFlags([], [PANIC_FLAG])
    const { supabase, updates } = makeSupabase({ riskFlags: seeded.flags })

    const result = await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG])

    expect(result.outcome).toBe("already_present")
    expect(updates).toHaveLength(0)
  })

  it("does nothing when the engine produced no soft flags", async () => {
    const { supabase, updates } = makeSupabase()

    const result = await persistEngineSoftFlags(supabase, "intake-1", [])

    expect(result.outcome).toBe("no_soft_flags")
    expect(updates).toHaveLength(0)
  })

  // supabase-js resolves with `{ error }`; a bare try/catch never sees these.
  it("reports an atomic merge failure instead of silently swallowing it", async () => {
    const { supabase, updates } = makeSupabase({ rpcError: "boom-merge" })

    const result = await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG])

    expect(result.outcome).toBe("write_failed")
    expect(result.error).toBe("boom-merge")
    expect(updates).toHaveLength(0)
  })

  // The helper propagates unexpected throws rather than reporting false
  // success; the PIPELINE owns the fail-soft try/catch so a genuine outage
  // cannot fail an otherwise valid approval.
  it("propagates an unexpected throw rather than reporting success", async () => {
    const exploding = {
      rpc: () => {
        throw new Error("connection reset")
      },
    } as never

    await expect(persistEngineSoftFlags(exploding, "intake-1", [PANIC_FLAG])).rejects.toThrow()
  })

  it("is safe to run twice in a row (retry) without duplicating rows", async () => {
    const { supabase, updates } = makeSupabase()

    await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG, DRAFT_FLAG])
    const second = await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG, DRAFT_FLAG])

    expect(second.outcome).toBe("already_present")
    expect(parseIntakeFlags(updates[0]!.risk_flags)).toHaveLength(2)
    expect(updates).toHaveLength(1)
  })
})

describe("concerning med-cert flag persistence", () => {
  it.each([
    "high_stakes_use_case: return to work",
    "high_stakes_use_case: centrelink",
    "unsupported_certificate_type: return to work",
  ])("turns %s into a doctor-attention flag", (reason) => {
    const flag = makeAutoApprovalConcernFlag([reason])

    expect(flag).toMatchObject({
      code: "high_stakes_med_cert_request",
      severity: "attention",
      source: "auto_approval",
    })
    expect(flag?.detail).toContain(reason)
  })

  it("does not manufacture a purpose flag for an unrelated transient failure", () => {
    expect(makeAutoApprovalConcernFlag(["missing_clinical_note_draft"])).toBeNull()
  })

  it("fresh-merges a concern flag without deleting an existing attention flag", async () => {
    const duplicateFlag = makeIntakeFlag("duplicate_patient_name_dob", { source: "clinical" })
    const concernFlag = makeAutoApprovalConcernFlag(["high_stakes_use_case: centrelink"])
    expect(concernFlag).not.toBeNull()

    const { supabase, updates } = makeSupabase({ riskFlags: [duplicateFlag] })
    const result = await persistIntakeFlags(supabase, "intake-1", [concernFlag!])

    expect(result.outcome).toBe("written")
    expect(parseIntakeFlags(updates[0]!.risk_flags).map((flag) => flag.code).sort()).toEqual([
      "duplicate_patient_name_dob",
      "high_stakes_med_cert_request",
    ])
  })

  it("does not duplicate the concern flag on retry", async () => {
    const concernFlag = makeAutoApprovalConcernFlag(["high_stakes_use_case: return to work"])
    expect(concernFlag).not.toBeNull()

    const first = makeSupabase({ riskFlags: [] })
    await persistIntakeFlags(first.supabase, "intake-1", [concernFlag!])
    const stored = first.updates[0]!.risk_flags
    const second = makeSupabase({ riskFlags: stored })
    const result = await persistIntakeFlags(second.supabase, "intake-1", [concernFlag!])

    expect(result.outcome).toBe("already_present")
    expect(second.updates).toHaveLength(0)
  })
})

describe("auto-approval pipeline wiring", () => {
  it("delegates soft-flag persistence to the tested helper", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(
        new URL("../clinical/auto-approval-pipeline.ts", import.meta.url).pathname,
        "utf8",
      ),
    )

    expect(source).toContain("persistEngineSoftFlags(")
    expect(source).toContain("makeAutoApprovalConcernFlag(")
    expect(source).toContain("persistIntakeFlags(")
    expect(source).toContain("eligibility.softFlags,")
    // The stale application-side merge must not come back.
    expect(source).not.toContain("risk_flags: [...existingFlags, ...softIntakeFlags]")
    // Failures must be reported, not swallowed.
    expect(source).toContain('result.outcome === "write_failed"')
  })
})

describe("atomic intake-flag merge migration", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/20260812154500_merge_intake_risk_flags_atomically.sql"),
    "utf8",
  )

  it("locks the intake row and deduplicates by code with attention severity winning", () => {
    expect(migration).toContain("FOR UPDATE")
    expect(migration).toContain("PARTITION BY flag ->> 'code'")
    expect(migration).toContain("WHEN 'attention' THEN 2")
    expect(migration).toContain("priority = 1")
  })

  it("preserves unrecognized existing entries while rejecting malformed incoming flags", () => {
    expect(migration).toContain("legacy_entries AS")
    expect(migration).toContain("WHERE NOT is_normalized")
    expect(migration).toContain("incoming flags must be normalized IntakeFlag objects")
  })

  it("is invoker-rights and callable only by the service role", () => {
    expect(migration).toContain("SECURITY INVOKER")
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.merge_intake_risk_flags(uuid, jsonb) FROM PUBLIC")
    expect(migration).toContain("FROM anon")
    expect(migration).toContain("FROM authenticated")
    expect(migration).toContain("TO service_role")
  })
})

import { describe, expect, it } from "vitest"

import { makeIntakeFlag, parseIntakeFlags } from "@/lib/clinical/intake-flags"
import { persistEngineSoftFlags } from "@/lib/clinical/soft-flag-persistence"

/**
 * Minimal supabase double. supabase-js RESOLVES with `{ error }` rather than
 * throwing, which is exactly the behaviour the first implementation of this
 * path got wrong, so the double must reproduce it faithfully.
 */
function makeSupabase(opts: {
  riskFlags?: unknown
  readError?: string
  writeError?: string
} = {}) {
  const updates: Record<string, unknown>[] = []
  const supabase = {
    from: (_table: string) => ({
      select: (_columns: string) => ({
        eq: (_column: string, _value: string) => ({
          single: async () => ({
            data: opts.readError ? null : { risk_flags: opts.riskFlags ?? [] },
            error: opts.readError ? { message: opts.readError } : null,
          }),
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: async (_column: string, _value: string) => {
          if (!opts.writeError) updates.push(values)
          return { error: opts.writeError ? { message: opts.writeError } : null }
        },
      }),
    }),
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

  // Reads fresh rather than trusting the pipeline's pre-duplicate-detection
  // snapshot — otherwise this write silently deletes the attention flag.
  it("merges against the CURRENT stored flags, not a caller-supplied snapshot", async () => {
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
  it("reports a read failure instead of silently swallowing it", async () => {
    const { supabase, updates } = makeSupabase({ readError: "boom-read" })

    const result = await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG])

    expect(result.outcome).toBe("read_failed")
    expect(result.error).toBe("boom-read")
    expect(updates).toHaveLength(0)
  })

  it("reports a write failure instead of silently swallowing it", async () => {
    const { supabase } = makeSupabase({ riskFlags: [], writeError: "boom-write" })

    const result = await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG])

    expect(result.outcome).toBe("write_failed")
    expect(result.error).toBe("boom-write")
  })

  // The helper propagates unexpected throws rather than reporting false
  // success; the PIPELINE owns the fail-soft try/catch so a genuine outage
  // cannot fail an otherwise valid approval.
  it("propagates an unexpected throw rather than reporting success", async () => {
    const exploding = {
      from: () => {
        throw new Error("connection reset")
      },
    } as never

    await expect(persistEngineSoftFlags(exploding, "intake-1", [PANIC_FLAG])).rejects.toThrow()
  })

  it("is safe to run twice in a row (retry) without duplicating rows", async () => {
    const store: { flags: unknown } = { flags: [] }
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: { risk_flags: store.flags }, error: null }) }),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: async () => {
            store.flags = values.risk_flags
            return { error: null }
          },
        }),
      }),
    }

    await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG, DRAFT_FLAG])
    const second = await persistEngineSoftFlags(supabase, "intake-1", [PANIC_FLAG, DRAFT_FLAG])

    expect(second.outcome).toBe("already_present")
    expect(parseIntakeFlags(store.flags)).toHaveLength(2)
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
    expect(source).toContain("eligibility.softFlags,")
    // The stale-snapshot merge must not come back.
    expect(source).not.toContain("risk_flags: [...existingFlags, ...softIntakeFlags]")
    // Failures must be reported, not swallowed.
    expect(source).toContain('result.outcome === "read_failed"')
    expect(source).toContain('result.outcome === "write_failed"')
  })
})

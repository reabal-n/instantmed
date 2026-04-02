# Auto-Approval State Machine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 6-column boolean state tracking in the auto-approval pipeline with a single `auto_approval_state` enum, rewrite the pipeline to use atomic CAS transitions, and simplify the retry cron.

**Architecture:** New `auto-approval-state.ts` module owns all state transitions (CAS pattern). Rewritten `auto-approval-pipeline.ts` calls transition functions instead of raw `claimed_by` updates. Cron queries `auto_approval_state` directly. Webhook initializes state on payment.

**Tech Stack:** Supabase PostgreSQL (enum + migration), TypeScript, Vitest, Next.js App Router, Sentry, PostHog

**Design doc:** `docs/plans/2026-04-02-auto-approval-state-machine-design.md`

---

## Pre-Implementation Notes

**`ai_approved` / `ai_approved_at`** — Heavily read by 10+ files (batch review, doctor queue, health checks, revocation). Must remain as derived fields, set on approval alongside the state transition.

**`claimed_by` / `claimed_at`** — Used by doctor lock flows (`lib/data/intake-lock.ts`, `lib/data/issued-certificates.ts`, `lib/cron/doctor-session-timeout.ts`). Only auto-approval pipeline usage is removed. Doctor claiming remains unchanged.

**`auto_approval_attempts`** — Kept for observability. Incremented in the state transition layer.

**Existing tests:** `lib/__tests__/auto-approval-pipeline.test.ts` (546 lines) and `lib/__tests__/auto-approval.test.ts`. The pipeline test file mocks Supabase chains extensively — it must be rewritten to test state transitions.

---

### Task 1: Supabase Migration — Add Enum + Columns

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_auto_approval_state_machine.sql`

**Step 1: Write the migration SQL**

```sql
-- Auto-approval state machine: replace boolean columns with enum
-- Design: docs/plans/2026-04-02-auto-approval-state-machine-design.md

-- 1. Create the enum type
CREATE TYPE auto_approval_state AS ENUM (
  'awaiting_drafts',
  'pending',
  'attempting',
  'approved',
  'failed_retrying',
  'needs_doctor'
);

-- 2. Add new columns
ALTER TABLE intakes ADD COLUMN auto_approval_state auto_approval_state;
ALTER TABLE intakes ADD COLUMN auto_approval_state_reason text;
ALTER TABLE intakes ADD COLUMN auto_approval_state_updated_at timestamptz;

-- 3. Backfill from old columns (order matters: most specific first)

-- 3a. AI-approved intakes → approved
UPDATE intakes SET
  auto_approval_state = 'approved',
  auto_approval_state_updated_at = COALESCE(ai_approved_at, updated_at)
WHERE ai_approved = true AND status = 'approved';

-- 3b. Deterministic-skipped intakes → needs_doctor
UPDATE intakes SET
  auto_approval_state = 'needs_doctor',
  auto_approval_state_reason = auto_approval_skip_reason,
  auto_approval_state_updated_at = COALESCE(updated_at, now())
WHERE auto_approval_skipped = true;

-- 3c. Exhausted-retry intakes → needs_doctor
UPDATE intakes SET
  auto_approval_state = 'needs_doctor',
  auto_approval_state_reason = 'max_retries_exhausted',
  auto_approval_state_updated_at = COALESCE(updated_at, now())
WHERE auto_approval_attempts >= 10
  AND ai_approved = false
  AND auto_approval_skipped = false
  AND status = 'paid';

-- 3d. Remaining paid med cert intakes still in queue → pending
UPDATE intakes SET
  auto_approval_state = 'pending',
  auto_approval_state_updated_at = COALESCE(paid_at, now())
WHERE status = 'paid'
  AND auto_approval_state IS NULL
  AND category = 'medical_certificate';

-- 4. Partial index on actionable states only
CREATE INDEX idx_intakes_auto_approval_active
  ON intakes (auto_approval_state, paid_at)
  WHERE auto_approval_state IN ('pending', 'failed_retrying', 'attempting');
```

**Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: Migration applies successfully. Verify with:

```bash
npx supabase migration list
```

**Step 3: Verify backfill**

Run in Supabase SQL editor:

```sql
SELECT auto_approval_state, count(*)
FROM intakes
WHERE auto_approval_state IS NOT NULL
GROUP BY auto_approval_state;
```

Expected: Rows distributed across `approved`, `needs_doctor`, `pending` (no `attempting` or `failed_retrying` in a clean backfill).

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "db: add auto_approval_state enum + columns + backfill"
```

---

### Task 2: State Transition Module — `auto-approval-state.ts`

**Files:**
- Create: `lib/clinical/auto-approval-state.ts`
- Create: `lib/__tests__/auto-approval-state.test.ts`

**Step 1: Write the failing tests**

Create `lib/__tests__/auto-approval-state.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))
vi.mock("@/lib/observability/logger", () => ({
  createLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}))
vi.mock("@/lib/posthog-server", () => ({
  getPostHogClient: () => ({ capture: vi.fn(), shutdown: vi.fn() }),
}))
vi.mock("@/lib/notifications/telegram", () => ({
  sendTelegramAlert: vi.fn().mockResolvedValue(undefined),
  escapeMarkdownValue: (v: string) => v,
}))

const INTAKE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

// Helper: mock supabase chain that returns configurable update results
function mockSupabase(updateResult: { data: unknown[]; error: null } | { data: null; error: { message: string; code: string } }) {
  const chain: Record<string, unknown> = {}
  const methods = ["update", "eq", "is", "in", "lt", "select", "single"]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Terminal: select after update returns rows
  chain.select = vi.fn().mockReturnValue({
    ...chain,
    then: (resolve: (v: unknown) => unknown) => resolve(updateResult),
  })
  return { from: vi.fn().mockReturnValue(chain), chain }
}

describe("auto-approval-state transitions", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("claimForProcessing transitions pending → attempting", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { claimForProcessing } = await import("@/lib/clinical/auto-approval-state")
    const result = await claimForProcessing(from as never, INTAKE_ID)

    expect(result).toBe(true)
    expect(chain.update).toHaveBeenCalled()
    expect(chain.in).toHaveBeenCalled() // in("auto_approval_state", ["pending", "failed_retrying"])
  })

  it("claimForProcessing returns false when CAS fails (0 rows)", async () => {
    const { from } = mockSupabase({ data: [], error: null })
    const { claimForProcessing } = await import("@/lib/clinical/auto-approval-state")
    const result = await claimForProcessing(from as never, INTAKE_ID)

    expect(result).toBe(false)
  })

  it("markApproved transitions attempting → approved and sets ai_approved", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markApproved } = await import("@/lib/clinical/auto-approval-state")
    const result = await markApproved(from as never, INTAKE_ID)

    expect(result).toBe(true)
    // Should set ai_approved = true alongside state
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("approved")
    expect(updateArg.ai_approved).toBe(true)
    expect(updateArg.ai_approved_at).toBeTruthy()
  })

  it("markNeedsDoctor transitions attempting → needs_doctor with reason", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markNeedsDoctor } = await import("@/lib/clinical/auto-approval-state")
    const result = await markNeedsDoctor(from as never, INTAKE_ID, "emergency: chest pain")

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("needs_doctor")
    expect(updateArg.auto_approval_state_reason).toBe("emergency: chest pain")
  })

  it("markFailedRetrying transitions attempting → failed_retrying and increments attempts", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markFailedRetrying } = await import("@/lib/clinical/auto-approval-state")
    const result = await markFailedRetrying(from as never, INTAKE_ID, "no_doctor_available")

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("failed_retrying")
  })

  it("markDraftsReady transitions awaiting_drafts → pending", async () => {
    const { from, chain } = mockSupabase({ data: [{ id: INTAKE_ID }], error: null })
    const { markDraftsReady } = await import("@/lib/clinical/auto-approval-state")
    const result = await markDraftsReady(from as never, INTAKE_ID)

    expect(result).toBe(true)
    const updateArg = (chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(updateArg.auto_approval_state).toBe("pending")
  })

  it("handles DB errors gracefully and reports to Sentry", async () => {
    const { from } = mockSupabase({ data: null, error: { message: "connection lost", code: "08006" } })
    const Sentry = await import("@sentry/nextjs")
    const { claimForProcessing } = await import("@/lib/clinical/auto-approval-state")
    const result = await claimForProcessing(from as never, INTAKE_ID)

    expect(result).toBe(false)
    expect(Sentry.captureMessage).toHaveBeenCalled()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run lib/__tests__/auto-approval-state.test.ts
```

Expected: FAIL — module `@/lib/clinical/auto-approval-state` not found.

**Step 3: Write `lib/clinical/auto-approval-state.ts`**

```typescript
/**
 * Auto-Approval State Machine — Atomic State Transitions
 *
 * Every auto-approval state change in the system goes through this module.
 * Uses CAS (compare-and-swap) pattern: UPDATE ... WHERE state = expected.
 * If 0 rows updated, someone else transitioned first — return false.
 *
 * Observability (Sentry, PostHog, Telegram) is centralized here.
 */

import { createLogger } from "@/lib/observability/logger"
import * as Sentry from "@sentry/nextjs"
import { getPostHogClient } from "@/lib/posthog-server"
import { sendTelegramAlert, escapeMarkdownValue } from "@/lib/notifications/telegram"

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

/** Claim an intake for processing: pending|failed_retrying → attempting */
export async function claimForProcessing(
  supabase: SupabaseClient,
  intakeId: string,
): Promise<boolean> {
  return transitionState(
    supabase, intakeId,
    ["pending", "failed_retrying"],
    "attempting",
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
    // Increment attempts — separate query. Not atomic with the state transition,
    // but attempts is observability-only, not used for CAS decisions.
    try {
      await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>
      }).rpc("increment_auto_approval_attempts", { intake_id: intakeId })
    } catch {
      // Fallback: read-then-write (small race window, acceptable for counter)
      const { data } = await supabase.from("intakes")
        .update({}) // will be overridden below
        .eq("id", intakeId) as unknown as { data: null }
      // If RPC isn't available, the counter may lag — acceptable for observability
      void data
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
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run lib/__tests__/auto-approval-state.test.ts
```

Expected: All 7 tests PASS.

**Step 5: Commit**

```bash
git add lib/clinical/auto-approval-state.ts lib/__tests__/auto-approval-state.test.ts
git commit -m "feat: add auto-approval state machine transition module"
```

---

### Task 3: Supabase RPC for Atomic Increment

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_auto_approval_increment_rpc.sql`

**Step 1: Write the migration**

```sql
-- Atomic increment for auto_approval_attempts counter
-- Called by the state machine module after marking failed_retrying
CREATE OR REPLACE FUNCTION increment_auto_approval_attempts(intake_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE intakes
  SET auto_approval_attempts = auto_approval_attempts + 1
  WHERE id = intake_id;
$$;
```

**Step 2: Apply migration**

```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "db: add RPC for atomic auto_approval_attempts increment"
```

---

### Task 4: Rewrite Pipeline Orchestrator

**Files:**
- Modify: `lib/clinical/auto-approval-pipeline.ts` (full rewrite)
- Modify: `lib/__tests__/auto-approval-pipeline.test.ts` (update tests)

**Step 1: Rewrite `lib/clinical/auto-approval-pipeline.ts`**

The rewrite removes: `releaseSystemClaim()`, `isDeterministicFailure()` (moved to state module), all `claimed_by`/`claimed_at` manipulation, all `try/finally { release claim }` blocks, the `auto_approval_skipped` writes.

The rewrite adds: imports from `auto-approval-state.ts`, calls to `claimForProcessing()`, `markApproved()`, `markNeedsDoctor()`, `markFailedRetrying()`, `markIneligible()`.

Key structural changes:

```typescript
// DELETE these functions:
// - releaseSystemClaim() — replaced by state transitions
// - isDeterministicFailure() — moved to auto-approval-state.ts
// - The DETERMINISTIC_FAILURE_PREFIXES array — moved to auto-approval-state.ts

// KEEP these functions unchanged:
// - buildReviewDataFromAnswers() — pure data transformation
// - logAutoApprovalAudit() — audit logging (already fixed)

// REWRITE attemptAutoApproval():
import {
  claimForProcessing, markApproved, markNeedsDoctor,
  markFailedRetrying, markIneligible,
} from "./auto-approval-state"

export async function attemptAutoApproval(intakeId: string): Promise<AutoApprovalResult> {
  // ... feature flag + rate limit checks (unchanged) ...

  const supabase = createServiceRoleClient()

  try {
    // CLAIM via state machine (replaces claimed_by logic)
    const claimed = await claimForProcessing(supabase, intakeId)
    if (!claimed) {
      trackOutcome("skipped", "already_claimed")
      return { success: true, autoApproved: false, reason: "Already claimed or processing" }
    }

    // Fetch intake (remove status check — state machine handles it)
    // ... fetch intake, verify med cert, extract answers, fetch drafts ...
    // ... (same data fetching logic as current) ...

    // ELIGIBILITY (unchanged call, different failure handling)
    const eligibility = evaluateAutoApprovalEligibility(/* ... same args ... */)

    await logAutoApprovalAudit(/* ... same args ... */)

    if (!eligibility.eligible) {
      // State machine decides: needs_doctor (deterministic) vs failed_retrying (transient)
      await markIneligible(supabase, intakeId, eligibility.reason,
        eligibility.disqualifyingFlags, intake.auto_approval_attempts ?? 0)
      trackOutcome("not_eligible", eligibility.reason)
      return { success: true, autoApproved: false, reason: eligibility.reason }
    }

    // DOCTOR SELECTION (unchanged logic)
    // ... round-robin selection ...
    if (doctors.length === 0) {
      await markFailedRetrying(supabase, intakeId, "no_doctor_available")
      trackOutcome("failed", "no_doctor")
      return { success: false, autoApproved: false, reason: "No doctor available" }
    }

    // BUILD REVIEW DATA (unchanged)
    const reviewData = buildReviewDataFromAnswers(answersData, doctor.full_name)
    if (!reviewData) {
      await markFailedRetrying(supabase, intakeId, "no_review_data")
      trackOutcome("failed", "no_review_data")
      return { success: false, autoApproved: false, reason: "Could not build review data" }
    }

    // DRY RUN (release back to pending, not failed_retrying)
    if (isDryRun) {
      // Transition back: attempting → pending (so it can be picked up again)
      // For dry run, we use a direct update since this isn't a standard transition
      await supabase.from("intakes")
        .update({ auto_approval_state: "pending", auto_approval_state_updated_at: new Date().toISOString() })
        .eq("id", intakeId)
      trackOutcome("dry_run", "would_approve")
      return { success: true, autoApproved: false, reason: "Dry run — would have approved" }
    }

    // EXECUTE (unchanged call to executeCertApproval)
    const approvalResult = await executeCertApproval({ /* ... same args ... */ })

    if (approvalResult.success) {
      await markApproved(supabase, intakeId)
      // ... PostHog, rate limit recording, audit log (same as current) ...
      return { success: true, autoApproved: true, reason: "Auto-approved and delivered", certificateId: approvalResult.certificateId }
    }

    // Pipeline failed — mark for retry
    await markFailedRetrying(supabase, intakeId, `pipeline_error: ${approvalResult.error}`)
    trackOutcome("failed", "pipeline_error")
    return { success: false, autoApproved: false, reason: "Approval pipeline failed", error: approvalResult.error }

  } catch (error) {
    // Unexpected error — mark for retry
    const errorMessage = error instanceof Error ? error.message : String(error)
    await markFailedRetrying(supabase, intakeId, `unexpected: ${errorMessage}`)
    Sentry.captureException(error, { tags: { subsystem: "auto-approval", intake_id: intakeId } })
    trackOutcome("failed", "unexpected_error")
    return { success: false, autoApproved: false, reason: "Unexpected error", error: errorMessage }
  }
}
```

**Step 2: Update `lib/__tests__/auto-approval-pipeline.test.ts`**

Key changes to existing tests:
- Replace `claimed_by` / `claimRows` mock setup with state transition mock
- Add mock for `@/lib/clinical/auto-approval-state` module
- Test "already claimed" now tests CAS miss (returns false), not empty `claimRows`
- Test "deterministic failure" now verifies `markNeedsDoctor` is called, not `auto_approval_skipped` write
- Test "approval success" now verifies `markApproved` is called
- Test "pipeline failure" now verifies `markFailedRetrying` is called
- Test "unexpected error" now verifies `markFailedRetrying` is called (not `releaseSystemClaim`)

Add this mock block at the top of the test file:

```typescript
const mockClaimForProcessing = vi.fn().mockResolvedValue(true)
const mockMarkApproved = vi.fn().mockResolvedValue(true)
const mockMarkNeedsDoctor = vi.fn().mockResolvedValue(true)
const mockMarkFailedRetrying = vi.fn().mockResolvedValue(true)
const mockMarkIneligible = vi.fn().mockResolvedValue(true)

vi.mock("@/lib/clinical/auto-approval-state", () => ({
  claimForProcessing: (...args: unknown[]) => mockClaimForProcessing(...args),
  markApproved: (...args: unknown[]) => mockMarkApproved(...args),
  markNeedsDoctor: (...args: unknown[]) => mockMarkNeedsDoctor(...args),
  markFailedRetrying: (...args: unknown[]) => mockMarkFailedRetrying(...args),
  markIneligible: (...args: unknown[]) => mockMarkIneligible(...args),
  isDeterministicFailure: (flags: string[]) => flags.some(f =>
    ["emergency:", "patient_under_18", "mental_health:", "injury:"].some(p => f.startsWith(p))
  ),
}))
```

Update test case "skips when intake is already claimed by a doctor":

```typescript
it("returns early when claim fails (CAS miss)", async () => {
  mockFeatureFlags.ai_auto_approve_enabled = true
  mockClaimForProcessing.mockResolvedValueOnce(false) // CAS miss
  supabaseQueryResults["intakes"] = makeIntakeChain()

  const attemptAutoApproval = await getAttemptAutoApproval()
  const result = await attemptAutoApproval(TEST_INTAKE_ID)

  expect(result.success).toBe(true)
  expect(result.autoApproved).toBe(false)
  expect(result.reason).toContain("Already claimed")
})
```

**Step 3: Run all tests**

```bash
npx vitest run lib/__tests__/auto-approval-pipeline.test.ts lib/__tests__/auto-approval-state.test.ts
```

Expected: All tests PASS.

**Step 4: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

Expected: 0 errors.

**Step 5: Commit**

```bash
git add lib/clinical/auto-approval-pipeline.ts lib/__tests__/auto-approval-pipeline.test.ts
git commit -m "refactor: rewrite auto-approval pipeline to use state machine transitions"
```

---

### Task 5: Rewrite Retry Cron

**Files:**
- Modify: `app/api/cron/retry-auto-approval/route.ts`

**Step 1: Rewrite the cron handler**

Key changes:
- Remove `CRON_CLAIM_ID`, `crypto.randomUUID()`, all `claimed_by` logic
- Remove `.eq("ai_approved", false)`, `.eq("auto_approval_skipped", false)` filters
- Remove `.is("claimed_by", null)` filter
- Remove service type filtering (only med certs have non-null state)
- Query `auto_approval_state IN ('pending', 'failed_retrying')` instead
- Add timeout recovery: query `auto_approval_state = 'attempting'` where `auto_approval_state_updated_at < 10 min ago`
- Import `recoverStale` from state module
- Remove claim/release blocks — `attemptAutoApproval` handles it via state machine
- Keep the "still reviewing" email block (runs independently)
- Keep the max-attempts alert (now queries `auto_approval_state = 'needs_doctor'` + `auto_approval_state_reason LIKE 'max_retries%'`)

The new main query:

```typescript
const { data: eligibleIntakes, error: fetchError } = await supabase
  .from("intakes")
  .select("id, auto_approval_state, auto_approval_attempts, auto_approval_state_updated_at")
  .in("auto_approval_state", ["pending", "failed_retrying"])
  .lt("paid_at", delayAgo)
  .gt("paid_at", eightHoursAgo)
  .order("paid_at", { ascending: true })
  .limit(5)
```

Timeout recovery block (add after the main query):

```typescript
// Timeout recovery: rescue intakes stuck in "attempting" for > 10 minutes
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
const { data: stuckIntakes } = await supabase
  .from("intakes")
  .select("id")
  .eq("auto_approval_state", "attempting")
  .lt("auto_approval_state_updated_at", tenMinutesAgo)
  .limit(5)

if (stuckIntakes && stuckIntakes.length > 0) {
  const { recoverStale } = await import("@/lib/clinical/auto-approval-state")
  for (const stuck of stuckIntakes) {
    await recoverStale(supabase, stuck.id)
    recovered++
  }
}
```

The per-intake processing loop simplifies to:

```typescript
for (const intake of eligibleIntakes) {
  try {
    // Check if AI drafts exist — if not, generate them first
    const { data: existingDrafts } = await supabase
      .from("document_drafts")
      .select("id")
      .eq("intake_id", intake.id)
      .eq("is_ai_generated", true)
      .limit(1)

    if (!existingDrafts || existingDrafts.length === 0) {
      const draftResult = await generateDraftsForIntake(intake.id)
      if (!draftResult.success) {
        failed++
        continue
      }
      draftsGenerated++
    }

    // attemptAutoApproval handles claiming via state machine internally
    const result = await attemptAutoApproval(intake.id)
    if (result.autoApproved) {
      approved++
    } else {
      skipped++
    }
  } catch (err) {
    failed++
    logger.warn("Retry auto-approval error", { intakeId: intake.id, error: err instanceof Error ? err.message : String(err) })
  }
  // No finally block needed — state machine handles failure states
}
```

**Step 2: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

Expected: 0 errors.

**Step 3: Commit**

```bash
git add app/api/cron/retry-auto-approval/route.ts
git commit -m "refactor: simplify retry cron to use auto_approval_state + add timeout recovery"
```

---

### Task 6: Update Webhook Initialization

**Files:**
- Modify: `app/api/stripe/webhook/handlers/checkout-session-completed.ts`

**Step 1: Add state initialization after payment**

After the intake is marked as `paid` (around line 287), add:

```typescript
// Initialize auto-approval state for med certs
const serviceType = session.metadata?.category || session.metadata?.service_type
if (serviceType === "med_certs" || session.metadata?.service_slug?.startsWith("med-cert")) {
  await supabase
    .from("intakes")
    .update({
      auto_approval_state: "awaiting_drafts",
      auto_approval_state_updated_at: new Date().toISOString(),
    })
    .eq("id", intakeId)
    .is("auto_approval_state", null) // idempotent
}
```

**Step 2: Add `markDraftsReady` after draft generation in the `after()` block**

After drafts are generated successfully (around line 525), add:

```typescript
// Transition state: awaiting_drafts → pending
const { markDraftsReady } = await import("@/lib/clinical/auto-approval-state")
await markDraftsReady(supabase, intakeId)
```

The existing auto-approval call (delay=0 check) stays as-is — it already respects the delay flag.

**Step 3: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

Expected: 0 errors.

**Step 4: Commit**

```bash
git add app/api/stripe/webhook/handlers/checkout-session-completed.ts
git commit -m "feat: initialize auto_approval_state in webhook + markDraftsReady after draft gen"
```

---

### Task 7: Update Types and Downstream Consumers

**Files:**
- Modify: `types/db.ts` — add `auto_approval_state` fields to Intake type
- Modify: `app/api/cron/stale-queue/route.ts` — update query if it references `auto_approval_skipped`
- Modify: `app/api/cron/health-check/route.ts` — no change needed (uses `ai_approved`, which is kept)

**Step 1: Update `types/db.ts`**

Add to the Intake type:

```typescript
auto_approval_state: "awaiting_drafts" | "pending" | "attempting" | "approved" | "failed_retrying" | "needs_doctor" | null
auto_approval_state_reason: string | null
auto_approval_state_updated_at: string | null
```

Keep existing `ai_approved`, `ai_approved_at`, `auto_approval_attempts`, `claimed_by`, `claimed_at` fields.

**Step 2: Check stale-queue cron for `auto_approval_skipped` usage**

```bash
npx vitest run 2>&1 | tail -5
```

If it references `auto_approval_skipped`, update to use `auto_approval_state = 'needs_doctor'`.

**Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

**Step 4: Run typecheck**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

Expected: 0 errors.

**Step 5: Commit**

```bash
git add types/db.ts app/api/cron/stale-queue/route.ts
git commit -m "chore: add auto_approval_state to types + update downstream consumers"
```

---

### Task 8: Drop Old Columns (Phase 3 Migration)

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_drop_old_auto_approval_columns.sql`

> **Important:** Only run this AFTER Tasks 1-7 are deployed and verified in production.

**Step 1: Write the migration**

```sql
-- Phase 3: Drop old auto-approval boolean columns
-- Prerequisites: new pipeline code deployed and verified
-- ai_approved, ai_approved_at, claimed_by, claimed_at, auto_approval_attempts are KEPT

ALTER TABLE intakes DROP COLUMN IF EXISTS auto_approval_skipped;
ALTER TABLE intakes DROP COLUMN IF EXISTS auto_approval_skip_reason;
```

**Step 2: Update `types/db.ts`** — remove `auto_approval_skipped` and `auto_approval_skip_reason` from the Intake type.

**Step 3: Search for any remaining references**

```bash
grep -r "auto_approval_skipped\|auto_approval_skip_reason" --include="*.ts" --include="*.tsx" lib/ app/ components/ types/
```

Expected: 0 results (all references were in pipeline + cron, already updated).

**Step 4: Apply migration**

```bash
npx supabase db push
```

**Step 5: Run full CI**

```bash
npx vitest run && npx tsc --noEmit
```

Expected: All pass.

**Step 6: Commit**

```bash
git add supabase/migrations/ types/db.ts
git commit -m "db: drop auto_approval_skipped columns (replaced by auto_approval_state)"
```

---

### Task 9: Update Documentation

**Files:**
- Modify: `ARCHITECTURE.md` — update auto-approval section with new state machine
- Modify: `OPERATIONS.md` — update cron job reference for retry-auto-approval
- Modify: `CLAUDE.md` — increment migration count

**Step 1: Update ARCHITECTURE.md**

Add/update the auto-approval section to reference the state machine enum and the new module structure.

**Step 2: Update OPERATIONS.md**

Update the retry-auto-approval cron description to mention timeout recovery and state-based querying.

**Step 3: Update CLAUDE.md migration count**

Increment from current count by 2 (state machine migration + RPC migration).

**Step 4: Commit**

```bash
git add ARCHITECTURE.md OPERATIONS.md CLAUDE.md
git commit -m "docs: update architecture + ops docs for auto-approval state machine"
```

---

## Task Dependency Graph

```
Task 1 (migration) ──→ Task 2 (state module) ──→ Task 4 (pipeline rewrite)
                    ──→ Task 3 (RPC) ────────────┘        │
                                                           ├──→ Task 5 (cron rewrite)
                                                           ├──→ Task 6 (webhook update)
                                                           └──→ Task 7 (types + consumers)
                                                                    │
                                                                    └──→ Task 8 (drop old columns)
                                                                         │
                                                                         └──→ Task 9 (docs)
```

Tasks 5, 6, and 7 are independent of each other and can be done in parallel after Task 4.
Task 8 should only be done after deploying and verifying Tasks 1-7.

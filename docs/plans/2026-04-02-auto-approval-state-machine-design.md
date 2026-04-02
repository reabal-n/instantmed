# Auto-Approval State Machine Redesign

> **Status:** Approved design — pending implementation plan
> **Date:** 2026-04-02
> **Scope:** State machine + full pipeline rewrite + migration + admin visibility

## Problem

The auto-approval pipeline tracks state across 6 boolean/scalar columns on `intakes`:

| Column | Type | Purpose |
|--------|------|---------|
| `claimed_by` | uuid | Distributed lock (shared with doctor claims) |
| `claimed_at` | timestamptz | When claim was acquired |
| `auto_approval_attempts` | int | Retry counter |
| `auto_approval_skipped` | bool | Deterministic failure flag |
| `auto_approval_skip_reason` | text | Why it was skipped |
| `ai_approved` | bool | Whether AI approved it |
| `ai_approved_at` | timestamptz | When AI approved it |

**Failure modes this caused:**

1. **Invalid UUID claim ID** — `claimed_by` is `uuid` type; cron was writing a string like `cron-auto-approval-1743569769000`. Every claim silently failed. All retries broken since deployment.
2. **Silent error swallowing** — DB errors on claim were treated as "already claimed by doctor", logged as info, and skipped.
3. **No timeout recovery** — If the pipeline crashes mid-processing, `claimed_by` is never released. The intake is permanently locked.
4. **Ambiguous boolean combinations** — `claimed_by = NULL AND ai_approved = false AND auto_approval_skipped = false AND auto_approval_attempts < 10` is the "eligible for retry" state. Any column out of sync creates an impossible state.
5. **Audit log enum mismatch** — `action: "auto_approve_evaluation"` and `actor_type: "doctor_delegated"` were not valid enum values. Every compliance record silently failed.
6. **Webhook delay bypass** — Webhook called `attemptAutoApproval` in `after()` regardless of `auto_approve_delay_minutes` setting.

Issues 1-6 are now fixed with targeted patches. This design replaces the underlying architecture to prevent the entire class of problems.

## Design

### State Machine

Replace the 6-column boolean soup with a single `auto_approval_state` enum:

```sql
CREATE TYPE auto_approval_state AS ENUM (
  'awaiting_drafts',  -- paid, AI drafts not yet generated
  'pending',          -- drafts ready, waiting for cron to pick up
  'attempting',       -- actively processing (distributed lock)
  'approved',         -- TERMINAL: cert issued via auto-approval
  'failed_retrying',  -- transient failure, cron will retry
  'needs_doctor'      -- TERMINAL: deterministic failure OR retries exhausted
);
```

**State transition map:**

```
payment webhook (med cert only)
       |
       v
  awaiting_drafts --(drafts generated)--> pending
                                            |
                                      cron picks up
                                            |
                                            v
                                        attempting --(deterministic fail)--> needs_doctor (TERMINAL)
                                            |
                                            |---(cert issued)---> approved (TERMINAL)
                                            |
                                            |---(transient fail, attempts < 10)---> failed_retrying
                                            |                                            |
                                            |<------------- cron retry -----------------+
                                            |
                                            +---(attempts >= 10)---> needs_doctor (TERMINAL)

Timeout recovery:
  attempting (stale > 10 min) --> failed_retrying (automatic via cron)
```

**Key properties:**
- `NULL` state = not applicable (non-med-cert, not yet paid). `DEFAULT NULL`.
- `state = 'attempting'` IS the distributed lock — no `claimed_by` in the auto-approval pipeline.
- CAS transitions: `UPDATE SET state = 'attempting' WHERE state IN ('pending', 'failed_retrying')` — only one process succeeds.
- Timeout recovery: cron rescues `attempting` intakes stuck > 10 minutes.

### Schema Changes

**Add:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `auto_approval_state` | `auto_approval_state` | `NULL` | Single source of truth |
| `auto_approval_state_reason` | `text` | `NULL` | Failure/skip reason for `failed_retrying` and `needs_doctor` |
| `auto_approval_state_updated_at` | `timestamptz` | `NULL` | Enables timeout recovery |

**Keep:**

| Column | Reason |
|--------|--------|
| `auto_approval_attempts` | Useful observability metric |
| `ai_approved` | Referenced in other queries — set as derived field on approval |
| `ai_approved_at` | Referenced in other queries — set as derived field on approval |
| `claimed_by` | Repurposed for doctor claims only |
| `claimed_at` | Repurposed for doctor claims only |

**Drop:**

| Column | Replaced by |
|--------|-------------|
| `auto_approval_skipped` | `state = 'needs_doctor'` |
| `auto_approval_skip_reason` | `auto_approval_state_reason` |

**Index:**

```sql
CREATE INDEX idx_intakes_auto_approval_active
  ON intakes (auto_approval_state, paid_at)
  WHERE auto_approval_state IN ('pending', 'failed_retrying', 'attempting');
```

Partial index — only indexes actionable rows. `approved` and `needs_doctor` (the majority over time) are excluded.

### Module Structure

```
lib/clinical/
  auto-approval-state.ts       # NEW — atomic state transitions
  auto-approval-pipeline.ts    # REWRITE — orchestrator using state transitions
  auto-approval.ts             # KEEP — eligibility engine (unchanged)
```

#### Layer 1: `auto-approval-state.ts` — Atomic State Transitions

Every state change goes through one function with CAS semantics:

```typescript
async function transitionState(
  supabase, intakeId,
  fromState: AutoApprovalState | AutoApprovalState[],
  toState: AutoApprovalState,
  reason?: string
): Promise<boolean>  // true = transition succeeded, false = state already changed

// Convenience wrappers:
claimForProcessing(supabase, intakeId)           // pending|failed_retrying -> attempting
markApproved(supabase, intakeId)                 // attempting -> approved (sets ai_approved=true)
markFailedRetrying(supabase, intakeId, reason)   // attempting -> failed_retrying
markNeedsDoctor(supabase, intakeId, reason)      // attempting -> needs_doctor
markDraftsReady(supabase, intakeId)              // awaiting_drafts -> pending
recoverStale(supabase, intakeId)                 // attempting (stale) -> failed_retrying
```

All Sentry alerts, PostHog events, and Telegram notifications for state transitions live here. One place for all observability.

#### Layer 2: `auto-approval-pipeline.ts` — Orchestrator (Rewrite)

```typescript
export async function attemptAutoApproval(intakeId): Promise<AutoApprovalResult> {
  // 1. CLAIM: claimForProcessing() — returns false if someone else got it
  // 2. ELIGIBILITY: evaluateAutoApprovalEligibility() (unchanged)
  //    deterministic fail -> markNeedsDoctor(reason)
  //    transient fail     -> markFailedRetrying(reason)
  // 3. DOCTOR SELECTION: round-robin (unchanged)
  //    no doctor -> markFailedRetrying("no_doctor_available")
  // 4. BUILD REVIEW DATA (unchanged)
  // 5. EXECUTE: executeCertApproval() (unchanged)
  //    success -> markApproved()
  //    failure -> markFailedRetrying(error)
  // 6. AUDIT: logAutoApprovalAudit()
}
```

**Deleted from current file:**
- `releaseSystemClaim()` — state transitions replace claim/release
- All `claimed_by`/`claimed_at` manipulation
- All `try/finally { release claim }` blocks
- `isDeterministicFailure()` — moves to state transition layer

**Result:** ~631 lines -> ~300 lines. Every branch ends with a state transition call.

#### Cron (Simplified)

```typescript
// Query: only non-null actionable states
const { data } = await supabase
  .from("intakes")
  .select("id, auto_approval_state, auto_approval_attempts, auto_approval_state_updated_at")
  .in("auto_approval_state", ["pending", "failed_retrying"])
  .lt("paid_at", delayAgo)
  .gt("paid_at", eightHoursAgo)
  .order("paid_at", { ascending: true })
  .limit(5)

// Timeout recovery
const { data: stuck } = await supabase
  .from("intakes")
  .select("id")
  .eq("auto_approval_state", "attempting")
  .lt("auto_approval_state_updated_at", tenMinutesAgo)
  .limit(5)
```

**Deleted from cron:**
- UUID claim trick (`CRON_CLAIM_ID`)
- Service type filtering (only med certs have non-null state)
- `auto_approval_skipped`, `ai_approved`, `claimed_by IS NULL` filters
- Pre/post-processing claim/release blocks

#### Webhook Initialization

```typescript
// checkout-session-completed.ts — after marking intake as paid
if (serviceType === "med_certs") {
  await supabase
    .from("intakes")
    .update({ auto_approval_state: "awaiting_drafts" })
    .eq("id", intakeId)
    .is("auto_approval_state", null)  // idempotent

  // In after() block, after drafts generated:
  await markDraftsReady(supabase, intakeId)  // awaiting_drafts -> pending

  // Only attempt immediate approval when delay = 0
  if (flags.auto_approve_delay_minutes === 0) {
    await attemptAutoApproval(intakeId)
  }
}
```

### Race Condition Elimination

| Problem | Solution |
|---------|----------|
| Two cron instances process same intake | CAS: `UPDATE WHERE state = 'pending'` — only one succeeds |
| Webhook + cron race | Webhook sets `awaiting_drafts`, cron only sees `pending`/`failed_retrying` |
| Crashed pipeline leaves orphan lock | Timeout recovery: stale `attempting` -> `failed_retrying` after 10min |
| `claimed_by` UUID type mismatch | No `claimed_by` in auto-approval at all |
| Pipeline succeeds but claim not released | `markApproved()` is atomic — no release step needed |

### Migration Plan

**Phase 1: Add new columns + backfill (single migration)**

```sql
-- 1. Create enum
CREATE TYPE auto_approval_state AS ENUM (
  'awaiting_drafts', 'pending', 'attempting',
  'approved', 'failed_retrying', 'needs_doctor'
);

-- 2. Add columns
ALTER TABLE intakes ADD COLUMN auto_approval_state auto_approval_state;
ALTER TABLE intakes ADD COLUMN auto_approval_state_reason text;
ALTER TABLE intakes ADD COLUMN auto_approval_state_updated_at timestamptz;

-- 3. Backfill from old columns
UPDATE intakes SET
  auto_approval_state = 'approved',
  auto_approval_state_updated_at = ai_approved_at
WHERE ai_approved = true AND status = 'approved';

UPDATE intakes SET
  auto_approval_state = 'needs_doctor',
  auto_approval_state_reason = auto_approval_skip_reason,
  auto_approval_state_updated_at = updated_at
WHERE auto_approval_skipped = true;

UPDATE intakes SET
  auto_approval_state = 'needs_doctor',
  auto_approval_state_reason = 'max_retries_exhausted',
  auto_approval_state_updated_at = updated_at
WHERE auto_approval_attempts >= 10
  AND ai_approved = false
  AND auto_approval_skipped = false
  AND status = 'paid';

-- Remaining paid med cert intakes → pending (ready for cron)
UPDATE intakes SET
  auto_approval_state = 'pending',
  auto_approval_state_updated_at = paid_at
WHERE status = 'paid'
  AND auto_approval_state IS NULL
  AND category = 'medical_certificate';

-- 4. Partial index
CREATE INDEX idx_intakes_auto_approval_active
  ON intakes (auto_approval_state, paid_at)
  WHERE auto_approval_state IN ('pending', 'failed_retrying', 'attempting');

-- 5. RLS: auto_approval_state visible to doctors (read) and system (write)
-- No new RLS needed — existing intake RLS covers it.
```

**Phase 2: Deploy new pipeline code**

Deploy the rewritten `auto-approval-state.ts`, `auto-approval-pipeline.ts`, cron, and webhook. The new code reads/writes `auto_approval_state`. The old boolean columns are still populated as derived fields for backward compatibility during rollout.

**Phase 3: Drop old columns (separate migration after verification)**

```sql
ALTER TABLE intakes DROP COLUMN auto_approval_skipped;
ALTER TABLE intakes DROP COLUMN auto_approval_skip_reason;
```

`ai_approved`, `ai_approved_at`, `claimed_by`, `claimed_at`, `auto_approval_attempts` are kept.

### Admin Visibility & Alerting

**Sentry alerts (built into state transition layer):**

| Transition | Sentry Level | Fingerprint |
|-----------|-------------|-------------|
| `-> approved` | info | `["cert-pipeline", "auto-approved"]` |
| `-> needs_doctor` (deterministic) | info | `["cert-pipeline", "needs-doctor", reason]` |
| `-> needs_doctor` (exhausted) | warning | `["cert-pipeline", "retries-exhausted"]` |
| `-> failed_retrying` | — | No Sentry (expected, transient) |
| `attempting` stale recovery | warning | `["cert-pipeline", "stale-recovery"]` |
| Transition failure (CAS miss) | — | No Sentry (expected contention) |

**Admin dashboard query:**

```sql
SELECT auto_approval_state, count(*)
FROM intakes
WHERE auto_approval_state IS NOT NULL
  AND paid_at > now() - interval '24 hours'
GROUP BY auto_approval_state;
```

**Telegram alerts:** `needs_doctor` (exhausted retries) and stale recovery trigger Telegram notifications.

## Out of Scope

- Full intake lifecycle state machine (draft -> submitted -> paid -> approved/declined) — separate project
- Admin UI for manually transitioning auto-approval state — use DB for now
- State history/audit table — `ai_audit_log` already captures decision history
- Circuit breaker pattern — rate limiting already provides this; revisit if needed post-launch

# Relaxed Auto-Approval with Co-Symptom Logic

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Relax med cert auto-approval so ~99% of standard requests auto-approve, keeping only genuine emergency blockers. Add co-symptom logic, soft flags, and skip deterministic retry failures.

**Architecture:** Split keyword lists into hard-block (always block) and soft-block (only block as sole symptom). Add soft_flags to audit log for doctor batch review. Add skip columns to intakes table so retry cron stops hammering deterministic failures.

**Tech Stack:** TypeScript, Supabase PostgreSQL, Vitest

---

### Task 1: DB Migration — add skip columns to intakes

**Files:**
- Create: `supabase/migrations/20260329000001_add_auto_approval_skip_columns.sql`

**Step 1: Write migration**

```sql
ALTER TABLE intakes
  ADD COLUMN IF NOT EXISTS auto_approval_skipped boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_approval_skip_reason text;

COMMENT ON COLUMN intakes.auto_approval_skipped IS 'Set to true when auto-approval fails with a deterministic reason (emergency, under 18, sole mental health symptom). Prevents retry cron from re-evaluating.';
COMMENT ON COLUMN intakes.auto_approval_skip_reason IS 'Human-readable reason why auto-approval was skipped. Null if not skipped.';

CREATE INDEX IF NOT EXISTS idx_intakes_auto_approval_skip
  ON intakes (auto_approval_skipped)
  WHERE status = 'paid' AND auto_approval_skipped = false;
```

**Step 2: Apply migration**

Run: `supabase db push`

**Step 3: Commit**

```bash
git add supabase/migrations/20260329000001_add_auto_approval_skip_columns.sql
git commit -m "feat: add auto_approval_skipped columns to intakes table"
```

---

### Task 2: Refactor auto-approval eligibility — co-symptom logic

**Files:**
- Modify: `lib/clinical/auto-approval.ts`
- Test: `lib/__tests__/auto-approval.test.ts`

**Step 1: Write failing tests for co-symptom logic**

Add these tests to `lib/__tests__/auto-approval.test.ts`:

```typescript
// ---- Co-symptom logic (soft-block keywords) ----

it("approves 'anxiety' as co-symptom with 2+ other symptoms", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Anxiety", "Nausea", "Fever"],
      symptomDetails: "Body chills and feeling faint",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(true)
  expect(result.softFlags).toContain("anxiety_co_symptom")
})

it("blocks 'anxiety' as sole symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Anxiety"],
      symptomDetails: "Severe anxiety making it hard to work",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(false)
  expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
})

it("approves 'panic' as co-symptom alongside physical symptoms", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Panic", "Headache", "Fatigue"],
      symptomDetails: "Headache and tired",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(true)
  expect(result.softFlags).toContain("panic_co_symptom")
})

it("approves 'burnout' as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Burnout", "Fatigue", "Headache"],
      symptomDetails: "Exhausted and headaches",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(true)
  expect(result.softFlags).toContain("burnout_co_symptom")
})

it("approves 'accident' as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Back pain", "Neck pain"],
      symptomDetails: "Minor accident, back is sore",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(true)
  expect(result.softFlags).toContain("accident_co_symptom")
})

it("approves 'fall' as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Back pain", "Bruising"],
      symptomDetails: "Had a fall yesterday",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(true)
  expect(result.softFlags).toContain("fall_co_symptom")
})

it("approves 'sprain' as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Ankle pain", "Swelling"],
      symptomDetails: "Sprained ankle at gym",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(true)
  expect(result.softFlags).toContain("sprain_co_symptom")
})

it("approves 'flare up' as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Back pain", "Fatigue"],
      symptomDetails: "Back pain flare up",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(true)
  expect(result.softFlags).toContain("flare up_co_symptom")
})

it("approves 'ibs' as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Gastro", "Nausea"],
      symptomDetails: "IBS acting up with nausea",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(true)
  expect(result.softFlags).toContain("ibs_co_symptom")
})

it("still blocks 'stress leave' even as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Fatigue", "Headache"],
      symptomDetails: "Need stress leave from work",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(false)
  expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
})

it("still blocks 'depression' even as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Depression", "Fatigue", "Headache"],
      symptomDetails: "Feeling depressed and tired",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(false)
  expect(result.disqualifyingFlags.some(f => f.includes("mental_health"))).toBe(true)
})

it("still blocks 'workers comp' even as co-symptom", () => {
  const result = evaluateAutoApprovalEligibility(
    makeIntake(),
    makeAnswers({
      symptoms: ["Back pain", "Neck pain"],
      symptomDetails: "Need for workers comp claim",
    }),
    makeReadyDraft()
  )
  expect(result.eligible).toBe(false)
  expect(result.disqualifyingFlags.some(f => f.includes("injury"))).toBe(true)
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test lib/__tests__/auto-approval.test.ts`
Expected: New co-symptom tests FAIL (softFlags not returned, anxiety still blocks with co-symptoms)

**Step 3: Implement co-symptom logic in auto-approval.ts**

In `lib/clinical/auto-approval.ts`:

1. Add `softFlags` to the return type:
```typescript
export interface AutoApprovalEligibility {
  eligible: boolean
  reason: string
  disqualifyingFlags: string[]
  softFlags: string[]  // NEW: keywords that matched but were allowed as co-symptoms
}
```

2. Split keyword lists into SOFT_BLOCK (co-symptom aware) and leave the rest as hard-block:

```typescript
// Keywords that ONLY block when they are the patient's sole symptom.
// If the patient has 2+ symptoms, these are recorded as soft flags instead.
const SOFT_BLOCK_MENTAL_HEALTH = [
  "anxiety", "anxious", "panic", "panic attack", "burnout", "stress",
]

const SOFT_BLOCK_INJURY = [
  "accident", "fall", "sprain",
]

const SOFT_BLOCK_CHRONIC = [
  "flare up", "flare-up", "flareup", "ibs", "irritable bowel",
]
```

3. Remove those keywords from the existing hard-block lists (MENTAL_HEALTH_KEYWORDS, INJURY_KEYWORDS, CHRONIC_CONDITION_KEYWORDS).

4. In `evaluateAutoApprovalEligibility`, add symptom count check:
```typescript
const symptomCount = Array.isArray(answers?.symptoms) ? answers.symptoms.length : 0
const hasCoSymptoms = symptomCount >= 2
```

5. For soft-block keywords, check co-symptom logic:
```typescript
// Soft-block: mental health keywords that allow co-symptom pass-through
const softMentalHealthMatches = containsKeywords(symptomText, SOFT_BLOCK_MENTAL_HEALTH)
if (softMentalHealthMatches.length > 0) {
  if (hasCoSymptoms) {
    softFlags.push(...softMentalHealthMatches.map(k => `${k}_co_symptom`))
  } else {
    flags.push(`mental_health: ${softMentalHealthMatches.join(", ")}`)
  }
}
```

Same pattern for soft-block injury and chronic keywords.

6. Return `softFlags` in the result.

**Step 4: Update existing tests that expect hard-blocks on soft-block keywords**

Tests like "rejects intake with 'anxiety'" need updating — anxiety with co-symptoms should now pass. Tests for sole-symptom anxiety should still block.

Update the test "rejects intake with 'anxiety'" to reflect new behavior: it uses `makeAnswers` which has `symptoms: ["Cold", "Runny nose"]` plus `symptomDetails` containing "anxiety" — this is now a co-symptom case and should PASS. Change to test sole-symptom case.

Similarly update "rejects intake with injury keyword 'accident'" — `makeAnswers` defaults have `symptoms: ["Cold", "Runny nose"]` so accident in symptomDetails is now a co-symptom → passes. Change to sole-symptom test.

**Step 5: Run tests**

Run: `pnpm test lib/__tests__/auto-approval.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add lib/clinical/auto-approval.ts lib/__tests__/auto-approval.test.ts
git commit -m "feat: co-symptom logic for auto-approval — soft-block keywords pass with 2+ symptoms"
```

---

### Task 3: Soft flags in audit log + skip deterministic failures

**Files:**
- Modify: `lib/clinical/auto-approval-pipeline.ts`
- Modify: `lib/__tests__/auto-approval-pipeline.test.ts`

**Step 1: Update pipeline to pass soft flags to audit log**

In `attemptAutoApproval()`, after the eligibility check succeeds, include `softFlags` in the audit metadata:

```typescript
await logAutoApprovalAudit(supabase, intakeId, eligibility.eligible, eligibility.reason, {
  disqualifyingFlags: eligibility.disqualifyingFlags,
  softFlags: eligibility.softFlags,  // NEW
  service_slug: service.slug,
  duration_days: extractDurationDays(answersData),
})
```

**Step 2: Add skip logic for deterministic failures**

After eligibility fails, check if the failure is deterministic. If so, update the intake:

```typescript
// Deterministic failure reasons that will never change on retry
const DETERMINISTIC_FAILURE_PREFIXES = [
  "emergency:", "patient_under_18", "wrong_service_type",
  "mental_health:", "injury:", "chronic:", "pregnancy:",
]

function isDeterministicFailure(flags: string[]): boolean {
  return flags.some(flag =>
    DETERMINISTIC_FAILURE_PREFIXES.some(prefix => flag.startsWith(prefix))
  )
}
```

After `if (!eligibility.eligible)`, before releasing the claim:

```typescript
if (isDeterministicFailure(eligibility.disqualifyingFlags)) {
  await supabase
    .from("intakes")
    .update({
      auto_approval_skipped: true,
      auto_approval_skip_reason: eligibility.reason,
    })
    .eq("id", intakeId)
}
```

**Step 3: Update retry cron to filter skipped intakes**

In `app/api/cron/retry-auto-approval/route.ts`, add `.eq("auto_approval_skipped", false)` to the query:

```typescript
const { data: eligibleIntakes, error: fetchError } = await supabase
  .from("intakes")
  .select(`id, service:services!service_id(type), ai_approved`)
  .eq("status", "paid")
  .is("claimed_by", null)
  .eq("ai_approved", false)
  .eq("auto_approval_skipped", false)  // NEW: skip deterministic failures
  .lt("paid_at", delayAgo)
  .gt("paid_at", sixtyMinAgo)
  .order("paid_at", { ascending: true })
  .limit(5)
```

**Step 4: Run tests**

Run: `pnpm test lib/__tests__/auto-approval-pipeline.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/clinical/auto-approval-pipeline.ts app/api/cron/retry-auto-approval/route.ts lib/__tests__/auto-approval-pipeline.test.ts
git commit -m "feat: soft flags in audit log + skip deterministic retry failures"
```

---

### Task 4: Full test suite + typecheck

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All 268+ tests pass

**Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: No type errors

**Step 3: Commit any fixes**

If any tests or types needed fixing, commit those.

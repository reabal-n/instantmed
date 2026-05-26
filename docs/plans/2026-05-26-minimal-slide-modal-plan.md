# Minimal slide modal + ED rec + auto-approve fixes: Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three bundled fixes to the doctor intake-review surface. Widen med-cert auto-approve to 2 days, replace the empty `( minutes remaining)` claim banner, collapse the cockpit tabs to a single column, and replace the generic ED Parchment-preset hint with a concrete medication recommendation derived from the patient's stated treatment preference.

**Architecture:** Pure additive + replacement changes across `lib/clinical/`, `lib/data/intake-lock.ts`, `components/doctor/review/`, and one new component file. No new tables, no new API routes. Engine version bumped from 2.4 → 2.5. Existing keyboard-shortcut hook stays wired; just one branch added for "open the disclosure before focusing the notes textarea".

**Tech Stack:** Next.js 15.5 App Router (RSC), Vitest (Node env), React 18.3, Tailwind v4, shadcn/ui, Framer Motion 11. Pinned per CLAUDE.md Stack Pin Policy. Do not bump anything in `package.json`.

**Companion design doc:** `docs/plans/2026-05-26-minimal-slide-modal-design.md`.

**Branch:** `feat/2026-05-26-minimal-slide-modal` (create from `main`).

**Useful skills along the way:** @superpowers:test-driven-development for every implementation task, @superpowers:verification-before-completion before claiming any task done.

---

## Task 0: Branch + worktree setup

**Files:** none (git ops only)

**Step 1: Create the branch.**

```bash
git checkout -b feat/2026-05-26-minimal-slide-modal main
git status
```

Expected: `On branch feat/2026-05-26-minimal-slide-modal`, working tree clean.

**Step 2: Verify the design doc is on the branch.**

```bash
git log --oneline -3 docs/plans/2026-05-26-minimal-slide-modal-design.md
```

Expected: top commit is `docs(plans): minimal slide modal + ED rec + auto-approve fixes`.

**No commit in this task.**

---

## Task 1: Widen auto-approve to 2-day for any patient

**Files:**
- Modify: `lib/clinical/auto-approval.ts:24` (bump engine version)
- Modify: `lib/clinical/auto-approval.ts:481-488` (widen the 1-day rule)
- Test: `lib/__tests__/auto-approval.test.ts`

**Step 1: Write the failing test.**

Append to `lib/__tests__/auto-approval.test.ts` (find the existing `describe("evaluateAutoApprovalEligibility", ...)` block and add inside it):

```typescript
describe("2-day rule (widened 2026-05-26)", () => {
  it("auto-approves a 2-day cert with no flags for a first-request patient", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: "2", symptomDetails: "fever, runny nose, sore throat" }),
      makeReadyDraft(),
      { date_of_birth: "1990-01-01" },
      { previousApprovalCount: 0 },
    )
    expect(result.eligible).toBe(true)
    expect(result.reason).toMatch(/2-day|standard med cert/i)
  })

  it("still rejects 3-day certs from first-request patients", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: "3", symptomDetails: "fever, runny nose" }),
      makeReadyDraft(),
      { date_of_birth: "1990-01-01" },
      { previousApprovalCount: 0 },
    )
    expect(result.eligible).toBe(false)
  })

  it("still rejects 2-day certs with hard-block keywords", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: "2", symptomDetails: "back pain since a fracture last week" }),
      makeReadyDraft(),
      { date_of_birth: "1990-01-01" },
      { previousApprovalCount: 0 },
    )
    expect(result.eligible).toBe(false)
    expect(result.disqualifyingFlags.some(f => f.includes("injury"))).toBe(true)
  })

  it("returning patient (>=2 prior) with 3-day still auto-approves under existing rule", () => {
    const result = evaluateAutoApprovalEligibility(
      makeIntake(),
      makeAnswers({ duration: "3", symptomDetails: "fever, runny nose" }),
      makeReadyDraft(),
      { date_of_birth: "1990-01-01" },
      { previousApprovalCount: 4 },
    )
    expect(result.eligible).toBe(true)
  })
})

it("bumps engine version to 2.5 with the 2-day widening", () => {
  expect(ELIGIBILITY_ENGINE_VERSION).toBe("2.5")
})
```

Also update the imports at the top of `lib/__tests__/auto-approval.test.ts` to include `ELIGIBILITY_ENGINE_VERSION`:

```typescript
import {
  ELIGIBILITY_ENGINE_VERSION,
  evaluateAutoApprovalEligibility,
  extractDurationDays,
  extractStartDate,
  extractSymptomText,
} from '@/lib/clinical/auto-approval'
```

**Step 2: Run the tests to verify they fail.**

```bash
pnpm vitest run lib/__tests__/auto-approval.test.ts
```

Expected: 3 of the 4 new "2-day rule" tests fail (the returning-patient case already passes under existing rule). The engine-version test fails. Existing tests still pass.

**Step 3: Implement the widening.**

In `lib/clinical/auto-approval.ts`:

- Line 24: change `"2.4"` to `"2.5"`.
- Lines 481-488: change the special-rule branch from `durationDays === 1` to `durationDays !== null && durationDays <= 2`, and update the reason string.

```typescript
// TUNING: For 1-2 day certificates with mild common symptoms, allow auto-approval
// even if soft-block keywords are present. These are the most common and lowest-risk
// requests. The 3-day cap still requires either zero flags or a returning patient.
const hasOnlySoftFlags = flags.length > 0 && flags.every(f => softOriginFlags.has(f))
if (hasOnlySoftFlags && durationDays !== null && durationDays <= 2) {
  return result({
    eligible: true,
    reason: `${durationDays}-day certificate with mild symptoms - auto-approved`,
    disqualifyingFlags: [],
    softFlags: flags,
  })
}
```

Also relax the no-flags case at the bottom (line 511). When `flags.length === 0` and the duration is within cap, that already auto-approves via the final `return`. No change needed there.

**Step 4: Run the tests to verify they pass.**

```bash
pnpm vitest run lib/__tests__/auto-approval.test.ts
```

Expected: all tests pass. No other test files affected (auto-approval-pipeline + auto-approval-state both use 1-day fixtures and shouldn't drift).

**Step 5: Run full unit tests as a guardrail.**

```bash
pnpm test
```

Expected: green. If `lib/__tests__/auto-approval-pipeline.test.ts` or any other test relies on the old `"2.4"` version literal, update it to `"2.5"`. (Likely only the engine-version test, which we just added.)

**Step 6: Commit.**

```bash
git add lib/clinical/auto-approval.ts lib/__tests__/auto-approval.test.ts
git commit -m "$(cat <<'EOF'
feat(auto-approval): widen to 2-day for any patient

Previously only 1-day certs (or any cert from a 2+ prior approval
returning patient) with soft flags only would auto-approve. A vanilla
2-day cold cert from a first-request patient sat in the manual queue
for 3+ hours today. 2-day is well inside the 3-day hard cap and matches
the most common cold/flu pattern. Hard-block keywords (mental health,
injury, chronic, pregnancy, high-stakes use case) still prevent
auto-approval. Engine version bumped to 2.5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Mask the empty `( minutes remaining)` claim banner

**Files:**
- Modify: `lib/data/intake-lock.ts:55-66`
- Test: `lib/__tests__/intake-lock-warning.test.ts` (new)

**Step 1: Write the failing test.**

Create `lib/__tests__/intake-lock-warning.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest"

import { acquireIntakeLock } from "@/lib/data/intake-lock"

// Mock the service-role client so we can drive the RPC return value.
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({
    rpc: vi.fn().mockImplementation((name: string) => {
      if (name === "claim_intake_for_review") {
        return Promise.resolve({
          data: [{
            success: false,
            current_claimant: "System (Auto-Approve)",
            error_message: "Already claimed by System (Auto-Approve) ( minutes remaining)",
          }],
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    }),
    from: () => ({ update: () => ({ eq: () => ({ eq: () => ({ in: () => ({ error: null }) }) }) }) }),
  }),
}))

describe("acquireIntakeLock (System auto-approve claimant)", () => {
  it("masks the empty '( minutes remaining)' template when System holds the claim", async () => {
    const result = await acquireIntakeLock("intake-1", "doctor-1", "Dr Test")
    expect(result.acquired).toBe(false)
    expect(result.warning).not.toMatch(/\(\s*minutes remaining\s*\)/)
    expect(result.warning).toMatch(/auto-approval/i)
  })
})
```

**Step 2: Run the test to verify it fails.**

```bash
pnpm vitest run lib/__tests__/intake-lock-warning.test.ts
```

Expected: FAIL. The `warning` string equals the broken template from the RPC.

**Step 3: Implement the mask.**

In `lib/data/intake-lock.ts`, modify the failure-branch return in `acquireIntakeLock` (currently around line 56-66):

```typescript
if (claimError || !claim?.success) {
  const lockedByName = claim?.current_claimant || "another doctor"
  const lockedAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + LOCK_TIMEOUT_MS).toISOString()
  const isSystemClaim = lockedByName.toLowerCase().includes("auto-approve")
  return {
    acquired: false,
    existingLock: {
      intakeId,
      lockedBy: "unknown",
      lockedByName,
      lockedAt,
      expiresAt,
    },
    warning: isSystemClaim
      ? "Auto-approval check is running on this case. You can still review and act if needed."
      : (claim?.error_message || "This case could not be claimed for review."),
  }
}
```

**Step 4: Run the test to verify it passes.**

```bash
pnpm vitest run lib/__tests__/intake-lock-warning.test.ts
```

Expected: PASS.

**Step 5: Commit.**

```bash
git add lib/data/intake-lock.ts lib/__tests__/intake-lock-warning.test.ts
git commit -m "$(cat <<'EOF'
fix(intake-lock): mask empty '( minutes remaining)' for System actor

The Postgres claim_intake_for_review RPC builds its error message
from current_claimant + minutes since review_started_at. When the
System (Auto-Approve) cron holds the claim the minutes value is
unavailable, leaving "Already claimed by System (Auto-Approve)
( minutes remaining)" with an empty parenthesis on the doctor's slide.

Client-side mask: when the claimant is the System actor, swap the
broken template for a hand-written status string. Long-term fix
is in the SQL function, tracked separately.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ED prescribing preset table (constants only)

**Files:**
- Create: `lib/clinical/ed-prescribing-presets.ts`
- Test: `lib/__tests__/ed-prescribing-presets.test.ts`

**Step 1: Write the failing test.**

Create `lib/__tests__/ed-prescribing-presets.test.ts`:

```typescript
import { describe, expect, it } from "vitest"

import { ED_PRESCRIBING_PRESETS, getEdPreset } from "@/lib/clinical/ed-prescribing-presets"

describe("ED prescribing presets", () => {
  it("daily preference returns Tadalafil 5mg with daily directions", () => {
    const preset = getEdPreset("daily")
    expect(preset.medicationName).toBe("Tadalafil")
    expect(preset.strength).toBe("5mg")
    expect(preset.quantityTemplate).toBe("30 tablets")
    expect(preset.repeatsTemplate).toBe("2")
    expect(preset.directionsTemplate).toMatch(/once daily/i)
    expect(preset.medicationSearchHint).toMatch(/tadalafil/i)
    expect(preset.alternativeNote).toBeUndefined()
  })

  it("prn preference returns Sildenafil 50mg with as-needed directions", () => {
    const preset = getEdPreset("prn")
    expect(preset.medicationName).toBe("Sildenafil")
    expect(preset.strength).toBe("50mg")
    expect(preset.quantityTemplate).toBe("8 tablets")
    expect(preset.repeatsTemplate).toBe("2")
    expect(preset.directionsTemplate).toMatch(/1 hour before sexual activity/i)
    expect(preset.directionsTemplate).toMatch(/maximum 1 tablet per 24 hours/i)
  })

  it("doctor_decides preference defaults to Sildenafil 50mg PRN with Tadalafil alternative note", () => {
    const preset = getEdPreset("doctor_decides")
    expect(preset.medicationName).toBe("Sildenafil")
    expect(preset.strength).toBe("50mg")
    expect(preset.alternativeNote).toMatch(/Tadalafil 5mg/i)
  })

  it("unknown preference falls back to doctor_decides", () => {
    const preset = getEdPreset("garbage")
    expect(preset.medicationName).toBe(ED_PRESCRIBING_PRESETS.doctor_decides.medicationName)
  })
})
```

**Step 2: Run the test to verify it fails.**

```bash
pnpm vitest run lib/__tests__/ed-prescribing-presets.test.ts
```

Expected: FAIL. Module does not exist.

**Step 3: Create the presets module.**

`lib/clinical/ed-prescribing-presets.ts`:

```typescript
export interface EdPreset {
  medicationName: string
  strength: string
  form: string
  quantityTemplate: string
  repeatsTemplate: string
  directionsTemplate: string
  medicationSearchHint: string
  alternativeNote?: string
}

export const ED_PRESCRIBING_PRESETS: Record<"daily" | "prn" | "doctor_decides", EdPreset> = {
  daily: {
    medicationName: "Tadalafil",
    strength: "5mg",
    form: "tablet",
    quantityTemplate: "30 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet once daily, at the same time each day.",
    medicationSearchHint: "Tadalafil 5mg tablet",
  },
  prn: {
    medicationName: "Sildenafil",
    strength: "50mg",
    form: "tablet",
    quantityTemplate: "8 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet 1 hour before sexual activity. Maximum 1 tablet per 24 hours.",
    medicationSearchHint: "Sildenafil 50mg tablet",
  },
  doctor_decides: {
    medicationName: "Sildenafil",
    strength: "50mg",
    form: "tablet",
    quantityTemplate: "8 tablets",
    repeatsTemplate: "2",
    directionsTemplate: "Take 1 tablet 1 hour before sexual activity. Maximum 1 tablet per 24 hours.",
    medicationSearchHint: "Sildenafil 50mg tablet",
    alternativeNote: "Patient hasn't expressed a preference. Tadalafil 5mg daily is an alternative for patients who prefer daily dosing.",
  },
}

export function getEdPreset(preference: string | null | undefined): EdPreset {
  if (preference === "daily" || preference === "prn") {
    return ED_PRESCRIBING_PRESETS[preference]
  }
  return ED_PRESCRIBING_PRESETS.doctor_decides
}
```

**Step 4: Run the test to verify it passes.**

```bash
pnpm vitest run lib/__tests__/ed-prescribing-presets.test.ts
```

Expected: PASS.

**Step 5: Commit.**

```bash
git add lib/clinical/ed-prescribing-presets.ts lib/__tests__/ed-prescribing-presets.test.ts
git commit -m "$(cat <<'EOF'
feat(clinical): ED prescribing preset table

Maps patient treatment_preference (daily/prn/doctor_decides) to a
concrete medication + strength + dose + directions. Daily defaults to
Tadalafil 5mg, PRN to Sildenafil 50mg, doctor_decides falls through to
Sildenafil 50mg PRN with a Tadalafil alternative note. Wired into
case-summary in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire ED preset into `edSummary`

**Files:**
- Modify: `lib/clinical/case-summary.ts:273-280` (replace generic intent with preset-derived intent)
- Modify: `lib/clinical/case-summary.ts:45-57` (add `alternativeNote?: string` to `PrescriptionIntent`)
- Test: `lib/__tests__/clinical-case-summary.test.ts` (extend existing ED tests)

**Step 1: Write the failing test.**

Extend `lib/__tests__/clinical-case-summary.test.ts`. Add after the existing ED test (around line 47):

```typescript
describe("ED preset wiring (2026-05-26)", () => {
  it("daily preference fills prescriptionIntent with Tadalafil 5mg", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "ed",
      serviceType: "consult",
      patientName: "Test Patient",
      answers: {
        edGoal: "improve_erections",
        edDuration: "1_to_3_years",
        edPreference: "daily",
        iiefTotal: 12,
        edNitrates: "no",
        edRecentHeartEvent: "no",
        edSevereHeart: "no",
        edAlphaBlockers: "no",
      },
    })
    expect(summary.prescriptionIntent?.medicationName).toBe("Tadalafil")
    expect(summary.prescriptionIntent?.strength).toBe("5mg")
    expect(summary.prescriptionIntent?.quantityTemplate).toBe("30 tablets")
    expect(summary.prescriptionIntent?.directionsTemplate).toMatch(/once daily/i)
    expect(summary.prescriptionIntent?.clipboardText).toContain("Tadalafil")
    expect(summary.prescriptionIntent?.clipboardText).toContain("30 tablets")
  })

  it("prn preference fills prescriptionIntent with Sildenafil 50mg", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "ed",
      serviceType: "consult",
      patientName: "Test Patient",
      answers: {
        edGoal: "improve_erections",
        edDuration: "1_to_3_years",
        edPreference: "prn",
        edNitrates: "no",
        edRecentHeartEvent: "no",
        edSevereHeart: "no",
        edAlphaBlockers: "no",
      },
    })
    expect(summary.prescriptionIntent?.medicationName).toBe("Sildenafil")
    expect(summary.prescriptionIntent?.strength).toBe("50mg")
    expect(summary.prescriptionIntent?.directionsTemplate).toMatch(/1 hour before/i)
  })

  it("doctor_decides preference defaults to Sildenafil 50mg + alternative note", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "ed",
      serviceType: "consult",
      patientName: "Test Patient",
      answers: {
        edGoal: "improve_erections",
        edDuration: "1_to_3_years",
        edPreference: "doctor_decides",
        edNitrates: "no",
        edRecentHeartEvent: "no",
        edSevereHeart: "no",
        edAlphaBlockers: "no",
      },
    })
    expect(summary.prescriptionIntent?.medicationName).toBe("Sildenafil")
    expect((summary.prescriptionIntent as { alternativeNote?: string })?.alternativeNote).toMatch(/Tadalafil 5mg/i)
  })

  it("hard contraindication still suppresses prescriptionIntent", () => {
    const summary = buildClinicalCaseSummary({
      category: "consult",
      subtype: "ed",
      serviceType: "consult",
      patientName: "Test Patient",
      answers: {
        edGoal: "improve_erections",
        edPreference: "daily",
        edNitrates: "yes",
      },
    })
    expect(summary.prescriptionIntent).toBeUndefined()
  })
})
```

**Step 2: Run the test to verify it fails.**

```bash
pnpm vitest run lib/__tests__/clinical-case-summary.test.ts
```

Expected: FAIL. `medicationName` is undefined under current code (the existing `edSummary` doesn't set it).

**Step 3: Implement the wiring.**

Edit `lib/clinical/case-summary.ts`:

(a) Add `alternativeNote?: string` to the `PrescriptionIntent` interface (around line 45-57):

```typescript
export interface PrescriptionIntent {
  presetLabel: string
  medicationName?: string
  strength?: string
  form?: string
  medicationSearchHint?: string
  directionsTemplate: string
  quantityTemplate?: string
  repeatsTemplate?: string
  safetyChecks: string[]
  parchmentMode: "open_patient_prescribe"
  clipboardText: string
  alternativeNote?: string
}
```

(b) Update `makeIntent(...)` (around line 155-161) to forward `alternativeNote`:

```typescript
function makeIntent(intent: Omit<PrescriptionIntent, "clipboardText" | "parchmentMode">): PrescriptionIntent {
  return {
    ...intent,
    parchmentMode: "open_patient_prescribe",
    clipboardText: createClipboardText(intent),
  }
}
```

(`...intent` already includes `alternativeNote`. No spread change needed; only the interface change is required here.)

(c) Import the preset table at the top of `case-summary.ts`:

```typescript
import { getEdPreset } from "@/lib/clinical/ed-prescribing-presets"
```

(d) Replace the `prescriptionIntent` block in `edSummary` (around lines 273-280):

```typescript
const edPreset = getEdPreset(preference)
const prescriptionIntent = hasBlock || needsLiveReview ? undefined : makeIntent({
  presetLabel: "ED prescribing preset",
  medicationName: edPreset.medicationName,
  strength: edPreset.strength,
  form: edPreset.form,
  medicationSearchHint: edPreset.medicationSearchHint,
  directionsTemplate: edPreset.directionsTemplate,
  quantityTemplate: edPreset.quantityTemplate,
  repeatsTemplate: edPreset.repeatsTemplate,
  safetyChecks: ["No nitrates reported", "Cardiac screen reviewed", "Alpha blockers checked", "Current medications checked"],
  alternativeNote: edPreset.alternativeNote,
})
```

**Step 4: Run the tests to verify they pass.**

```bash
pnpm vitest run lib/__tests__/clinical-case-summary.test.ts
```

Expected: all new tests pass + existing ED tests still pass (the existing "daily" test asserts `presetLabel: /ED/i`, which still matches).

**Step 5: Commit.**

```bash
git add lib/clinical/case-summary.ts lib/__tests__/clinical-case-summary.test.ts
git commit -m "$(cat <<'EOF'
feat(case-summary): map ED treatment preference to a concrete preset

edSummary now fills medicationName, strength, quantity, repeats, and
directions on prescriptionIntent based on the patient's stated
treatment_preference. daily -> Tadalafil 5mg, prn -> Sildenafil 50mg,
doctor_decides -> Sildenafil 50mg with Tadalafil 5mg alternative note.
Hard contraindications still suppress the intent entirely.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: PrescriptionRecommendationCard component

**Files:**
- Create: `components/doctor/review/prescription-recommendation-card.tsx`
- Test: `components/doctor/review/__tests__/prescription-recommendation-card.test.tsx`

**Step 1: Discover the test wiring for React components.**

```bash
ls components/doctor/review/__tests__/ 2>/dev/null
ls components/**/__tests__/ 2>/dev/null | head -10
grep -rn "@testing-library/react" components/ --include="*.tsx" 2>/dev/null | head -3
```

If `@testing-library/react` is in use, follow that pattern. If component tests live elsewhere (likely `lib/__tests__/*.test.tsx`), put the test there instead.

**Step 2: Write the failing test.**

Create the test (using whichever path/pattern the discovery step found, defaulting to `lib/__tests__/prescription-recommendation-card.test.tsx`):

```typescript
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PrescriptionRecommendationCard } from "@/components/doctor/review/prescription-recommendation-card"

describe("PrescriptionRecommendationCard", () => {
  it("renders medication name, strength, quantity, repeats and directions", () => {
    render(
      <PrescriptionRecommendationCard
        intent={{
          presetLabel: "ED prescribing preset",
          medicationName: "Tadalafil",
          strength: "5mg",
          form: "tablet",
          medicationSearchHint: "Tadalafil 5mg tablet",
          directionsTemplate: "Take 1 tablet once daily, at the same time each day.",
          quantityTemplate: "30 tablets",
          repeatsTemplate: "2",
          safetyChecks: [],
          parchmentMode: "open_patient_prescribe",
          clipboardText: "...",
        }}
      />,
    )
    expect(screen.getByText(/Tadalafil/)).toBeInTheDocument()
    expect(screen.getByText(/5mg/)).toBeInTheDocument()
    expect(screen.getByText(/30 tablets/)).toBeInTheDocument()
    expect(screen.getByText(/once daily/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /copy all/i })).toBeInTheDocument()
  })

  it("renders the alternative note when present", () => {
    render(
      <PrescriptionRecommendationCard
        intent={{
          presetLabel: "ED prescribing preset",
          medicationName: "Sildenafil",
          strength: "50mg",
          directionsTemplate: "Take 1 tablet 1 hour before sexual activity.",
          quantityTemplate: "8 tablets",
          repeatsTemplate: "2",
          safetyChecks: [],
          parchmentMode: "open_patient_prescribe",
          clipboardText: "...",
          alternativeNote: "Tadalafil 5mg daily is an alternative.",
        }}
      />,
    )
    expect(screen.getByText(/Tadalafil 5mg daily is an alternative/)).toBeInTheDocument()
  })

  it("returns null when intent is undefined", () => {
    const { container } = render(<PrescriptionRecommendationCard intent={undefined} />)
    expect(container.firstChild).toBeNull()
  })
})
```

**Step 3: Run the test to verify it fails.**

```bash
pnpm vitest run prescription-recommendation-card
```

Expected: FAIL. Component does not exist.

**Step 4: Implement the component.**

Create `components/doctor/review/prescription-recommendation-card.tsx`:

```typescript
"use client"

import { ClipboardCopy, Pill } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PrescriptionIntent } from "@/lib/clinical/case-summary"
import { cn } from "@/lib/utils"

interface PrescriptionRecommendationCardProps {
  intent: PrescriptionIntent | undefined
  className?: string
}

export function PrescriptionRecommendationCard({
  intent,
  className,
}: PrescriptionRecommendationCardProps) {
  if (!intent) return null

  const handleCopyAll = () => {
    if (typeof navigator === "undefined") return
    void navigator.clipboard?.writeText(intent.clipboardText)
  }

  const handleCopyMed = () => {
    if (typeof navigator === "undefined") return
    const med = [intent.medicationName, intent.strength, intent.form].filter(Boolean).join(" ")
    if (med) void navigator.clipboard?.writeText(med)
  }

  const medicationLine = [intent.medicationName, intent.strength, intent.form].filter(Boolean).join(" ")
  const quantityLine = [
    intent.quantityTemplate ? `Quantity: ${intent.quantityTemplate}` : null,
    intent.repeatsTemplate ? `Repeats: ${intent.repeatsTemplate}` : null,
  ].filter(Boolean).join(" · ")

  return (
    <Card
      className={cn(
        "bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Pill className="h-3.5 w-3.5" aria-hidden />
          Recommended prescription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {medicationLine && (
          <p className="text-base font-semibold text-foreground">{medicationLine}</p>
        )}
        {quantityLine && (
          <p className="text-sm text-muted-foreground">{quantityLine}</p>
        )}
        <p className="text-sm text-foreground">{intent.directionsTemplate}</p>
        {intent.alternativeNote && (
          <p className="text-xs italic text-muted-foreground">{intent.alternativeNote}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleCopyAll}>
            <ClipboardCopy className="h-3.5 w-3.5 mr-1" aria-hidden />
            Copy all
          </Button>
          {medicationLine && (
            <Button variant="outline" size="sm" className="text-xs" onClick={handleCopyMed}>
              <ClipboardCopy className="h-3.5 w-3.5 mr-1" aria-hidden />
              Copy medication
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 5: Run the test to verify it passes.**

```bash
pnpm vitest run prescription-recommendation-card
```

Expected: PASS.

**Step 6: Type-check.**

```bash
pnpm typecheck
```

Expected: no new errors.

**Step 7: Commit.**

```bash
git add components/doctor/review/prescription-recommendation-card.tsx \
        components/doctor/review/__tests__/prescription-recommendation-card.test.tsx \
        lib/__tests__/prescription-recommendation-card.test.tsx 2>/dev/null
git commit -m "$(cat <<'EOF'
feat(doctor): PrescriptionRecommendationCard

Renders a concrete prescription preset (medication, strength,
quantity, repeats, directions) with Copy all / Copy medication
buttons. Used by the intake review cockpit to replace the generic
"Parchment preset" hint card. Returns null when intent is undefined.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Collapse cockpit Tabs into single column + bottom disclosure

**Files:**
- Modify: `components/doctor/review/intake-review-cockpit.tsx` (full layout rewrite; keep the imports + CertificateDeliveryCard helper)
- Create: `components/doctor/review/intake-secondary-disclosure.tsx`

**Step 1: Inspect the cockpit's collaborators.**

Read these files to ground the rewrite (no edits yet):

```bash
ls components/doctor/review/
cat components/doctor/review/request-info-card.tsx | head -40
cat components/doctor/review/clinical-notes-editor.tsx | head -20
cat components/doctor/patient-decision-strip.tsx | head -40
```

Confirm that `RequestInfoCard` accepts `compact` + `hideFullAnswers` and that `PatientDecisionStrip` accepts `compact`. If either prop is missing, abort and re-read the existing cockpit. The rewrite assumes these existed before today.

**Step 2: Create the disclosure component.**

`components/doctor/review/intake-secondary-disclosure.tsx`:

```typescript
"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface IntakeSecondaryDisclosureProps {
  priorRequestCount: number
  noteCount: number
  defaultOpen?: boolean
  /** Imperative handle: pass a setter to let parents force-open the disclosure (e.g. on Cmd+N). */
  onOpenChange?: (open: boolean) => void
  open?: boolean
  children: ReactNode
}

export function IntakeSecondaryDisclosure({
  priorRequestCount,
  noteCount,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
}: IntakeSecondaryDisclosureProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen

  const toggle = () => {
    const next = !open
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const label = `Show full intake · ${priorRequestCount} prior request${priorRequestCount === 1 ? "" : "s"} · ${noteCount} note${noteCount === 1 ? "" : "s"}`

  return (
    <div className="border-t border-border/40 pt-3">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
          open && "text-foreground",
        )}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
        {open ? "Hide full intake" : label}
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}
```

**Step 3: Rewrite the cockpit.**

Replace the file `components/doctor/review/intake-review-cockpit.tsx` entirely:

```typescript
"use client"

import { FileText, Loader2, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"

import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { ClinicalNotesEditor } from "@/components/doctor/review/clinical-notes-editor"
import { IntakeActionButtons } from "@/components/doctor/review/intake-action-buttons"
import { IntakeSecondaryDisclosure } from "@/components/doctor/review/intake-secondary-disclosure"
import { useIntakeReview } from "@/components/doctor/review/intake-review-context"
import { PatientMessageThread } from "@/components/doctor/review/patient-message-thread"
import { PrescriptionRecommendationCard } from "@/components/doctor/review/prescription-recommendation-card"
import { RequestInfoCard } from "@/components/doctor/review/request-info-card"
import { ReviewBlockersStrip } from "@/components/doctor/review/review-blockers-strip"
import { SafetyFlagsCard } from "@/components/doctor/review/safety-flags-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buildClinicalCaseSummary } from "@/lib/clinical/case-summary"
import { useDoctorShortcuts } from "@/lib/hooks/use-doctor-shortcuts"
import { cn } from "@/lib/utils"

interface IntakeReviewCockpitProps {
  className?: string
  showDecisionStrip?: boolean
}

function CertificateDeliveryCard() {
  const {
    data,
    intake,
    isViewingCert,
    isResending,
    handleViewCertificate,
    handleResend,
  } = useIntakeReview()

  if (!data.certificate || !["approved", "completed"].includes(intake.status)) return null

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="font-medium text-foreground">Certificate delivery</span>
          {data.certificate.email_opened_at ? (
            <Badge className="bg-success-light text-success border-success-border text-xs">Opened</Badge>
          ) : data.certificate.email_sent_at ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">Sent</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="text-xs" disabled={isViewingCert || !handleViewCertificate} onClick={handleViewCertificate}>
          {isViewingCert ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
          View
        </Button>
        <Button variant="outline" size="sm" className="text-xs" disabled={isResending || !handleResend || (data.certificate.resend_count ?? 0) >= 3} onClick={handleResend} title={(data.certificate.resend_count ?? 0) >= 3 ? "Maximum resends reached" : undefined}>
          {isResending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
          {(data.certificate.resend_count ?? 0) > 0 ? `Resent (${data.certificate.resend_count})` : "Resend"}
        </Button>
      </div>
      {data.certificate.email_opened_at && (
        <p className="text-xs text-muted-foreground">
          Opened {new Date(data.certificate.email_opened_at).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  )
}

export function IntakeReviewCockpit({ className, showDecisionStrip = true }: IntakeReviewCockpitProps) {
  const review = useIntakeReview()
  const { data, intake, answers, service } = review

  const [disclosureOpen, setDisclosureOpen] = useState(false)

  const messageCount = (data.patientMessages?.length ?? 0) + (intake.info_request_message ? 1 : 0)

  const caseSummary = useMemo(
    () =>
      buildClinicalCaseSummary({
        category: intake.category,
        subtype: intake.subtype,
        serviceType: service?.type,
        patientName: intake.patient?.full_name,
        answers: answers ?? {},
        riskTier: intake.risk_tier,
        requiresLiveConsult: intake.requires_live_consult,
      }),
    [intake.category, intake.subtype, intake.patient?.full_name, intake.requires_live_consult, intake.risk_tier, service?.type, answers],
  )
  const hasPrescriptionIntent = Boolean(caseSummary.prescriptionIntent)

  useDoctorShortcuts({
    disabled: review.isPending,
    onApprove: () => {
      if (intake.status !== "paid" && intake.status !== "in_review") return
      if (intake.category === "consult" && ["ed", "hair_loss"].includes(intake.subtype || "") && hasPrescriptionIntent) {
        review.handleApproveAndOpenParchment()
      } else if (service?.type === "med_certs") {
        review.handleMedCertApprove()
      } else if (service?.type === "repeat_rx" || service?.type === "common_scripts") {
        review.handleStatusChange("awaiting_script")
      } else {
        review.handleStatusChange("approved")
      }
    },
    onDecline: () => {
      if (["approved", "declined", "completed"].includes(intake.status)) return
      review.setShowDeclineDialog(true)
    },
    onNote: () => {
      setDisclosureOpen(true)
      setTimeout(() => review.notesRef.current?.focus(), 60)
    },
    onEscape: () => {
      if (review.showDeclineDialog) review.setShowDeclineDialog(false)
    },
  })

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {/* Sticky top: patient header + always-on blockers. Compact density. */}
      <div className="flex flex-col gap-3 pb-3">
        {showDecisionStrip && (
          <PatientDecisionStrip
            intake={intake}
            answers={answers}
            previousIntakes={data.previousIntakes ?? []}
            service={service}
            compact
          />
        )}
        <ReviewBlockersStrip />
        <SafetyFlagsCard />
      </div>

      {/* Scrollable middle: single column, no tabs. */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-3">
          <RequestInfoCard compact hideFullAnswers />
          {messageCount > 0 ? (
            <PatientMessageThread
              messages={data.patientMessages ?? []}
              infoRequestMessage={intake.info_request_message}
              infoRequestedAt={intake.info_requested_at}
              status={intake.status}
            />
          ) : null}
          <PrescriptionRecommendationCard intent={caseSummary.prescriptionIntent} />
          <CertificateDeliveryCard />

          <IntakeSecondaryDisclosure
            priorRequestCount={data.previousIntakes?.length ?? 0}
            noteCount={data.patientNotes?.length ?? 0}
            open={disclosureOpen}
            onOpenChange={setDisclosureOpen}
          >
            <ClinicalNotesEditor />
            <PatientTimeline
              requests={data.previousIntakes ?? []}
              notes={data.patientNotes ?? []}
              compact
              maxItems={20}
              title="Patient history"
              emptyLabel="No previous patient activity."
            />
          </IntakeSecondaryDisclosure>
        </div>
      </div>

      {/* Sticky bottom: action bar. Always visible. */}
      <div className="mt-3 shrink-0 border-t border-border/40 pt-3">
        <IntakeActionButtons />
      </div>
    </div>
  )
}
```

**Step 4: Type-check.**

```bash
pnpm typecheck
```

Expected: no new errors. If RequestInfoCard renders its own prescription preset internally (it might), confirm we're not double-rendering. If it does, edit RequestInfoCard to hide its inline preset block when `caseSummary.prescriptionIntent` exists and the parent renders our card. (Search for `presetLabel` or `prescriptionIntent` in `request-info-card.tsx` to confirm.)

**Step 5: Update the existing tests that asserted tab roles, if any.**

```bash
grep -rn "tablist\|TabsTrigger.*Request\|TabsTrigger.*Notes\|TabsTrigger.*History" lib/__tests__/ components/ e2e/ --include="*.ts" --include="*.tsx" 2>/dev/null
```

For each match, decide: delete if it was asserting the old tabs UI, update if it was asserting routing.

**Step 6: Run unit tests.**

```bash
pnpm test
```

Expected: green.

**Step 7: Commit.**

```bash
git add components/doctor/review/intake-review-cockpit.tsx \
        components/doctor/review/intake-secondary-disclosure.tsx
git commit -m "$(cat <<'EOF'
feat(doctor): collapse cockpit tabs into single-column + bottom disclosure

Removes the Request/Notes/History tabs. Single scrollable column
holds the patient decision strip, blockers, safety flags, request
info, optional patient message thread, the new prescription
recommendation card, certificate delivery card, and a bottom
"Show full intake" disclosure that holds the clinical notes editor
and the unified patient timeline. The Cmd+N shortcut now opens the
disclosure before focusing the notes textarea, so notes are never
unreachable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Verify in the running app

Use @run skill if available, otherwise:

**Step 1: Start the dev server.**

```bash
pnpm dev
```

Wait for `Ready in <Xs>` then open <http://localhost:3000/dashboard> in a fresh tab.

**Step 2: Verify three things manually with screenshots.**

Use the preview MCP if available, otherwise reproduce via the live app:

1. Open a paid sick-cert intake. Confirm the slide is a single column, no tabs, with a bottom "Show full intake" link.
2. Open a paid ED consult intake with `edPreference = daily`. Confirm a "Recommended prescription" card shows `Tadalafil 5mg`, qty 30, repeats 2, with `Copy all` + `Copy medication` buttons.
3. Trigger the auto-approve cron path (or wait for a stuck-claim scenario). Confirm the banner reads "Auto-approval check is running…" not "( minutes remaining)".

Screenshot each surface. Attach the screenshots to the PR description.

**Step 3: Run the full local validation suite.**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: green across all three.

**No commit in this task.**

---

## Task 8: Push + PR + auto-merge

Per `memory/feedback_auto_merge.md`: commit → push → open PR → `gh pr merge --squash --auto --delete-branch`.

**Step 1: Push branch.**

```bash
git push -u origin feat/2026-05-26-minimal-slide-modal
```

**Step 2: Open PR.**

```bash
gh pr create --title "feat: minimal slide modal + ED rec + auto-approve fixes" --body "$(cat <<'EOF'
## Summary

Three bundled fixes to the doctor intake-review surface, designed
together in docs/plans/2026-05-26-minimal-slide-modal-design.md.

- Auto-approve widens from 1-day-or-returning to **any patient up
  to 2-day cert** with only soft flags. Engine version bumped to 2.5.
- "Already claimed by System (Auto-Approve) ( minutes remaining)"
  banner with empty parens → "Auto-approval check is running on this
  case…"
- Doctor slide cockpit collapses Request/Notes/History tabs into a
  **single scrollable column** with a bottom "Show full intake"
  disclosure for notes + history.
- ED prescription intent now fills a real medication recommendation
  based on patient preference: **daily → Tadalafil 5mg, prn →
  Sildenafil 50mg**, doctor_decides defaults to Sildenafil with
  Tadalafil alternative subtext. Hard contraindications still
  suppress the intent.

## Test plan

- [x] pnpm typecheck
- [x] pnpm lint
- [x] pnpm test (auto-approval + clinical-case-summary + ed-prescribing-presets + intake-lock-warning + prescription-recommendation-card)
- [x] Manual: open paid med cert slide → single column, no tabs
- [x] Manual: open paid ED daily slide → Tadalafil 5mg card with Copy buttons
- [x] Manual: trigger stuck-claim scenario → banner reads "Auto-approval check is running…"

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 3: Auto-merge.**

```bash
gh pr merge --squash --auto --delete-branch
```

**Step 4: Verify merge.**

```bash
git checkout main && git pull && git log --oneline -3
```

Expected: top commit is the squashed PR commit.

---

## Skill references

- @superpowers:test-driven-development: apply to Tasks 1, 2, 3, 4, 5.
- @superpowers:verification-before-completion: apply at the end of each task before claiming it done.
- @superpowers:executing-plans: orchestrates this plan.

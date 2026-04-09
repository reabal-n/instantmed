# ED Intake Flow Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current 2-step ED intake (ed-assessment + ed-safety) with a 4-step flow (ed-goals → ed-assessment → ed-health → ed-preferences) that is more engaging, clinically validated (IIEF-5), TGA-compliant (no drug names), and consolidates medical history + safety screening into collapsible sections.

**Architecture:** The existing step registry (`lib/request/step-registry.ts`) already powers a unified wizard at `/request`. We replace the ED entry in `CONSULT_SUBTYPE_STEPS` with 4 new step IDs, create 4 new step components, update the step router's lazy-load map, update validation schemas, and update time estimates. The common tail (details → review → checkout) is unchanged except for height/weight + BMI in the details step for ED subtype.

**Tech Stack:** Next.js 15.5 App Router · React 18.3 · TypeScript 5.9 · Tailwind v4 · Framer Motion 11.18.2 · Zustand · Zod · shadcn/ui (Accordion, Switch, RadioGroup) · lucide-react icons · PostHog analytics

---

## Pre-flight: Read Before Building

- `DESIGN_SYSTEM.md` — color tokens, card tiers, typography, spacing, border radius
- `INTERACTIONS.md` — easing curves, `fadeUp`, `stagger`, `useReducedMotion()`
- `CLINICAL.md` — TGA advertising rules (no Schedule 4 drug names on consumer surfaces)
- `lib/request/step-registry.ts` — step sequence architecture, `CONSULT_SUBTYPE_STEPS`, `StepDefinition`
- `lib/request/validation.ts` — Zod schemas, `runSchema()` helper, `ValidationResult` type
- `components/request/step-router.tsx` — lazy-load map for step components
- `components/request/request-flow.tsx` — `SAFETY_PRE_CHECK_STEPS` set, safety slug mapping
- `components/request/time-remaining.tsx` — `STEP_TIME_ESTIMATES` record
- `components/request/steps/ed-assessment-step.tsx` — current step (being replaced)
- `components/request/steps/ed-safety-step.tsx` — current step (being merged into ed-health)
- `components/request/steps/medical-history-step.tsx` — pattern reference for YesNoQuestion

---

## Phase A: Core Step Infrastructure (Tasks 1–7)

### Task 1: Add New Step IDs to Type System

**Files:**
- Modify: `lib/request/step-registry.ts:17-36` (UnifiedStepId type)

**Step 1: Add the 3 new step IDs to the UnifiedStepId union type**

In `lib/request/step-registry.ts`, find the `UnifiedStepId` type and add:

```typescript
// Find this block (lines ~17-36):
export type UnifiedStepId =
  | 'service'
  | 'safety'
  | 'certificate'
  | 'symptoms'
  | 'medication'
  | 'medication-history'
  | 'medical-history'
  | 'consult-reason'
  | 'ed-assessment'
  | 'ed-safety'              // REMOVE this line
  | 'hair-loss-assessment'
  // ... etc
  | 'details'
  | 'review'
  | 'checkout'

// Replace with (add 3 new IDs, remove ed-safety):
export type UnifiedStepId =
  | 'service'
  | 'safety'
  | 'certificate'
  | 'symptoms'
  | 'medication'
  | 'medication-history'
  | 'medical-history'
  | 'consult-reason'
  | 'ed-goals'               // NEW: Step 1 — goal + duration
  | 'ed-assessment'           // KEPT: Step 2 — now IIEF-5
  | 'ed-health'              // NEW: Step 3 — consolidated health + safety
  | 'ed-preferences'         // NEW: Step 4 — treatment preference (TGA-compliant)
  | 'hair-loss-assessment'
  // ... keep all others unchanged
  | 'details'
  | 'review'
  | 'checkout'
```

**Step 2: Update the ED entry in CONSULT_SUBTYPE_STEPS**

Find the `ed:` entry in `CONSULT_SUBTYPE_STEPS` (lines ~281-299) and replace:

```typescript
ed: [
  {
    id: 'ed-goals',
    label: "What's going on",
    shortLabel: 'Goals',
    componentPath: 'ed-goals-step',
    validateFn: 'validateEdGoalsStep',
    required: true,
  },
  {
    id: 'ed-assessment',
    label: "How it's affecting you",
    shortLabel: 'Assessment',
    componentPath: 'ed-assessment-step',
    validateFn: 'validateEdAssessmentStep',
    required: true,
  },
  {
    id: 'ed-health',
    label: 'Your health',
    shortLabel: 'Health',
    componentPath: 'ed-health-step',
    validateFn: 'validateEdHealthStep',
    required: true,
  },
  {
    id: 'ed-preferences',
    label: 'Your preferences',
    shortLabel: 'Preferences',
    componentPath: 'ed-preferences-step',
    validateFn: 'validateEdPreferencesStep',
    required: true,
  },
  ...CONSULT_COMMON_TAIL,
],
```

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: Type errors in validation.ts (missing new validate functions) and step-router.tsx (missing lazy imports). That's expected — we'll fix those in subsequent tasks.

**Step 4: Commit**

```bash
git add lib/request/step-registry.ts
git commit -m "refactor(intake): update ED step registry to 4-step flow

Replace ed-assessment + ed-safety with ed-goals → ed-assessment (IIEF-5) → ed-health → ed-preferences.
Common tail unchanged."
```

---

### Task 2: Update Validation Schemas

**Files:**
- Modify: `lib/request/validation.ts:166-181` (replace old schemas, add new ones)

**Step 1: Replace the old ED schemas with 4 new ones**

Find `edAssessmentStepSchema` and `edSafetyStepSchema` (lines 166-181) and replace the entire block:

```typescript
// ---------------------------------------------------------------------------
// ED Intake — 4-step validation
// ---------------------------------------------------------------------------

export const edGoalsStepSchema = z.object({
  edGoal: nonEmptyString("Please select your main goal"),
  edDuration: nonEmptyString("Please indicate how long this has been a concern"),
  edAgeConfirmed: z.literal(true, {
    error: "Please confirm you are 18 or older",
  }),
})

export const edAssessmentStepSchema = z.object({
  iief1: z.number({ error: "Please rate your confidence" }).min(1).max(5),
  iief2: z.number({ error: "Please answer this question" }).min(1).max(5),
  iief3: z.number({ error: "Please answer this question" }).min(1).max(5),
  iief4: z.number({ error: "Please answer this question" }).min(1).max(5),
  iief5: z.number({ error: "Please answer this question" }).min(1).max(5),
})

export const edHealthStepSchema = z
  .object({
    edNitrates: z.boolean({ error: "Please answer this safety question" }),
    edRecentHeartEvent: z.boolean({ error: "Please answer this safety question" }),
    edSevereHeart: z.boolean({ error: "Please answer this safety question" }),
    edGpCleared: z.boolean().optional(),
    edHypertension: z.boolean().optional(),
    edDiabetes: z.boolean().optional(),
    edBpMedication: z.boolean().optional(),
    has_allergies: z.union([z.literal("yes"), z.literal("no")]).optional(),
    known_allergies: z.string().optional(),
    has_conditions: z.union([z.literal("yes"), z.literal("no")]).optional(),
    existing_conditions: z.string().optional(),
    takes_medications: z.union([z.literal("yes"), z.literal("no")]).optional(),
    current_medications: z.string().optional(),
    previousEdMeds: z.boolean().optional(),
    edPreviousTreatment: z.string().optional(),
    edPreviousEffectiveness: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Nitrates = hard block (handled in UI, but validate presence)
    if (data.edNitrates === true) {
      ctx.addIssue({
        code: "custom",
        path: ["edNitrates"],
        message: "This service is not suitable for patients taking nitrates",
      })
    }
    // Soft blocks require GP clearance
    if (data.edRecentHeartEvent === true && !data.edGpCleared) {
      ctx.addIssue({
        code: "custom",
        path: ["edGpCleared"],
        message: "Please confirm your GP has cleared you",
      })
    }
    if (data.edSevereHeart === true && !data.edGpCleared) {
      ctx.addIssue({
        code: "custom",
        path: ["edGpCleared"],
        message: "Please confirm your GP has cleared you",
      })
    }
    // Conditional detail fields
    if (data.has_allergies === "yes" && !data.known_allergies?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["known_allergies"],
        message: "Please list your allergies",
      })
    }
    if (data.has_conditions === "yes" && !data.existing_conditions?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["existing_conditions"],
        message: "Please list your conditions",
      })
    }
    if (data.takes_medications === "yes" && !data.current_medications?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["current_medications"],
        message: "Please list your medications",
      })
    }
  })

export const edPreferencesStepSchema = z.object({
  edPreference: nonEmptyString("Please select a treatment preference"),
})
```

**Step 2: Update the validate wrapper functions**

Find `validateEdAssessmentStep` and `validateEdSafetyStep` (lines ~271-277) and replace:

```typescript
export function validateEdGoalsStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edGoalsStepSchema, answers)
}

export function validateEdAssessmentStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edAssessmentStepSchema, answers)
}

export function validateEdHealthStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edHealthStepSchema, answers)
}

export function validateEdPreferencesStep(answers: Record<string, unknown>): ValidationResult {
  return runSchema(edPreferencesStepSchema, answers)
}
```

Delete `validateEdSafetyStep`.

**Step 3: Commit**

```bash
git add lib/request/validation.ts
git commit -m "feat(intake): add Zod schemas for 4-step ED validation

edGoalsStepSchema, edAssessmentStepSchema (IIEF-5), edHealthStepSchema (consolidated safety + medical history), edPreferencesStepSchema (TGA-compliant)."
```

---

### Task 3: Write Validation Tests

**Files:**
- Create: `lib/__tests__/ed-intake-validation.test.ts`

**Step 1: Write the test file**

```typescript
import { describe, it, expect } from "vitest"
import {
  validateEdGoalsStep,
  validateEdAssessmentStep,
  validateEdHealthStep,
  validateEdPreferencesStep,
} from "@/lib/request/validation"

describe("ED Goals Step Validation", () => {
  it("passes with valid data", () => {
    const result = validateEdGoalsStep({
      edGoal: "improve_erections",
      edDuration: "3_to_12_months",
      edAgeConfirmed: true,
    })
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it("fails when edGoal is missing", () => {
    const result = validateEdGoalsStep({
      edDuration: "3_to_12_months",
      edAgeConfirmed: true,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edGoal).toBeTruthy()
  })

  it("fails when edDuration is missing", () => {
    const result = validateEdGoalsStep({
      edGoal: "improve_erections",
      edAgeConfirmed: true,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edDuration).toBeTruthy()
  })

  it("fails when age not confirmed", () => {
    const result = validateEdGoalsStep({
      edGoal: "improve_erections",
      edDuration: "3_to_12_months",
      edAgeConfirmed: false,
    })
    expect(result.isValid).toBe(false)
  })
})

describe("ED Assessment Step Validation (IIEF-5)", () => {
  const validIief = { iief1: 3, iief2: 4, iief3: 3, iief4: 2, iief5: 4 }

  it("passes with all 5 scores", () => {
    const result = validateEdAssessmentStep(validIief)
    expect(result.isValid).toBe(true)
  })

  it("fails when any score is missing", () => {
    const { iief3: _, ...missing } = validIief
    const result = validateEdAssessmentStep(missing)
    expect(result.isValid).toBe(false)
    expect(result.errors.iief3).toBeTruthy()
  })

  it("fails when score is out of range", () => {
    const result = validateEdAssessmentStep({ ...validIief, iief1: 0 })
    expect(result.isValid).toBe(false)
  })

  it("fails when score exceeds 5", () => {
    const result = validateEdAssessmentStep({ ...validIief, iief2: 6 })
    expect(result.isValid).toBe(false)
  })
})

describe("ED Health Step Validation", () => {
  const baseHealth = {
    edNitrates: false,
    edRecentHeartEvent: false,
    edSevereHeart: false,
  }

  it("passes with minimum required fields", () => {
    const result = validateEdHealthStep(baseHealth)
    expect(result.isValid).toBe(true)
  })

  it("fails (hard block) when nitrates is true", () => {
    const result = validateEdHealthStep({ ...baseHealth, edNitrates: true })
    expect(result.isValid).toBe(false)
    expect(result.errors.edNitrates).toBeTruthy()
  })

  it("fails when recentHeartEvent is true without GP clearance", () => {
    const result = validateEdHealthStep({
      ...baseHealth,
      edRecentHeartEvent: true,
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.edGpCleared).toBeTruthy()
  })

  it("passes when recentHeartEvent is true WITH GP clearance", () => {
    const result = validateEdHealthStep({
      ...baseHealth,
      edRecentHeartEvent: true,
      edGpCleared: true,
    })
    expect(result.isValid).toBe(true)
  })

  it("fails when severeHeart is true without GP clearance", () => {
    const result = validateEdHealthStep({
      ...baseHealth,
      edSevereHeart: true,
    })
    expect(result.isValid).toBe(false)
  })

  it("requires allergy details when has_allergies is yes", () => {
    const result = validateEdHealthStep({
      ...baseHealth,
      has_allergies: "yes",
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.known_allergies).toBeTruthy()
  })

  it("passes when has_allergies is yes with details", () => {
    const result = validateEdHealthStep({
      ...baseHealth,
      has_allergies: "yes",
      known_allergies: "Penicillin",
    })
    expect(result.isValid).toBe(true)
  })

  it("requires medication details when takes_medications is yes", () => {
    const result = validateEdHealthStep({
      ...baseHealth,
      takes_medications: "yes",
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.current_medications).toBeTruthy()
  })

  it("requires condition details when has_conditions is yes", () => {
    const result = validateEdHealthStep({
      ...baseHealth,
      has_conditions: "yes",
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.existing_conditions).toBeTruthy()
  })
})

describe("ED Preferences Step Validation", () => {
  it("passes with a valid preference", () => {
    const result = validateEdPreferencesStep({ edPreference: "daily" })
    expect(result.isValid).toBe(true)
  })

  it("passes with doctor_decides", () => {
    const result = validateEdPreferencesStep({ edPreference: "doctor_decides" })
    expect(result.isValid).toBe(true)
  })

  it("fails when preference is missing", () => {
    const result = validateEdPreferencesStep({})
    expect(result.isValid).toBe(false)
    expect(result.errors.edPreference).toBeTruthy()
  })
})
```

**Step 2: Run tests**

Run: `pnpm test lib/__tests__/ed-intake-validation.test.ts`
Expected: All 16 tests pass.

**Step 3: Commit**

```bash
git add lib/__tests__/ed-intake-validation.test.ts
git commit -m "test(intake): add validation tests for 4-step ED flow

16 tests covering goals, IIEF-5 scoring, health safety blocks, GP clearance, conditional fields, and preferences."
```

---

### Task 4: Update Step Router + Time Estimates + Safety Pre-Check

**Files:**
- Modify: `components/request/step-router.tsx:20-38` (lazy load map)
- Modify: `components/request/time-remaining.tsx:7-24` (time estimates)
- Modify: `components/request/request-flow.tsx:72-80` (SAFETY_PRE_CHECK_STEPS)

**Step 1: Update the step router lazy-load map**

In `components/request/step-router.tsx`, find the `stepComponents` object and:
- Add: `'ed-goals-step'`, `'ed-health-step'`, `'ed-preferences-step'`
- Remove: `'ed-safety-step'`

```typescript
const stepComponents = {
  'certificate-step': lazy(() => import('./steps/certificate-step')),
  'symptoms-step': lazy(() => import('./steps/symptoms-step')),
  'medication-step': lazy(() => import('./steps/medication-step')),
  'medication-history-step': lazy(() => import('./steps/medication-history-step')),
  'medical-history-step': lazy(() => import('./steps/medical-history-step')),
  'consult-reason-step': lazy(() => import('./steps/consult-reason-step')),
  'patient-details-step': lazy(() => import('./steps/patient-details-step')),
  'review-step': lazy(() => import('./steps/review-step')),
  'checkout-step': lazy(() => import('./steps/checkout-step')),
  // ED-specific steps (4-step flow)
  'ed-goals-step': lazy(() => import('./steps/ed-goals-step')),
  'ed-assessment-step': lazy(() => import('./steps/ed-assessment-step')),
  'ed-health-step': lazy(() => import('./steps/ed-health-step')),
  'ed-preferences-step': lazy(() => import('./steps/ed-preferences-step')),
  // Other subtype steps
  'hair-loss-assessment-step': lazy(() => import('./steps/hair-loss-assessment-step')),
  'womens-health-type-step': lazy(() => import('./steps/womens-health-type-step')),
  'womens-health-assessment-step': lazy(() => import('./steps/womens-health-assessment-step')),
  'weight-loss-assessment-step': lazy(() => import('./steps/weight-loss-assessment-step')),
  'weight-loss-call-step': lazy(() => import('./steps/weight-loss-call-step')),
} as const
```

**Step 2: Update time estimates**

In `components/request/time-remaining.tsx`, update `STEP_TIME_ESTIMATES`:

```typescript
export const STEP_TIME_ESTIMATES: Record<string, number> = {
  'certificate': 30,
  'symptoms': 45,
  'medication': 60,
  'medication-history': 45,
  'medical-history': 60,
  'consult-reason': 45,
  // ED 4-step flow
  'ed-goals': 30,
  'ed-assessment': 60,
  'ed-health': 90,
  'ed-preferences': 30,
  // Other subtypes
  'hair-loss-assessment': 60,
  'womens-health-type': 20,
  'womens-health-assessment': 60,
  'weight-loss-assessment': 90,
  'weight-loss-call-scheduling': 30,
  // Common tail
  'details': 90,
  'review': 30,
  'checkout': 60,
}
```

**Step 3: Update SAFETY_PRE_CHECK_STEPS**

In `components/request/request-flow.tsx`, find `SAFETY_PRE_CHECK_STEPS` (line ~72) and update:

```typescript
const SAFETY_PRE_CHECK_STEPS = new Set([
  'symptoms',
  'medication',
  'medical-history',
  'ed-health',              // ED: safety gates are now in this consolidated step
  'weight-loss-assessment',
  'consult-reason',
])
```

Remove `'ed-assessment'` and `'ed-safety'` — the safety check now fires after `ed-health` which contains the nitrate/cardiac questions.

**Step 4: Commit**

```bash
git add components/request/step-router.tsx components/request/time-remaining.tsx components/request/request-flow.tsx
git commit -m "refactor(intake): wire ED step router, time estimates, safety pre-check

Add ed-goals-step, ed-health-step, ed-preferences-step to lazy load map. Remove ed-safety-step. Update time estimates for new step IDs. Safety pre-check fires after ed-health (consolidated)."
```

---

### Task 5: Build Step 1 — `ed-goals-step.tsx`

**Files:**
- Create: `components/request/steps/ed-goals-step.tsx`

**Step 1: Create the component**

```tsx
"use client"

import { useCallback, useMemo } from "react"
import { Target, Clock, Sparkles, Shield, Heart, Stethoscope, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { stagger } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface EdGoalsStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const GOAL_OPTIONS = [
  { value: "improve_erections", label: "Improve erections", icon: Target },
  { value: "more_spontaneity", label: "More spontaneity", icon: Sparkles },
  { value: "boost_confidence", label: "Boost confidence", icon: Shield },
  { value: "better_stamina", label: "Better stamina", icon: Heart },
  { value: "maintain", label: "Maintain what I have", icon: Stethoscope },
] as const

const DURATION_OPTIONS = [
  { value: "under_3_months", label: "< 3 months" },
  { value: "3_to_12_months", label: "3\u201312 months" },
  { value: "1_to_3_years", label: "1\u20133 years" },
  { value: "over_3_years", label: "3+ years" },
] as const

export default function EdGoalsStep({ onNext }: EdGoalsStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const prefersReducedMotion = useReducedMotion()

  const edGoal = (answers.edGoal as string) || ""
  const edDuration = (answers.edDuration as string) || ""
  const edAgeConfirmed = answers.edAgeConfirmed as boolean | undefined

  const isComplete = useMemo(
    () => !!edGoal && !!edDuration && edAgeConfirmed === true,
    [edGoal, edDuration, edAgeConfirmed],
  )

  const handleNext = useCallback(() => {
    if (isComplete) onNext()
  }, [isComplete, onNext])

  useKeyboardNavigation({ onNext: handleNext, enabled: isComplete })

  return (
    <div className="space-y-6">
      {/* Age gate */}
      <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/30">
        <Switch
          id="edAgeConfirmed"
          checked={edAgeConfirmed === true}
          onCheckedChange={(checked) => setAnswer("edAgeConfirmed", checked)}
        />
        <Label htmlFor="edAgeConfirmed" className="text-sm leading-relaxed cursor-pointer">
          I confirm I am 18 years or older
        </Label>
      </div>

      {/* Intro */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Let&apos;s start with what matters to you
        </h2>
        <p className="text-sm text-muted-foreground">
          Your answers help our doctor tailor the right approach. Everything is confidential.
        </p>
      </div>

      {/* Goal selection — chip grid */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          What&apos;s your main goal?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <motion.div
          variants={prefersReducedMotion ? {} : stagger.container}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-2"
        >
          {GOAL_OPTIONS.map((option) => {
            const Icon = option.icon
            const isSelected = edGoal === option.value
            return (
              <motion.button
                key={option.value}
                type="button"
                variants={prefersReducedMotion ? {} : stagger.item}
                onClick={() => setAnswer("edGoal", option.value)}
                className={cn(
                  "flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30 font-medium"
                    : "border-border/50 hover:border-primary/50 bg-white dark:bg-card",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{option.label}</span>
              </motion.button>
            )
          })}
        </motion.div>
      </div>

      {/* Duration — segmented selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          How long has this been a concern?
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="flex gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/50">
          {DURATION_OPTIONS.map((option) => {
            const isSelected = edDuration === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setAnswer("edDuration", option.value)}
                className={cn(
                  "flex-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all text-center",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Trust message */}
      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Heart className="w-4 h-4" />
        <AlertDescription className="text-xs">
          Your answers help our doctor understand your situation. All information is kept strictly confidential.
        </AlertDescription>
      </Alert>

      {/* Continue */}
      <Button
        onClick={handleNext}
        disabled={!isComplete}
        className="w-full h-12 text-base font-medium"
      >
        Continue
      </Button>
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new type errors from this file (other files may still have pre-existing errors from Task 1 until all steps are created).

**Step 3: Commit**

```bash
git add components/request/steps/ed-goals-step.tsx
git commit -m "feat(intake): add ed-goals step — goal chips + duration selector

Step 1 of 4-step ED flow. Chip grid for goal selection, segmented duration picker, age gate. Uses stagger animation, keyboard nav, Morning Canvas tokens."
```

---

### Task 6: Build Step 2 — `ed-assessment-step.tsx` (IIEF-5)

**Files:**
- Modify: `components/request/steps/ed-assessment-step.tsx` (full rewrite)

**Step 1: Rewrite the component with visual IIEF-5**

Replace the entire file content:

```tsx
"use client"

import { useCallback, useMemo, useEffect } from "react"
import { AlertCircle, TrendingUp, Info } from "lucide-react"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { fadeUp, stagger } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface EdAssessmentStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const IIEF_QUESTIONS = [
  {
    id: "iief1",
    question: "How confident are you that you can get and keep an erection?",
    low: "Not at all",
    high: "Very confident",
  },
  {
    id: "iief2",
    question: "When you had erections, how often were they hard enough for penetration?",
    low: "Almost never",
    high: "Almost always",
  },
  {
    id: "iief3",
    question: "During intercourse, how often were you able to maintain your erection?",
    low: "Almost never",
    high: "Almost always",
  },
  {
    id: "iief4",
    question: "How difficult was it to maintain your erection to completion?",
    low: "Extremely difficult",
    high: "Not difficult",
  },
  {
    id: "iief5",
    question: "When you attempted intercourse, how often was it satisfactory?",
    low: "Almost never",
    high: "Almost always",
  },
] as const

function getScoreInterpretation(total: number): {
  label: string
  message: string
  colorClass: string
} {
  if (total >= 22)
    return {
      label: "Mild",
      message: "Your responses suggest mild difficulty. A doctor can still help.",
      colorClass: "text-success",
    }
  if (total >= 17)
    return {
      label: "Mild–moderate",
      message: "Moderate symptoms like these respond well to treatment.",
      colorClass: "text-primary",
    }
  if (total >= 12)
    return {
      label: "Moderate",
      message: "Treatment is very effective at this level.",
      colorClass: "text-primary",
    }
  return {
    label: "Significant",
    message: "Our doctors regularly help patients in your situation.",
    colorClass: "text-warning",
  }
}

interface ScalePickerProps {
  value: number | undefined
  onChange: (value: number) => void
  lowLabel: string
  highLabel: string
}

function ScalePicker({ value, onChange, lowLabel, highLabel }: ScalePickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground scale-110"
                  : "border-border/50 bg-white dark:bg-card text-muted-foreground hover:border-primary/50",
              )}
              aria-label={`${n} out of 5`}
            >
              {n}
            </button>
          )
        })}
      </div>
      {/* Scale labels */}
      <div className="flex justify-between px-1">
        <span className="text-[11px] text-muted-foreground">{lowLabel}</span>
        <span className="text-[11px] text-muted-foreground">{highLabel}</span>
      </div>
    </div>
  )
}

export default function EdAssessmentStep({ onNext }: EdAssessmentStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const prefersReducedMotion = useReducedMotion()

  // Read IIEF scores from store
  const scores = useMemo(
    () =>
      IIEF_QUESTIONS.map((q) => answers[q.id] as number | undefined),
    [answers],
  )

  const allAnswered = useMemo(() => scores.every((s) => s !== undefined), [scores])

  const iiefTotal = useMemo(
    () => (allAnswered ? (scores as number[]).reduce((a, b) => a + b, 0) : null),
    [scores, allAnswered],
  )

  // Persist total to store for review step + followup delta
  useEffect(() => {
    if (iiefTotal !== null) {
      setAnswer("iiefTotal", iiefTotal)
    }
  }, [iiefTotal, setAnswer])

  const handleNext = useCallback(() => {
    if (allAnswered) onNext()
  }, [allAnswered, onNext])

  useKeyboardNavigation({ onNext: handleNext, enabled: allAnswered })

  const interpretation = iiefTotal !== null ? getScoreInterpretation(iiefTotal) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          A few questions about your experience
        </h2>
        <p className="text-sm text-muted-foreground">
          These are standard questions doctors use worldwide. There are no wrong answers.
        </p>
      </div>

      {/* IIEF-5 Questions */}
      <motion.div
        variants={prefersReducedMotion ? {} : stagger.container}
        initial="initial"
        animate="animate"
        className="space-y-4"
      >
        {IIEF_QUESTIONS.map((q, i) => (
          <motion.div
            key={q.id}
            variants={prefersReducedMotion ? {} : stagger.item}
            className="p-4 rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm shadow-primary/[0.04] space-y-3"
          >
            <p className="text-sm font-medium leading-relaxed">
              <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
              {q.question}
            </p>
            <ScalePicker
              value={scores[i]}
              onChange={(v) => setAnswer(q.id, v)}
              lowLabel={q.low}
              highLabel={q.high}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Score interpretation */}
      {interpretation && iiefTotal !== null && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border bg-muted/30 space-y-2"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Your score: <span className={interpretation.colorClass}>{iiefTotal}/25</span>
              {" \u2014 "}
              <span className={interpretation.colorClass}>{interpretation.label}</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{interpretation.message}</p>
        </motion.div>
      )}

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          This is the IIEF-5, a validated clinical questionnaire used by doctors worldwide to assess erectile function.
        </span>
      </div>

      {/* Continue */}
      <Button
        onClick={handleNext}
        disabled={!allAnswered}
        className="w-full h-12 text-base font-medium"
      >
        Continue
      </Button>
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new errors from this file.

**Step 3: Commit**

```bash
git add components/request/steps/ed-assessment-step.tsx
git commit -m "feat(intake): replace ED assessment with visual IIEF-5

5-point scale pickers for each IIEF-5 question. Auto-computed total score with interpretation. Persists iiefTotal to store for review + followup delta tracking. Removes TGA-violating drug names."
```

---

### Task 7: Build Step 3 — `ed-health-step.tsx` (Consolidated)

**Files:**
- Create: `components/request/steps/ed-health-step.tsx`

**Step 1: Create the consolidated health + safety step**

```tsx
"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  HeartPulse,
  Pill,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Stethoscope,
  Activity,
  CheckCircle2,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface EdHealthStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

interface SwitchFieldProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  helpText?: string
}

function SwitchField({ id, label, checked, onChange, helpText }: SwitchFieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30">
      <div className="flex-1">
        <Label htmlFor={id} className="text-sm cursor-pointer leading-snug">
          {label}
        </Label>
        {helpText && (
          <p className="text-xs text-muted-foreground mt-0.5">{helpText}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function SectionComplete({ complete }: { complete: boolean }) {
  if (!complete) return null
  return <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
}

export default function EdHealthStep({ onNext, onBack }: EdHealthStepProps) {
  const router = useRouter()
  const { answers, setAnswer } = useRequestStore()
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState("")

  // --- Store values ---
  const edNitrates = (answers.edNitrates as boolean) ?? false
  const edRecentHeartEvent = (answers.edRecentHeartEvent as boolean) ?? false
  const edSevereHeart = (answers.edSevereHeart as boolean) ?? false
  const edGpCleared = (answers.edGpCleared as boolean) ?? false
  const edHypertension = (answers.edHypertension as boolean) ?? false
  const edDiabetes = (answers.edDiabetes as boolean) ?? false
  const edBpMedication = (answers.edBpMedication as boolean) ?? false

  const hasAllergies = (answers.has_allergies as string) || ""
  const knownAllergies = (answers.known_allergies as string) || ""
  const hasConditions = (answers.has_conditions as string) || ""
  const existingConditions = (answers.existing_conditions as string) || ""
  const takesMedications = (answers.takes_medications as string) || ""
  const currentMedications = (answers.current_medications as string) || ""

  const previousEdMeds = (answers.previousEdMeds as boolean) ?? false
  const edPreviousTreatment = (answers.edPreviousTreatment as string) || ""
  const edPreviousEffectiveness = (answers.edPreviousEffectiveness as string) || ""

  // --- Section completion ---
  const heartComplete = useMemo(() => {
    // Heart section requires explicit interaction (the booleans default to false,
    // but we want to know they've been "set" — check if any key exists in answers)
    return answers.edNitrates !== undefined
  }, [answers.edNitrates])

  const bpComplete = true // Optional fields, always "complete"
  const medsComplete = useMemo(
    () => takesMedications === "" || takesMedications === "no" || (takesMedications === "yes" && currentMedications.trim().length > 0),
    [takesMedications, currentMedications],
  )
  const allergiesComplete = useMemo(
    () => hasAllergies === "" || hasAllergies === "no" || (hasAllergies === "yes" && knownAllergies.trim().length > 0),
    [hasAllergies, knownAllergies],
  )
  const conditionsComplete = useMemo(
    () => hasConditions === "" || hasConditions === "no" || (hasConditions === "yes" && existingConditions.trim().length > 0),
    [hasConditions, existingConditions],
  )
  const previousComplete = true // Optional

  // --- Safety logic ---
  const handleNitrateChange = useCallback(
    (checked: boolean) => {
      setAnswer("edNitrates", checked)
      if (checked) {
        setIsBlocked(true)
        setBlockReason(
          "ED medications can cause a dangerous drop in blood pressure when combined with nitrates. Please see your GP or cardiologist.",
        )
      }
    },
    [setAnswer],
  )

  const needsGpClearance = edRecentHeartEvent || edSevereHeart
  const gpClearanceOk = !needsGpClearance || edGpCleared

  const isValid = useMemo(
    () =>
      answers.edNitrates !== undefined &&
      !edNitrates &&
      gpClearanceOk &&
      medsComplete &&
      allergiesComplete &&
      conditionsComplete,
    [answers.edNitrates, edNitrates, gpClearanceOk, medsComplete, allergiesComplete, conditionsComplete],
  )

  const handleNext = useCallback(() => {
    if (isValid) onNext()
  }, [isValid, onNext])

  useKeyboardNavigation({ onNext: handleNext, enabled: isValid })

  // --- Hard block screen ---
  if (isBlocked) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive" className="border-destructive/50">
          <XCircle className="w-5 h-5" />
          <AlertTitle className="font-semibold">
            This service is not suitable for you
          </AlertTitle>
          <AlertDescription className="mt-2 text-sm">
            {blockReason}
          </AlertDescription>
        </Alert>
        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
          <h4 className="text-sm font-medium">What you can do</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>Book an appointment with your GP or cardiologist</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span>They can assess your situation in person and discuss safe options</span>
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="outline" onClick={() => router.push("/")} className="w-full">
            Return home
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setIsBlocked(false)
              setAnswer("edNitrates", false)
            }}
            className="w-full"
          >
            Go back and change answer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">A quick health check</h2>
        <p className="text-sm text-muted-foreground">
          We need to make sure treatment is safe for you. Most people finish this in under 2 minutes.
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["heart"]} className="space-y-2">
        {/* Section 1: Heart & blood pressure */}
        <AccordionItem value="heart" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <HeartPulse className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Heart &amp; blood pressure</span>
              <SectionComplete complete={heartComplete} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {/* Nitrates — hard block */}
            <SwitchField
              id="edNitrates"
              label="Do you take nitrate medications (e.g. for angina or chest pain)?"
              checked={edNitrates}
              onChange={handleNitrateChange}
            />

            {/* Recent cardiac event — soft block */}
            <SwitchField
              id="edRecentHeartEvent"
              label="Have you had a heart attack, stroke, or heart surgery in the last 6 months?"
              checked={edRecentHeartEvent}
              onChange={(checked) => setAnswer("edRecentHeartEvent", checked)}
            />

            {/* Severe heart condition — soft block */}
            <SwitchField
              id="edSevereHeart"
              label="Do you have any serious heart condition (e.g. unstable angina, heart failure)?"
              checked={edSevereHeart}
              onChange={(checked) => setAnswer("edSevereHeart", checked)}
            />

            {/* GP clearance — shown if soft block triggered */}
            {needsGpClearance && (
              <div className="mt-2 p-3 rounded-xl border border-warning/30 bg-warning/5 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <p className="text-sm text-foreground">
                    For your safety, we recommend discussing with your GP first. If your GP has cleared you, you can continue.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="edGpCleared"
                    checked={edGpCleared}
                    onCheckedChange={(checked) =>
                      setAnswer("edGpCleared", checked === true)
                    }
                  />
                  <Label
                    htmlFor="edGpCleared"
                    className="text-sm cursor-pointer"
                  >
                    My GP has cleared me for ED treatment
                  </Label>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Blood pressure & diabetes */}
        <AccordionItem value="bp" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Blood pressure &amp; diabetes</span>
              <SectionComplete complete={bpComplete} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <SwitchField
              id="edHypertension"
              label="High blood pressure (hypertension)"
              checked={edHypertension}
              onChange={(checked) => setAnswer("edHypertension", checked)}
            />
            <SwitchField
              id="edDiabetes"
              label="Type 1 or type 2 diabetes"
              checked={edDiabetes}
              onChange={(checked) => setAnswer("edDiabetes", checked)}
            />
            <SwitchField
              id="edBpMedication"
              label="Currently taking blood pressure medication"
              checked={edBpMedication}
              onChange={(checked) => setAnswer("edBpMedication", checked)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Current medications */}
        <AccordionItem value="meds" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Pill className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current medications</span>
              <SectionComplete complete={medsComplete} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30">
              <Label className="text-sm cursor-pointer">
                Are you taking any medications?
              </Label>
              <Switch
                checked={takesMedications === "yes"}
                onCheckedChange={(checked) =>
                  setAnswer("takes_medications", checked ? "yes" : "no")
                }
              />
            </div>
            {takesMedications === "yes" && (
              <Textarea
                value={currentMedications}
                onChange={(e) =>
                  setAnswer("current_medications", e.target.value)
                }
                placeholder="List your current medications..."
                className="min-h-[80px] resize-none"
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Section 4: Allergies */}
        <AccordionItem value="allergies" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Allergies</span>
              <SectionComplete complete={allergiesComplete} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30">
              <Label className="text-sm cursor-pointer">
                Do you have any known allergies?
              </Label>
              <Switch
                checked={hasAllergies === "yes"}
                onCheckedChange={(checked) =>
                  setAnswer("has_allergies", checked ? "yes" : "no")
                }
              />
            </div>
            {hasAllergies === "yes" && (
              <Textarea
                value={knownAllergies}
                onChange={(e) => setAnswer("known_allergies", e.target.value)}
                placeholder="List your allergies (e.g. penicillin, aspirin)..."
                className="min-h-[80px] resize-none"
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Section 5: Other conditions */}
        <AccordionItem value="conditions" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Stethoscope className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Other conditions</span>
              <SectionComplete complete={conditionsComplete} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30">
              <Label className="text-sm cursor-pointer">
                Do you have any other medical conditions?
              </Label>
              <Switch
                checked={hasConditions === "yes"}
                onCheckedChange={(checked) =>
                  setAnswer("has_conditions", checked ? "yes" : "no")
                }
              />
            </div>
            {hasConditions === "yes" && (
              <Textarea
                value={existingConditions}
                onChange={(e) =>
                  setAnswer("existing_conditions", e.target.value)
                }
                placeholder="List your conditions..."
                className="min-h-[80px] resize-none"
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Section 6: Previous ED treatment */}
        <AccordionItem value="previous" className="border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Pill className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Previous ED treatment</span>
              <SectionComplete complete={previousComplete} />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border bg-muted/30">
              <Label className="text-sm cursor-pointer">
                Have you tried ED treatment before?
              </Label>
              <Switch
                checked={previousEdMeds}
                onCheckedChange={(checked) =>
                  setAnswer("previousEdMeds", checked)
                }
              />
            </div>
            {previousEdMeds && (
              <>
                <Textarea
                  value={edPreviousTreatment}
                  onChange={(e) =>
                    setAnswer("edPreviousTreatment", e.target.value)
                  }
                  placeholder="What did you try?"
                  className="min-h-[60px] resize-none"
                />
                <div className="space-y-2">
                  <Label className="text-sm">How well did it work?</Label>
                  <div className="flex gap-2">
                    {(
                      [
                        { value: "worked_well", label: "Worked well" },
                        { value: "somewhat", label: "Somewhat" },
                        { value: "didnt_work", label: "Didn't work" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setAnswer("edPreviousEffectiveness", opt.value)
                        }
                        className={cn(
                          "flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all",
                          edPreviousEffectiveness === opt.value
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border/50 text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Continue */}
      <Button
        onClick={handleNext}
        disabled={!isValid}
        className="w-full h-12 text-base font-medium"
      >
        Continue
      </Button>
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new errors from this file. Check that `Accordion` is available from shadcn/ui. If not installed:

Run: `ls components/ui/accordion.tsx`
If missing, run: `pnpm dlx shadcn@latest add accordion` (uses existing shadcn config).

**Step 3: Commit**

```bash
git add components/request/steps/ed-health-step.tsx
git commit -m "feat(intake): add ed-health step — consolidated safety + medical history

6 collapsible accordion sections: heart safety (nitrate hard block, cardiac soft blocks with GP clearance), BP/diabetes, medications, allergies, conditions, previous ED treatment. Replaces ed-safety-step + absorbs medical-history for ED flow."
```

---

### Task 8: Build Step 4 — `ed-preferences-step.tsx`

**Files:**
- Create: `components/request/steps/ed-preferences-step.tsx`

**Step 1: Create the TGA-compliant preferences step**

```tsx
"use client"

import { useCallback, useMemo } from "react"
import { CalendarDays, Clock, Stethoscope, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { stagger } from "@/lib/motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRequestStore } from "../store"
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface EdPreferencesStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

const PREFERENCE_OPTIONS = [
  {
    value: "daily",
    icon: CalendarDays,
    title: "Daily \u2014 always ready",
    description:
      "One small tablet each day. No planning needed \u2014 be ready whenever the moment happens.",
    chips: ["No timing pressure", "Consistent results", "Suits regular activity"],
  },
  {
    value: "prn",
    icon: Clock,
    title: "As-needed \u2014 use when you want",
    description:
      "Take a tablet 30\u201360 minutes before. Use only when you need it.",
    chips: ["Flexible", "Lower cost", "Suits occasional use"],
  },
  {
    value: "doctor_decides",
    icon: Stethoscope,
    title: "Not sure \u2014 let the doctor decide",
    description:
      "Your doctor will recommend the best option based on your assessment.",
    chips: ["Expert guidance", "Personalised"],
  },
] as const

export default function EdPreferencesStep({ onNext }: EdPreferencesStepProps) {
  const { answers, setAnswer } = useRequestStore()
  const prefersReducedMotion = useReducedMotion()

  const edPreference = (answers.edPreference as string) || ""

  const isComplete = useMemo(() => !!edPreference, [edPreference])

  const handleNext = useCallback(() => {
    if (isComplete) onNext()
  }, [isComplete, onNext])

  useKeyboardNavigation({ onNext: handleNext, enabled: isComplete })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          How would you like treatment to fit your life?
        </h2>
        <p className="text-sm text-muted-foreground">
          Your doctor will prescribe the most appropriate medication based on your health profile.
        </p>
      </div>

      {/* Treatment cards */}
      <motion.div
        variants={prefersReducedMotion ? {} : stagger.container}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {PREFERENCE_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = edPreference === option.value
          return (
            <motion.button
              key={option.value}
              type="button"
              variants={prefersReducedMotion ? {} : stagger.item}
              onClick={() => setAnswer("edPreference", option.value)}
              className={cn(
                "w-full flex flex-col items-start gap-3 p-4 rounded-2xl border text-left transition-all",
                isSelected
                  ? "border-primary ring-2 ring-primary shadow-lg shadow-primary/[0.1]"
                  : "border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08]",
              )}
            >
              <div className="flex items-center gap-3 w-full">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold flex-1">{option.title}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {option.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {option.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-muted/50 text-xs px-2.5 py-1 text-muted-foreground"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Trust reassurance */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          Your doctor will review your full health profile and prescribe the safest, most effective option for you.
        </span>
      </div>

      {/* Continue */}
      <Button
        onClick={handleNext}
        disabled={!isComplete}
        className="w-full h-12 text-base font-medium"
      >
        Continue
      </Button>
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No errors.

**Step 3: Commit**

```bash
git add components/request/steps/ed-preferences-step.tsx
git commit -m "feat(intake): add ed-preferences step — TGA-compliant treatment selection

Lifestyle framing (daily vs as-needed vs doctor decides) without Schedule 4 drug names. Tier 2 elevated cards with ring selection. Benefit chips per option."
```

---

## Phase B: Enhancements (Tasks 9–13)

### Task 9: Add Height/Weight + BMI to Details Step (ED subtype)

**Files:**
- Modify: `components/request/steps/patient-details-step.tsx`

**Step 1: Read the current details step**

Read `components/request/steps/patient-details-step.tsx` to find where to add fields. Look for the pattern where subtype-specific fields are conditionally shown (e.g., phone for prescriptions/consults).

**Step 2: Add height/weight/BMI fields**

After the phone field section, add a conditional block for ED subtype:

```tsx
// Add this import at top
import { useEffect } from "react"

// Inside the component, after phone field, add:
{/* Height/Weight/BMI — ED subtype only */}
{consultSubtype === "ed" && (
  <div className="space-y-3">
    <Label className="text-sm font-medium">Height &amp; weight</Label>
    <p className="text-xs text-muted-foreground -mt-1">
      Helps your doctor assess your overall health profile.
    </p>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="heightCm" className="text-xs">Height (cm)</Label>
        <Input
          id="heightCm"
          type="number"
          inputMode="numeric"
          placeholder="175"
          value={answers.heightCm as string || ""}
          onChange={(e) => setAnswer("heightCm", e.target.value)}
          min={100}
          max={250}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="weightKg" className="text-xs">Weight (kg)</Label>
        <Input
          id="weightKg"
          type="number"
          inputMode="numeric"
          placeholder="80"
          value={answers.weightKg as string || ""}
          onChange={(e) => setAnswer("weightKg", e.target.value)}
          min={30}
          max={300}
        />
      </div>
    </div>
    {/* BMI auto-calculation */}
    {answers.heightCm && answers.weightKg && (
      <BmiDisplay
        heightCm={Number(answers.heightCm)}
        weightKg={Number(answers.weightKg)}
        onBmiCalculated={(bmi) => setAnswer("bmi", bmi)}
      />
    )}
  </div>
)}
```

**Step 3: Create BmiDisplay helper component inline**

Add before the default export in the same file:

```tsx
function BmiDisplay({
  heightCm,
  weightKg,
  onBmiCalculated,
}: {
  heightCm: number
  weightKg: number
  onBmiCalculated: (bmi: number) => void
}) {
  const bmi = useMemo(() => {
    if (heightCm < 100 || heightCm > 250 || weightKg < 30 || weightKg > 300) return null
    const heightM = heightCm / 100
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10
  }, [heightCm, weightKg])

  useEffect(() => {
    if (bmi !== null) onBmiCalculated(bmi)
  }, [bmi, onBmiCalculated])

  if (bmi === null) return null

  const category =
    bmi < 18.5 ? { label: "Underweight", color: "text-warning" } :
    bmi < 25 ? { label: "Normal weight", color: "text-success" } :
    bmi < 30 ? { label: "Overweight", color: "text-warning" } :
    { label: "Obese", color: "text-destructive" }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border text-sm">
      <span className="text-muted-foreground">BMI:</span>
      <span className="font-medium">{bmi}</span>
      <span className={cn("text-xs", category.color)}>{category.label}</span>
    </div>
  )
}
```

Note: You'll need to read the file first to find exact insertion points and understand which imports are already present (`Input`, `Label`, `useMemo`, etc.).

**Step 4: Commit**

```bash
git add components/request/steps/patient-details-step.tsx
git commit -m "feat(intake): add height/weight + BMI auto-calc for ED subtype

Shows height/weight fields when consultSubtype is 'ed'. Auto-calculates BMI with color-coded interpretation. Persists bmi to store."
```

---

### Task 10: Delete Old `ed-safety-step.tsx`

**Files:**
- Delete: `components/request/steps/ed-safety-step.tsx`

**Step 1: Delete the file**

```bash
rm components/request/steps/ed-safety-step.tsx
```

**Step 2: Verify no remaining imports**

Run: `pnpm typecheck`

The step router no longer references `ed-safety-step` (updated in Task 4). If any other file imports it, fix those references.

Run: `grep -r "ed-safety-step" --include="*.ts" --include="*.tsx" .`
Expected: No results (all references were updated in prior tasks).

**Step 3: Commit**

```bash
git add -u components/request/steps/ed-safety-step.tsx
git commit -m "refactor(intake): remove ed-safety-step (merged into ed-health)

Safety screening (nitrates, cardiac events, severe conditions) now lives in ed-health-step accordion sections."
```

---

### Task 11: Update Safety Engine Store Keys

**Files:**
- Modify: `lib/safety/` (check if safety rules reference old `edSafety_` prefixed keys)

**Step 1: Search for old store key references**

Run: `grep -r "edSafety_" --include="*.ts" --include="*.tsx" .`

If any safety rule configs in `lib/safety/` reference `edSafety_nitrates`, `edSafety_recentHeartEvent`, etc., update them to use the new keys: `edNitrates`, `edRecentHeartEvent`, `edSevereHeart`.

The old `ed-safety-step.tsx` used `edSafety_${questionId}` format (e.g. `edSafety_nitrates`). The new `ed-health-step.tsx` uses flat keys (`edNitrates`). Safety evaluation in `request-flow.tsx` uses `evaluateSafety(slug, answers)` which checks the `answers` object — so the safety rule configs must match the new key names.

**Step 2: Update any matching rules**

For each file found in the grep, change:
- `edSafety_nitrates` → `edNitrates`
- `edSafety_recentHeartEvent` → `edRecentHeartEvent`
- `edSafety_severeHeartCondition` → `edSevereHeart`
- `edSafety_previousEdMeds` → `previousEdMeds`

**Step 3: Also update doctor portal clinical summary**

Run: `grep -r "edSafety_" components/doctor/ --include="*.tsx"`

If `clinical-summary.tsx` renders `edSafety_` keys, update to new key names.

**Step 4: Commit**

```bash
git add -A  # careful: review staged files
git commit -m "refactor(intake): update safety engine + doctor portal to new ED store keys

edSafety_nitrates → edNitrates, edSafety_recentHeartEvent → edRecentHeartEvent, edSafety_severeHeartCondition → edSevereHeart. Matches new ed-health-step field names."
```

---

### Task 12: Update Review Step for IIEF-5 Score

**Files:**
- Modify: `components/request/steps/review-step.tsx`

**Step 1: Read the review step**

Read `components/request/steps/review-step.tsx` to find where ED-specific summary data is rendered.

**Step 2: Add IIEF-5 score display**

In the ED-specific section of the review step, add:

```tsx
{/* IIEF-5 Score — only for ED */}
{answers.iiefTotal !== undefined && (
  <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
    <span className="text-sm text-muted-foreground">IIEF-5 score</span>
    <span className="text-sm font-medium">
      {answers.iiefTotal as number}/25
    </span>
  </div>
)}
```

Also add the new fields: `edGoal`, `edDuration`, `edPreference` (with human-readable labels).

**Step 3: Commit**

```bash
git add components/request/steps/review-step.tsx
git commit -m "feat(intake): show IIEF-5 score + new ED fields in review step

Displays iiefTotal, edGoal, edDuration, edPreference in the ED review summary."
```

---

### Task 13: PostHog Analytics — Section-Level Tracking

**Files:**
- Modify: `components/request/steps/ed-health-step.tsx`

**Step 1: Add section open/complete tracking**

Import PostHog and add tracking when accordion sections are opened and completed:

```tsx
import { usePostHog } from "@/components/providers/posthog-provider"

// Inside the component:
const posthog = usePostHog()

// Add onValueChange to Accordion:
<Accordion
  type="multiple"
  defaultValue={["heart"]}
  className="space-y-2"
  onValueChange={(openSections) => {
    posthog?.capture("ed_health_sections_viewed", {
      open_sections: openSections,
      section_count: openSections.length,
    })
  }}
>
```

**Step 2: Commit**

```bash
git add components/request/steps/ed-health-step.tsx
git commit -m "feat(analytics): track ED health accordion section views in PostHog

Fires ed_health_sections_viewed with open section IDs when user expands/collapses accordion sections."
```

---

## Phase C: Cleanup + Docs (Tasks 14–16)

### Task 14: Run Full Test Suite + Typecheck

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean pass (0 errors).

**Step 2: Run unit tests**

Run: `pnpm test`
Expected: All tests pass including new `ed-intake-validation.test.ts`.

**Step 3: Run lint**

Run: `pnpm lint`
Expected: Clean (no `console.log`, no unused imports).

**Step 4: Run build**

Run: `pnpm build`
Expected: Clean production build.

Fix any issues found. Commit fixes.

---

### Task 15: Update Documentation

**Files:**
- Modify: `ARCHITECTURE.md` — update intake step table for ED subtype
- Modify: `CLAUDE.md` — update Key Workflows section for ED flow, note IIEF-5

**Step 1: Update ARCHITECTURE.md**

Find the intake step table for ED and update to show the new 4 steps:
- `ed-goals` → "What's going on" — goal + duration
- `ed-assessment` → "How it's affecting you" — IIEF-5
- `ed-health` → "Your health" — consolidated safety + medical history (6 accordion sections)
- `ed-preferences` → "Your preferences" — TGA-compliant treatment style

**Step 2: Update CLAUDE.md Key Workflows**

Add to the specialty services section:
- "ED intake uses 4-step flow (ed-goals → ed-assessment → ed-health → ed-preferences) + common tail"
- "IIEF-5 validated questionnaire produces iiefTotal (5-25) persisted for followup delta tracking"
- "No Schedule 4 drug names in UI — treatment preference uses lifestyle framing (daily vs as-needed vs doctor-decides)"
- "ed-health consolidates safety screening (nitrates hard block, cardiac soft blocks with GP clearance) + medical history into 6 collapsible accordion sections"

**Step 3: Commit**

```bash
git add ARCHITECTURE.md CLAUDE.md
git commit -m "docs: update ARCHITECTURE.md and CLAUDE.md for ED intake redesign

Document 4-step flow, IIEF-5 scoring, TGA-compliant preferences, consolidated health step."
```

---

### Task 16: Final Verification

**Step 1: Manual smoke test**

Navigate to `http://localhost:3000/request?service=consult&subtype=ed` and walk through all 7 steps:

1. **Goals:** Select a goal chip, select duration, confirm age → Continue
2. **Assessment:** Answer all 5 IIEF-5 questions → see score interpretation → Continue
3. **Health:** Open heart section, toggle nitrates off, check other sections → Continue
4. **Preferences:** Select a treatment style → Continue
5. **Details:** Fill identity + height/weight → see BMI → Continue
6. **Review:** Verify IIEF-5 score, goal, duration, preference show correctly
7. **Checkout:** Verify Stripe session creates correctly

**Step 2: Test safety blocks**

- Toggle nitrates ON → hard block screen appears
- Toggle recent heart event ON → GP clearance checkbox appears → can't continue without checking it

**Step 3: Test progress bar**

- Verify 7 segments show in progress bar
- Verify time estimate shows ~6 min on step 1
- Verify clicking completed steps navigates back

---

## File Summary

| Action | File |
|--------|------|
| Modify | `lib/request/step-registry.ts` |
| Modify | `lib/request/validation.ts` |
| Modify | `components/request/step-router.tsx` |
| Modify | `components/request/time-remaining.tsx` |
| Modify | `components/request/request-flow.tsx` |
| Modify | `components/request/steps/patient-details-step.tsx` |
| Modify | `components/request/steps/review-step.tsx` |
| Modify | `ARCHITECTURE.md` |
| Modify | `CLAUDE.md` |
| Create | `components/request/steps/ed-goals-step.tsx` |
| Create | `components/request/steps/ed-health-step.tsx` |
| Create | `components/request/steps/ed-preferences-step.tsx` |
| Create | `lib/__tests__/ed-intake-validation.test.ts` |
| Rewrite | `components/request/steps/ed-assessment-step.tsx` |
| Delete | `components/request/steps/ed-safety-step.tsx` |
| Modify (maybe) | `lib/safety/` rules + `components/doctor/clinical-summary.tsx` (store key migration) |

**Total: ~15 files, 16 tasks, 3 phases.**

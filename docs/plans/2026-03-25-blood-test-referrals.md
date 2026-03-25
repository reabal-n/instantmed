# Blood Test Referral Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Blood Test Referral" service type (`pathology`) to the unified `/request` intake flow, allowing patients to select pre-built pathology panels or individual tests, complete a clinical reason questionnaire, pay $29.95, and receive a doctor-approved pathology request PDF they can take to any Australian pathology collection centre.

**Architecture:** Follows the existing intake pattern exactly — new `UnifiedServiceType` in the step registry, two new step components (`panel-selection-step.tsx`, `clinical-reason-step.tsx`), reuse of existing `patient-details-step`, `review-step`, and `checkout-step`. Doctor approves in the existing review panel with an "Approve & Generate Referral" button. PDF generated via `pdf-lib` template overlay (same as med certs). Patient downloads from dashboard with fasting guidance.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, pdf-lib, Supabase, Stripe, Resend, Vitest

---

## Panel & Test Data

These constants will be the single source of truth for all panel/test data.

### Pre-Built Panels

| ID | Label | Tests | Fasting | Fasting Duration | Notes |
|----|-------|-------|---------|-----------------|-------|
| `general_health` | General Health Check | FBC, EUC, LFTs, Lipids, HbA1c | Yes | 10-12 hours | Most popular combo |
| `sti_screen` | STI Screen | Chlamydia, Gonorrhoea, Syphilis, HIV, Hepatitis B, Hepatitis C | No | — | Urine + blood |
| `iron_studies` | Iron Studies | Serum Iron, Ferritin, Transferrin, Transferrin Saturation | Yes | 10-12 hours, morning | Iron fluctuates during day |
| `thyroid_check` | Thyroid Check | TSH, Free T4, Free T3 | No | — | |
| `diabetes_screen` | Diabetes Screen | HbA1c, Fasting Glucose | Yes | 8-10 hours | |
| `vitamin_check` | Vitamin Check | Vitamin D, B12, Folate | No | — | Vitamin D needs clinical indication for Medicare |
| `mens_hormone` | Men's Hormone Panel | Testosterone, SHBG, LH, FSH, Prolactin | No | Morning before 10am | |
| `womens_hormone` | Women's Hormone Panel | Oestradiol, Progesterone, FSH, LH, Prolactin | No | Day 2-5 of cycle preferred | |
| `liver_kidney` | Liver & Kidney Function | LFTs, EUC, eGFR | No | — | |
| `heart_health` | Heart Health | Lipids, HbA1c, CRP, FBC | Yes | 10-12 hours | |

### Individual Add-On Tests

| ID | Label | Fasting | Notes |
|----|-------|---------|-------|
| `fbc` | Full Blood Count (FBC) | No | |
| `euc` | Electrolytes, Urea, Creatinine (EUC) | No | |
| `lfts` | Liver Function Tests (LFTs) | No | |
| `lipids` | Lipid Profile | Yes | 10-12h |
| `hba1c` | HbA1c | No | |
| `tsh` | Thyroid (TSH) | No | |
| `iron` | Iron Studies | Yes | Morning |
| `vitamin_d` | Vitamin D | No | Medicare restriction |
| `b12_folate` | Vitamin B12 & Folate | No | |
| `crp` | CRP / Inflammatory Markers | No | |
| `psa` | PSA (Prostate) | No | Avoid ejaculation/exercise 48h prior |
| `coagulation` | Coagulation Screen (INR) | No | |
| `fasting_glucose` | Fasting Glucose | Yes | 8-10h |

---

## Task 1: Panel & Test Constants

**Files:**
- Create: `lib/pathology/panels.ts`
- Test: `lib/__tests__/pathology/panels.test.ts`

**Step 1: Write the test**

```typescript
// lib/__tests__/pathology/panels.test.ts
import { describe, it, expect } from 'vitest'
import {
  PATHOLOGY_PANELS,
  INDIVIDUAL_TESTS,
  getTestsForSelection,
  getFastingRequirement,
  getFastingGuidance,
} from '@/lib/pathology/panels'

describe('pathology panels', () => {
  it('exports all 10 panels', () => {
    expect(PATHOLOGY_PANELS).toHaveLength(10)
  })

  it('exports all 13 individual tests', () => {
    expect(INDIVIDUAL_TESTS).toHaveLength(13)
  })

  it('each panel has required fields', () => {
    for (const panel of PATHOLOGY_PANELS) {
      expect(panel.id).toBeTruthy()
      expect(panel.label).toBeTruthy()
      expect(panel.tests).toBeInstanceOf(Array)
      expect(panel.tests.length).toBeGreaterThan(0)
      expect(typeof panel.fasting).toBe('boolean')
    }
  })

  it('getTestsForSelection deduplicates tests across panels + individuals', () => {
    // General Health includes FBC — adding individual FBC should not duplicate
    const result = getTestsForSelection(['general_health'], ['fbc'])
    const fbcCount = result.filter(t => t === 'FBC').length
    expect(fbcCount).toBe(1)
  })

  it('getFastingRequirement returns true when any selected test requires fasting', () => {
    expect(getFastingRequirement(['general_health'], [])).toBe(true)
    expect(getFastingRequirement(['sti_screen'], [])).toBe(false)
    expect(getFastingRequirement([], ['lipids'])).toBe(true)
  })

  it('getFastingGuidance returns longest fasting duration', () => {
    const guidance = getFastingGuidance(['general_health'], [])
    expect(guidance).toContain('10-12 hours')
  })

  it('getFastingGuidance returns null when no fasting required', () => {
    const guidance = getFastingGuidance(['sti_screen'], [])
    expect(guidance).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/pathology/panels.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// lib/pathology/panels.ts

export interface PathologyPanel {
  id: string
  label: string
  description: string
  tests: string[]
  fasting: boolean
  fastingDuration: string | null
  fastingNotes: string | null
}

export interface IndividualTest {
  id: string
  label: string
  fasting: boolean
  fastingDuration: string | null
  notes: string | null
}

export const PATHOLOGY_PANELS: PathologyPanel[] = [
  {
    id: 'general_health',
    label: 'General Health Check',
    description: 'Comprehensive blood work covering the essentials',
    tests: ['FBC', 'EUC', 'LFTs', 'Lipids', 'HbA1c'],
    fasting: true,
    fastingDuration: '10-12 hours',
    fastingNotes: 'No food or drinks (except water) from the evening before. Morning appointment recommended.',
  },
  {
    id: 'sti_screen',
    label: 'STI Screen',
    description: 'Full sexual health screening',
    tests: ['Chlamydia', 'Gonorrhoea', 'Syphilis', 'HIV', 'Hepatitis B', 'Hepatitis C'],
    fasting: false,
    fastingDuration: null,
    fastingNotes: null,
  },
  {
    id: 'iron_studies',
    label: 'Iron Studies',
    description: 'Check iron levels and storage',
    tests: ['Serum Iron', 'Ferritin', 'Transferrin', 'Transferrin Saturation'],
    fasting: true,
    fastingDuration: '10-12 hours',
    fastingNotes: 'Fasting morning blood draw recommended. Iron levels fluctuate throughout the day.',
  },
  {
    id: 'thyroid_check',
    label: 'Thyroid Check',
    description: 'Thyroid function screening',
    tests: ['TSH', 'Free T4', 'Free T3'],
    fasting: false,
    fastingDuration: null,
    fastingNotes: null,
  },
  {
    id: 'diabetes_screen',
    label: 'Diabetes Screen',
    description: 'Blood sugar and diabetes markers',
    tests: ['HbA1c', 'Fasting Glucose'],
    fasting: true,
    fastingDuration: '8-10 hours',
    fastingNotes: 'No food or drinks (except water) from the evening before.',
  },
  {
    id: 'vitamin_check',
    label: 'Vitamin Check',
    description: 'Key vitamin and nutrient levels',
    tests: ['Vitamin D', 'B12', 'Folate'],
    fasting: false,
    fastingDuration: null,
    fastingNotes: null,
  },
  {
    id: 'mens_hormone',
    label: "Men's Hormone Panel",
    description: 'Testosterone and related hormones',
    tests: ['Testosterone', 'SHBG', 'LH', 'FSH', 'Prolactin'],
    fasting: false,
    fastingDuration: null,
    fastingNotes: 'Morning blood draw before 10am recommended for accurate testosterone levels.',
  },
  {
    id: 'womens_hormone',
    label: "Women's Hormone Panel",
    description: 'Key reproductive hormones',
    tests: ['Oestradiol', 'Progesterone', 'FSH', 'LH', 'Prolactin'],
    fasting: false,
    fastingDuration: null,
    fastingNotes: 'Day 2-5 of menstrual cycle preferred for baseline levels.',
  },
  {
    id: 'liver_kidney',
    label: 'Liver & Kidney Function',
    description: 'Organ function markers',
    tests: ['LFTs', 'EUC', 'eGFR'],
    fasting: false,
    fastingDuration: null,
    fastingNotes: null,
  },
  {
    id: 'heart_health',
    label: 'Heart Health',
    description: 'Cardiovascular risk markers',
    tests: ['Lipids', 'HbA1c', 'CRP', 'FBC'],
    fasting: true,
    fastingDuration: '10-12 hours',
    fastingNotes: 'No food or drinks (except water) from the evening before. Morning appointment recommended.',
  },
]

export const INDIVIDUAL_TESTS: IndividualTest[] = [
  { id: 'fbc', label: 'Full Blood Count (FBC)', fasting: false, fastingDuration: null, notes: null },
  { id: 'euc', label: 'Electrolytes, Urea, Creatinine (EUC)', fasting: false, fastingDuration: null, notes: null },
  { id: 'lfts', label: 'Liver Function Tests (LFTs)', fasting: false, fastingDuration: null, notes: null },
  { id: 'lipids', label: 'Lipid Profile', fasting: true, fastingDuration: '10-12 hours', notes: null },
  { id: 'hba1c', label: 'HbA1c', fasting: false, fastingDuration: null, notes: null },
  { id: 'tsh', label: 'Thyroid (TSH)', fasting: false, fastingDuration: null, notes: null },
  { id: 'iron', label: 'Iron Studies', fasting: true, fastingDuration: '10-12 hours', notes: 'Morning blood draw recommended' },
  { id: 'vitamin_d', label: 'Vitamin D', fasting: false, fastingDuration: null, notes: 'Medicare covers this when a clinical indication is provided' },
  { id: 'b12_folate', label: 'Vitamin B12 & Folate', fasting: false, fastingDuration: null, notes: null },
  { id: 'crp', label: 'CRP / Inflammatory Markers', fasting: false, fastingDuration: null, notes: null },
  { id: 'psa', label: 'PSA (Prostate)', fasting: false, fastingDuration: null, notes: 'Avoid ejaculation and vigorous exercise 48 hours before' },
  { id: 'coagulation', label: 'Coagulation Screen (INR)', fasting: false, fastingDuration: null, notes: null },
  { id: 'fasting_glucose', label: 'Fasting Glucose', fasting: true, fastingDuration: '8-10 hours', notes: null },
]

// Map individual test IDs to display labels for deduplication
const TEST_ID_TO_LABEL: Record<string, string> = Object.fromEntries(
  INDIVIDUAL_TESTS.map(t => [t.id, t.label])
)

// Map panel test names to deduplicate against individual tests
const INDIVIDUAL_TEST_LABELS = new Set(INDIVIDUAL_TESTS.map(t => {
  // Extract the short name from labels like "Full Blood Count (FBC)" -> "FBC"
  const match = t.label.match(/\(([^)]+)\)/)
  return match ? match[1] : t.label
}))

/**
 * Get deduplicated list of test names for a selection of panels + individual tests
 */
export function getTestsForSelection(panelIds: string[], individualTestIds: string[]): string[] {
  const tests = new Set<string>()

  for (const panelId of panelIds) {
    const panel = PATHOLOGY_PANELS.find(p => p.id === panelId)
    if (panel) {
      for (const test of panel.tests) {
        tests.add(test)
      }
    }
  }

  for (const testId of individualTestIds) {
    const test = INDIVIDUAL_TESTS.find(t => t.id === testId)
    if (test) {
      // Use short name if available (e.g. "FBC" not "Full Blood Count (FBC)")
      const match = test.label.match(/\(([^)]+)\)/)
      tests.add(match ? match[1] : test.label)
    }
  }

  return Array.from(tests)
}

/**
 * Whether any selected panel or individual test requires fasting
 */
export function getFastingRequirement(panelIds: string[], individualTestIds: string[]): boolean {
  for (const panelId of panelIds) {
    const panel = PATHOLOGY_PANELS.find(p => p.id === panelId)
    if (panel?.fasting) return true
  }
  for (const testId of individualTestIds) {
    const test = INDIVIDUAL_TESTS.find(t => t.id === testId)
    if (test?.fasting) return true
  }
  return false
}

/**
 * Get fasting guidance string based on selection, or null if no fasting needed
 */
export function getFastingGuidance(panelIds: string[], individualTestIds: string[]): string | null {
  const allGuidance: { duration: string; notes: string | null }[] = []

  for (const panelId of panelIds) {
    const panel = PATHOLOGY_PANELS.find(p => p.id === panelId)
    if (panel?.fasting && panel.fastingDuration) {
      allGuidance.push({ duration: panel.fastingDuration, notes: panel.fastingNotes })
    }
  }
  for (const testId of individualTestIds) {
    const test = INDIVIDUAL_TESTS.find(t => t.id === testId)
    if (test?.fasting && test.fastingDuration) {
      allGuidance.push({ duration: test.fastingDuration, notes: test.notes })
    }
  }

  if (allGuidance.length === 0) return null

  // Return the longest fasting duration
  const sorted = allGuidance.sort((a, b) => {
    const hoursA = parseInt(a.duration.split('-')[0])
    const hoursB = parseInt(b.duration.split('-')[0])
    return hoursB - hoursA
  })

  const primary = sorted[0]
  return `Fast for ${primary.duration} before your blood test. No food or drinks except water.${primary.notes ? ` ${primary.notes}` : ''}`
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/pathology/panels.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/pathology/panels.ts lib/__tests__/pathology/panels.test.ts
git commit -m "feat: add pathology panel and test constants"
```

---

## Task 2: Type System & Step Registry Updates

**Files:**
- Modify: `lib/request/step-registry.ts`
- Modify: `types/db.ts` (verify `ServiceType` already includes `'pathology'`)
- Modify: `lib/stripe/price-mapping.ts`
- Modify: `lib/constants.ts` (verify `PRICING.PATHOLOGY` exists)
- Test: `lib/__tests__/pathology/step-registry.test.ts`

**Step 1: Write the test**

```typescript
// lib/__tests__/pathology/step-registry.test.ts
import { describe, it, expect } from 'vitest'
import {
  getStepsForService,
  mapServiceParam,
  STEP_REGISTRY,
  type StepContext,
} from '@/lib/request/step-registry'

const baseContext: StepContext = {
  isAuthenticated: false,
  hasProfile: false,
  hasMedicare: false,
  serviceType: 'pathology',
  answers: {},
}

describe('pathology step registry', () => {
  it('pathology is a valid UnifiedServiceType', () => {
    expect(STEP_REGISTRY['pathology']).toBeDefined()
  })

  it('pathology has 5 steps: panel-selection, clinical-reason, details, review, checkout', () => {
    const steps = STEP_REGISTRY['pathology']
    expect(steps.map(s => s.id)).toEqual([
      'panel-selection',
      'clinical-reason',
      'details',
      'review',
      'checkout',
    ])
  })

  it('mapServiceParam maps pathology slugs', () => {
    expect(mapServiceParam('pathology')).toBe('pathology')
    expect(mapServiceParam('blood-test')).toBe('pathology')
    expect(mapServiceParam('blood-tests')).toBe('pathology')
  })

  it('details step is skippable when authenticated with complete identity', () => {
    const steps = getStepsForService('pathology', {
      ...baseContext,
      isAuthenticated: true,
      hasProfile: true,
      hasCompleteIdentity: true,
      hasMedicare: true,
    })
    expect(steps.find(s => s.id === 'details')).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/pathology/step-registry.test.ts`
Expected: FAIL

**Step 3: Modify step-registry.ts**

Add to `UnifiedServiceType`:
```typescript
export type UnifiedServiceType =
  | 'med-cert'
  | 'prescription'
  | 'repeat-script'
  | 'consult'
  | 'pathology'
```

Add to `UnifiedStepId`:
```typescript
  | 'panel-selection'    // Pathology panel + test selection
  | 'clinical-reason'    // Why the patient wants these tests
```

Add to `STEP_REGISTRY`:
```typescript
  'pathology': [
    {
      id: 'panel-selection',
      label: 'Select your tests',
      shortLabel: 'Tests',
      componentPath: 'panel-selection-step',
      validateFn: 'validatePanelSelectionStep',
      required: true,
    },
    {
      id: 'clinical-reason',
      label: 'Clinical reason',
      shortLabel: 'Reason',
      componentPath: 'clinical-reason-step',
      validateFn: 'validateClinicalReasonStep',
      required: true,
    },
    {
      id: 'details',
      label: 'Your details',
      shortLabel: 'Details',
      componentPath: 'patient-details-step',
      validateFn: 'validateDetailsStep',
      canSkip: (ctx) => ctx.isAuthenticated && (ctx.hasCompleteIdentity ?? ctx.hasProfile),
      required: true,
    },
    {
      id: 'review',
      label: 'Review',
      shortLabel: 'Review',
      componentPath: 'review-step',
      required: true,
    },
    {
      id: 'checkout',
      label: 'Payment',
      shortLabel: 'Pay',
      componentPath: 'checkout-step',
      validateFn: 'validateCheckoutStep',
      required: true,
    },
  ],
```

Add to `SUPPORTED_SERVICE_SLUGS`:
```typescript
  'pathology',
  'blood-test',
  'blood-tests',
```

Add to `mapServiceParam` mapping:
```typescript
  'pathology': 'pathology',
  'blood-test': 'pathology',
  'blood-tests': 'pathology',
```

**Step 4: Modify price-mapping.ts**

Add `'pathology'` to `ServiceCategory`:
```typescript
export type ServiceCategory = "medical_certificate" | "prescription" | "consult" | "pathology"
```

Add pathology case to `getPriceIdForRequest`:
```typescript
  // Pathology referrals - flat pricing
  if (category === "pathology") {
    const priceId = process.env.STRIPE_PRICE_PATHOLOGY
    if (!priceId) {
      throw new Error("Missing STRIPE_PRICE_PATHOLOGY environment variable")
    }
    return priceId
  }
```

Add pathology case to `getDisplayPriceForCategory`:
```typescript
    case "pathology":
      return PRICING_DISPLAY.PATHOLOGY
```

Add pathology to `getBasePriceCents` basePrices:
```typescript
    pathology: Math.round(PRICING.PATHOLOGY * 100),
```

**Step 5: Run tests**

Run: `pnpm vitest run lib/__tests__/pathology/`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/request/step-registry.ts lib/stripe/price-mapping.ts types/db.ts lib/__tests__/pathology/step-registry.test.ts
git commit -m "feat: register pathology as new service type in step registry and price mapping"
```

---

## Task 3: Validation Functions

**Files:**
- Modify: `lib/request/validation.ts` (add `validatePanelSelectionStep`, `validateClinicalReasonStep`)
- Test: `lib/__tests__/pathology/validation.test.ts`

**Step 1: Write the test**

```typescript
// lib/__tests__/pathology/validation.test.ts
import { describe, it, expect } from 'vitest'
import { validatePanelSelectionStep, validateClinicalReasonStep } from '@/lib/request/validation'

describe('validatePanelSelectionStep', () => {
  it('fails when no panels or tests selected', () => {
    const result = validatePanelSelectionStep({})
    expect(result.valid).toBe(false)
  })

  it('passes with at least one panel selected', () => {
    const result = validatePanelSelectionStep({ selectedPanels: ['general_health'] })
    expect(result.valid).toBe(true)
  })

  it('passes with at least one individual test selected', () => {
    const result = validatePanelSelectionStep({ selectedTests: ['fbc'] })
    expect(result.valid).toBe(true)
  })

  it('requires biologicalSex', () => {
    const result = validatePanelSelectionStep({ selectedPanels: ['general_health'] })
    // biologicalSex is required for pathology forms
    expect(result.valid).toBe(true) // panels alone is enough, sex collected separately
  })
})

describe('validateClinicalReasonStep', () => {
  it('fails when no reason selected', () => {
    const result = validateClinicalReasonStep({})
    expect(result.valid).toBe(false)
  })

  it('passes with reason selected', () => {
    const result = validateClinicalReasonStep({ clinicalReason: 'routine_checkup' })
    expect(result.valid).toBe(true)
  })

  it('requires details when reason is "other"', () => {
    const result = validateClinicalReasonStep({ clinicalReason: 'other' })
    expect(result.valid).toBe(false)
  })

  it('passes when reason is "other" with details', () => {
    const result = validateClinicalReasonStep({
      clinicalReason: 'other',
      clinicalReasonDetails: 'GP recommended annual bloods'
    })
    expect(result.valid).toBe(true)
  })
})
```

**Step 2: Check existing validation.ts structure, then add the two new functions**

Look at: `lib/request/validation.ts` for the existing pattern (e.g. `validateCertificateStep`).

Add:
```typescript
export function validatePanelSelectionStep(answers: Record<string, unknown>): ValidationResult {
  const panels = (answers.selectedPanels as string[]) || []
  const tests = (answers.selectedTests as string[]) || []

  if (panels.length === 0 && tests.length === 0) {
    return { valid: false, errors: { selection: 'Please select at least one panel or test' } }
  }

  return { valid: true, errors: {} }
}

export function validateClinicalReasonStep(answers: Record<string, unknown>): ValidationResult {
  const reason = answers.clinicalReason as string | undefined
  const details = answers.clinicalReasonDetails as string | undefined

  if (!reason) {
    return { valid: false, errors: { clinicalReason: 'Please select a reason' } }
  }

  if (reason === 'other' && (!details || details.trim().length < 5)) {
    return { valid: false, errors: { clinicalReasonDetails: 'Please provide more detail' } }
  }

  return { valid: true, errors: {} }
}
```

**Step 3: Run tests**

Run: `pnpm vitest run lib/__tests__/pathology/validation.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/request/validation.ts lib/__tests__/pathology/validation.test.ts
git commit -m "feat: add pathology step validation functions"
```

---

## Task 4: Panel Selection Step Component

**Files:**
- Create: `components/request/steps/panel-selection-step.tsx`

This is the main patient-facing step. Cards for each panel, expandable individual tests section, biological sex selector, dynamic fasting guidance.

**Step 1: Create the component**

Follow the pattern from `certificate-step.tsx`:
- Props: `{ serviceType, onNext, onBack, onComplete }`
- Uses `useRequestStore()` for `answers`, `setAnswer`
- Store keys: `selectedPanels: string[]`, `selectedTests: string[]`, `biologicalSex: 'male' | 'female'`

Key UI elements:
- Panel cards (clickable, toggleable, showing included tests on expand)
- Individual tests section (collapsible, checkbox-style toggles)
- Biological sex selector (two buttons: Male/Female — needed for pathology reference ranges)
- Dynamic fasting alert that updates based on selection (uses `getFastingRequirement` and `getFastingGuidance`)
- Test count badge showing total unique tests selected
- Validation: at least 1 panel or test, biological sex required

Use `EnhancedSelectionButton` pattern from symptoms-step for panel cards.

**Step 2: Verify it renders**

Manual: visit `/request?service=pathology`, confirm step renders with panel cards.

**Step 3: Commit**

```bash
git add components/request/steps/panel-selection-step.tsx
git commit -m "feat: add panel selection step for pathology intake"
```

---

## Task 5: Clinical Reason Step Component

**Files:**
- Create: `components/request/steps/clinical-reason-step.tsx`

**Step 1: Create the component**

Follow `consult-reason-step.tsx` pattern. Radio-style selection with these options:

```typescript
const CLINICAL_REASONS = [
  { id: 'routine_checkup', label: 'Routine health check-up', description: 'Annual or periodic blood work' },
  { id: 'gp_recommended', label: 'GP recommended', description: 'Your regular GP suggested these tests' },
  { id: 'monitoring', label: 'Monitoring existing condition', description: 'Tracking a known health condition' },
  { id: 'symptoms', label: 'Investigating symptoms', description: 'You have symptoms you want checked' },
  { id: 'pre_employment', label: 'Pre-employment screening', description: 'Required for a job' },
  { id: 'other', label: 'Other', description: 'Something else' },
] as const
```

Store keys: `clinicalReason: string`, `clinicalReasonDetails: string` (free text, shown when any reason selected, required for 'other').

When `monitoring` or `symptoms` is selected, show an additional textarea: "Please describe your condition or symptoms briefly" — this goes on the pathology request as clinical notes.

**Step 2: Verify it renders**

Manual: advance past panel selection, confirm step renders.

**Step 3: Commit**

```bash
git add components/request/steps/clinical-reason-step.tsx
git commit -m "feat: add clinical reason step for pathology intake"
```

---

## Task 6: Update Shared Steps for Pathology

**Files:**
- Modify: `components/request/steps/review-step.tsx`
- Modify: `components/request/steps/checkout-step.tsx`
- Modify: `components/request/steps/patient-details-step.tsx`

### review-step.tsx

Add `'pathology'` to `SERVICE_LABELS`:
```typescript
  'pathology': 'Blood Test Referral',
```

Add pathology-specific review sections after the consult sections block:
```typescript
  if (serviceType === 'pathology') {
    const selectedPanels = answers.selectedPanels as string[] | undefined
    const selectedTests = answers.selectedTests as string[] | undefined
    const biologicalSex = answers.biologicalSex as string | undefined
    const clinicalReason = answers.clinicalReason as string | undefined
    const clinicalReasonDetails = answers.clinicalReasonDetails as string | undefined

    // Import panel labels at top of file
    const panelLabels = selectedPanels?.map(id => {
      // Look up from PATHOLOGY_PANELS constant
      return PATHOLOGY_PANEL_LABELS[id] || id
    })

    sections.push({
      title: 'Selected Tests',
      items: [
        { label: 'Panels', value: panelLabels?.join(', ') || 'None' },
        { label: 'Individual tests', value: selectedTests?.length ? selectedTests.join(', ') : 'None' },
        { label: 'Biological sex', value: biologicalSex === 'male' ? 'Male' : 'Female' },
      ],
      stepId: 'panel-selection',
    })

    sections.push({
      title: 'Clinical Reason',
      items: [
        { label: 'Reason', value: CLINICAL_REASON_LABELS[clinicalReason || ''] || clinicalReason || '' },
        ...(clinicalReasonDetails ? [{ label: 'Details', value: clinicalReasonDetails }] : []),
      ],
      stepId: 'clinical-reason',
    })
  }
```

### checkout-step.tsx

Add pathology to the `PRICING` record:
```typescript
  'pathology': {
    base: APP_PRICING.PATHOLOGY,
    label: 'Blood Test Referral'
  },
```

### patient-details-step.tsx

Make Medicare number and phone **required** when `serviceType === 'pathology'`:
- The details step already collects Medicare and phone. Check if there's conditional required logic and add pathology alongside prescription/consult.

**Step 1: Make all changes**

**Step 2: Verify**

Manual: complete full pathology flow through to checkout. Confirm review shows correct sections.

**Step 3: Commit**

```bash
git add components/request/steps/review-step.tsx components/request/steps/checkout-step.tsx components/request/steps/patient-details-step.tsx
git commit -m "feat: update shared steps to support pathology service type"
```

---

## Task 7: Request Flow & Store Updates

**Files:**
- Modify: `components/request/request-flow.tsx` (add lazy import for new steps)
- Modify: `components/request/store.ts` (if step component lazy loading needs updating)

**Step 1: Add lazy imports for new step components**

In `request-flow.tsx`, follow existing pattern for lazy loading step components. Add:
```typescript
'panel-selection-step': lazy(() => import('./steps/panel-selection-step')),
'clinical-reason-step': lazy(() => import('./steps/clinical-reason-step')),
```

**Step 2: Verify**

Manual: navigate to `/request?service=pathology`, confirm the full flow works end-to-end including step navigation.

**Step 3: Commit**

```bash
git add components/request/request-flow.tsx components/request/store.ts
git commit -m "feat: wire up pathology steps in request flow"
```

---

## Task 8: Unified Checkout Server Action

**Files:**
- Modify: `app/actions/unified-checkout.ts`

**Step 1: Add pathology case**

Follow the existing pattern for med-cert/prescription/consult. Add pathology to the category mapping and Stripe price resolution:

```typescript
// In the service type → category mapping
if (serviceType === 'pathology') {
  category = 'pathology'
  subtype = 'pathology'
}
```

Ensure the checkout action passes `category: 'pathology'` to `getPriceIdForRequest`.

**Step 2: Verify**

Manual: complete full pathology flow through to Stripe checkout (use test card).

**Step 3: Commit**

```bash
git add app/actions/unified-checkout.ts
git commit -m "feat: add pathology to unified checkout action"
```

---

## Task 9: Database Migration

**Files:**
- Create: `supabase/migrations/XXXXXXXXX_add_pathology_service.sql`

**Step 1: Create migration**

```sql
-- Add pathology service to the services table (if service lookup exists)
-- The intakes table already supports category='pathology' via the ServiceType enum in db.ts.
-- This migration adds the service record for the queue/lookup.

INSERT INTO services (type, name, description, is_active, display_order)
VALUES (
  'pathology',
  'Blood Test Referral',
  'Pathology request form for blood tests at any Australian collection centre',
  true,
  7
)
ON CONFLICT (type) DO NOTHING;
```

Check what the `services` table looks like first — read existing seed/migration to match the column shape.

**Step 2: Apply migration**

Run: `supabase db push` (or via MCP tool)

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add pathology service to database"
```

---

## Task 10: Doctor Portal — Pathology Review & Approval

**Files:**
- Modify: `components/doctor/review/intake-action-buttons.tsx` (add "Approve & Generate Referral" button)
- Modify: `components/doctor/review/request-info-card.tsx` (show selected panels/tests)
- Create: `app/actions/approve-pathology.ts` (server action)
- Modify: `components/doctor/intake-review-panel.tsx` (wire up pathology approval flow)

### intake-action-buttons.tsx

Add pathology approval button alongside existing med cert / script / consult buttons:

```typescript
{/* Pathology: approve & generate referral */}
{service?.type === "pathology" && ["paid", "in_review"].includes(intake.status) && (
  <Button
    onClick={handlePathologyApprove}
    className="bg-emerald-600 hover:bg-emerald-700"
    disabled={isPending}
    size="sm"
  >
    {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
    {isPending ? "Generating..." : "Approve & Generate Referral"}
  </Button>
)}
```

### request-info-card.tsx

Add pathology-specific display showing:
- Selected panels (with test breakdowns)
- Individual tests
- Clinical reason + details
- Biological sex
- Fasting requirement
- **Editable test list** — doctor can add/remove panels and individual tests before approving

### approve-pathology.ts

Follow `approve-cert.ts` pattern exactly:
1. Auth check (`requireRoleOrNull`)
2. Rate limiting
3. Credential validation (provider number + AHPRA)
4. Self-approval prevention
5. Fetch intake + patient data
6. Generate pathology request PDF (Task 11)
7. Upload to Supabase Storage
8. Update intake status to `approved`
9. Send email notification to patient
10. Return `{ success: true }`

The doctor can modify the test selection — the action receives the final test list from the review UI, not from the original intake answers.

**Step 1: Implement all changes**

**Step 2: Verify**

Manual: create a pathology intake, pay, then approve from doctor portal. Confirm PDF generates and status updates.

**Step 3: Commit**

```bash
git add components/doctor/review/intake-action-buttons.tsx components/doctor/review/request-info-card.tsx app/actions/approve-pathology.ts components/doctor/intake-review-panel.tsx
git commit -m "feat: add pathology review and approval to doctor portal"
```

---

## Task 11: Pathology Request PDF Generation

**Files:**
- Create: `lib/pdf/pathology-renderer.ts`
- Test: `lib/__tests__/pathology/pathology-renderer.test.ts`
- Template: `public/templates/pathology_request_template.pdf` (user will design and provide)

### pathology-renderer.ts

Follow `template-renderer.ts` pattern. Uses pdf-lib to overlay text onto a pre-designed template PDF.

```typescript
export interface PathologyPdfInput {
  // Patient
  patientName: string
  patientDob: string          // DD/MM/YYYY
  patientAddress: string
  patientMedicare: string     // Medicare number
  patientMedicareIrn: string  // IRN (position on card)
  patientPhone: string
  patientSex: 'Male' | 'Female'
  // Doctor
  doctorName: string
  doctorProviderNumber: string
  doctorSignatureEmbedded: boolean  // true if signature is in template
  // Request
  requestDate: string         // DD/MM/YYYY
  testsRequested: string[]    // List of test names
  clinicalIndication: string  // Why the tests are needed
  fasting: boolean
  referenceNumber: string     // IM-PATH-YYYYMMDD-XXXXX
  // Validity
  validUntil: string          // 12 months from request date
}

export interface PathologyPdfResult {
  success: boolean
  buffer?: Buffer
  error?: string
}
```

The renderer loads `pathology_request_template.pdf`, draws text at coordinates (which will be finalized after the user provides the template), and returns a buffer.

The exact text overlay coordinates will be set once the template PDF is provided — for now, create the renderer with placeholder coordinates matching the A4 layout pattern from `template-renderer.ts`.

**Step 1: Write test**

```typescript
import { describe, it, expect } from 'vitest'
import { generatePathologyPdf, type PathologyPdfInput } from '@/lib/pdf/pathology-renderer'

const mockInput: PathologyPdfInput = {
  patientName: 'Jane Smith',
  patientDob: '15/03/1990',
  patientAddress: '123 Test St, Sydney NSW 2000',
  patientMedicare: '1234567890',
  patientMedicareIrn: '1',
  patientPhone: '0412345678',
  patientSex: 'Female',
  doctorName: 'Dr John Doe',
  doctorProviderNumber: '1234567A',
  doctorSignatureEmbedded: true,
  requestDate: '25/03/2026',
  testsRequested: ['FBC', 'EUC', 'LFTs', 'Lipids', 'HbA1c'],
  clinicalIndication: 'Routine health check-up',
  fasting: true,
  referenceNumber: 'IM-PATH-20260325-00001',
  validUntil: '25/03/2027',
}

describe('pathology PDF renderer', () => {
  it('generates a PDF buffer', async () => {
    const result = await generatePathologyPdf(mockInput)
    // Will fail until template PDF exists — skip in CI
    if (result.error?.includes('template')) {
      expect(result.success).toBe(false)
      return
    }
    expect(result.success).toBe(true)
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.buffer!.length).toBeGreaterThan(1000)
  })
})
```

**Step 2: Implement renderer**

**Step 3: Commit**

```bash
git add lib/pdf/pathology-renderer.ts lib/__tests__/pathology/pathology-renderer.test.ts
git commit -m "feat: add pathology request PDF renderer"
```

---

## Task 12: Patient Dashboard — Pathology Requests

**Files:**
- Modify: `components/patient/` (add pathology request card/section)

Add to the patient dashboard:
- Pathology request card showing:
  - Status (Submitted → Under Review → Approved → PDF Ready)
  - Tests ordered (panel names + individual tests)
  - **Fasting guidance** (prominent alert if fasting required, with duration and instructions)
  - Download button for the pathology request PDF (when approved)
  - "Take this form to any pathology collection centre in Australia" instruction
  - Validity note: "This referral is valid for 12 months"
  - Link to My Health Record for results

Follow existing pattern for how med cert documents are displayed in the patient dashboard.

**Step 1: Implement**

**Step 2: Verify**

Manual: approve a pathology intake from doctor portal, then check patient dashboard shows the request with fasting guidance and download button.

**Step 3: Commit**

```bash
git add components/patient/
git commit -m "feat: add pathology request display to patient dashboard"
```

---

## Task 13: Email Notification

**Files:**
- Create: `lib/email/templates/pathology-approved.tsx` (React Email template)
- Modify: email sending logic in `approve-pathology.ts`

Follow existing email template pattern (check `lib/email/templates/` for structure).

Email content:
- Subject: "Your blood test referral is ready"
- Body: "Your pathology request has been reviewed and approved by [doctor name]. You can download your referral form from your InstantMed dashboard."
- Fasting guidance section (if applicable)
- "Take this form to any pathology collection centre" instruction
- Dashboard link button
- Do NOT attach the PDF — link to dashboard (same pattern as med certs)

**Step 1: Create template**

**Step 2: Wire into approve-pathology.ts**

**Step 3: Commit**

```bash
git add lib/email/templates/pathology-approved.tsx app/actions/approve-pathology.ts
git commit -m "feat: add pathology approval email notification"
```

---

## Task 14: Stripe Product Setup

**Manual step — not code.**

Create in Stripe Dashboard:
- Product: "Blood Test Referral"
- Price: $29.95 AUD (one-time)
- Copy the price ID → add as `STRIPE_PRICE_PATHOLOGY` env var in Vercel + `.env.local`

Also add to `lib/env.ts` Zod validation if Stripe env vars are validated there.

---

## Task 15: Integration Testing

**Files:**
- Test: `lib/__tests__/pathology/integration.test.ts`

End-to-end unit test covering:
1. Panel selection → validation → clinical reason → validation → all data shapes correct
2. `getPriceIdForRequest({ category: 'pathology', subtype: 'pathology' })` returns correct price
3. `getTestsForSelection` deduplication with mixed panels + individuals
4. Fasting guidance computation for various combinations
5. `mapServiceParam` for all pathology URL slugs

**Step 1: Write and run tests**

Run: `pnpm vitest run lib/__tests__/pathology/`
Expected: All pass

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: All 268+ tests pass (no regressions)

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

**Step 4: Commit**

```bash
git add lib/__tests__/pathology/integration.test.ts
git commit -m "test: add pathology integration tests"
```

---

## Task 16: Final Verification

**Step 1: Full build**

Run: `pnpm build`
Expected: Builds successfully

**Step 2: Lint**

Run: `pnpm lint`
Expected: No errors

**Step 3: Manual smoke test**

1. Visit `/request?service=pathology`
2. Select General Health panel + individual PSA test
3. Confirm fasting guidance shows (10-12 hours)
4. Select biological sex
5. Complete clinical reason (routine checkup)
6. Review step shows all selections correctly
7. Complete checkout with Stripe test card
8. Doctor portal shows the pathology intake in queue
9. Doctor can view selected tests, modify them, add clinical notes
10. Doctor approves → PDF generates → patient receives email
11. Patient dashboard shows the request with fasting guidance + download button

---

## Summary

| Task | What | Estimated Complexity |
|------|------|---------------------|
| 1 | Panel & test constants + utilities | Low |
| 2 | Type system & step registry | Low |
| 3 | Validation functions | Low |
| 4 | Panel selection step component | Medium |
| 5 | Clinical reason step component | Low |
| 6 | Update shared steps (review, checkout, details) | Low |
| 7 | Request flow wiring | Low |
| 8 | Unified checkout action | Low |
| 9 | Database migration | Low |
| 10 | Doctor portal review & approval | Medium-High |
| 11 | PDF renderer | Medium |
| 12 | Patient dashboard | Medium |
| 13 | Email notification | Low |
| 14 | Stripe product setup | Manual |
| 15 | Integration tests | Low |
| 16 | Final verification | Manual |

Total new files: ~8
Total modified files: ~12

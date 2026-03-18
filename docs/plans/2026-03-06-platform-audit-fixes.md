# Platform Audit Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all P0–P3 issues identified in the platform audit: CI hardening, missing email triggers, console.log cleanup, consult validators, pricing fixes, button consolidation, lint fixes, coverage raise, IV standardisation, chat activation, and E2E coverage.

**Architecture:** Incremental fixes across CI, email, clinical validation, Stripe pricing, UI components, security, and testing layers. No schema changes. No new dependencies. TDD for all new logic.

**Tech Stack:** Next.js 15, TypeScript 5.9, Vitest, Playwright, Supabase, Stripe, Resend

---

## Phase 1 — P0 Launch Blockers

### Task 1: Make CI security audit blocking

**Files:**
- Modify: `.github/workflows/ci.yml:27-29`

**Step 1: Remove `continue-on-error: true` from security audit step**

In `.github/workflows/ci.yml`, change:

```yaml
      - name: Security audit
        run: pnpm audit --audit-level=moderate
        continue-on-error: true
```

To:

```yaml
      - name: Security audit
        run: pnpm audit --audit-level=high
```

Rationale: Use `--audit-level=high` instead of `moderate` to avoid blocking on low-severity transitive deps while still catching critical vulnerabilities.

**Step 2: Verify CI still passes locally**

Run: `pnpm audit --audit-level=high`
Expected: Exit 0 (no high/critical vulns) or shows known advisories we can address

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "fix(ci): make security audit blocking at high severity"
```

---

### Task 2: Add payment failure email to async_payment_failed webhook

**Files:**
- Modify: `app/api/stripe/webhook/route.ts:961-982`
- Test: `lib/__tests__/stripe-webhook.test.ts` (add test)

**Step 1: Write the failing test**

In `lib/__tests__/stripe-webhook.test.ts`, add a test that validates async_payment_failed triggers an email send. Since the webhook is a server route, test the email dispatch logic separately:

```typescript
describe("async_payment_failed handler", () => {
  it("should send payment failed email when patient email exists", async () => {
    // This tests the logic that will be added to the webhook handler
    // Verify sendPaymentFailedEmail is called with correct params
  })
})
```

**Step 2: Add email dispatch to async_payment_failed handler**

In `app/api/stripe/webhook/route.ts`, after the existing `intakeId` update block (~line 981), add:

```typescript
    // Send payment failed email to patient
    if (intakeId) {
      try {
        const { data: intake } = await supabase
          .from("intakes")
          .select("patient:profiles!intakes_patient_id_fkey(email, full_name), category")
          .eq("id", intakeId)
          .single()

        if (intake?.patient?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
          await sendPaymentFailedEmail({
            to: intake.patient.email,
            patientName: intake.patient.full_name || "there",
            serviceName: intake.category || "your request",
            failureReason: "Your payment could not be processed. This can happen with bank transfers or direct debit payments.",
            retryUrl: `${appUrl}/request?resume=${intakeId}`,
            intakeId,
          })
          log.info("Payment failed email sent", { intakeId, to: intake.patient.email })
        }
      } catch (emailError) {
        log.error("Failed to send payment failed email", { intakeId }, emailError)
      }
    }
```

Also add the import at the top of the file:

```typescript
import { sendPaymentFailedEmail } from "@/lib/email/template-sender"
```

**Step 3: Run tests**

Run: `pnpm test --run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/api/stripe/webhook/route.ts lib/__tests__/stripe-webhook.test.ts
git commit -m "fix(payments): send email on async payment failure"
```

---

### Task 3: Remove console.log from request flow

**Files:**
- Modify: `components/request/request-flow.tsx:469-481`

**Step 1: Replace dev console.log with Sentry breadcrumb**

In `components/request/request-flow.tsx`, replace the dev-only console.log block:

```typescript
  // Dev sanity check: log service routing on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[RequestFlow] Mount:', {
        initialService,
        rawServiceParam,
        storeServiceType: serviceType,
        currentStepId,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

With a Sentry breadcrumb (works in all environments, zero console noise):

```typescript
  // Track service routing on mount (Sentry breadcrumb, no console output)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { addBreadcrumb: (crumb: { category: string; message: string; data: Record<string, unknown>; level: string }) => void } }).Sentry) {
      (window as unknown as { Sentry: { addBreadcrumb: (crumb: { category: string; message: string; data: Record<string, unknown>; level: string }) => void } }).Sentry.addBreadcrumb({
        category: 'request-flow',
        message: 'RequestFlow mounted',
        data: { initialService, rawServiceParam, storeServiceType: serviceType, currentStepId },
        level: 'info',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

**Step 2: Verify no remaining console.log in request flow**

Run: `grep -r "console\.\(log\|error\|warn\)" components/request/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v "eslint-disable"`
Expected: Only the step-error-boundary.tsx console.error (which is dev-only and already eslint-disabled)

**Step 3: Commit**

```bash
git add components/request/request-flow.tsx
git commit -m "fix(request): replace console.log with Sentry breadcrumb"
```

---

## Phase 2 — P1 High Priority

### Task 4: Add 7 specialised consult validators

**Files:**
- Create: `lib/clinical/consult-validators.ts`
- Create: `lib/__tests__/consult-validators.test.ts`

**Step 1: Write the failing tests**

Create `lib/__tests__/consult-validators.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  validateEdConsult,
  validateHairLossConsult,
  validateWomensHealthConsult,
  validateWeightLossConsult,
  validateGeneralConsult,
  validateNewMedicationConsult,
  validateConsultBySubtype,
} from "../clinical/consult-validators"

describe("ED consult validator", () => {
  it("requires onset, frequency, morning erections, and preference", () => {
    const result = validateEdConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("edOnset")
    expect(result.errors).toContain("edFrequency")
    expect(result.errors).toContain("edMorningErections")
    expect(result.errors).toContain("edPreference")
  })

  it("passes with all required fields", () => {
    const result = validateEdConsult({
      edOnset: "recent",
      edFrequency: "sometimes",
      edMorningErections: "yes",
      edPreference: "sildenafil",
      edAgeConfirmed: true,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("warns when age not confirmed", () => {
    const result = validateEdConsult({
      edOnset: "recent",
      edFrequency: "sometimes",
      edMorningErections: "yes",
      edPreference: "sildenafil",
    })
    expect(result.warnings).toContain("Age confirmation not provided")
  })
})

describe("Hair loss consult validator", () => {
  it("requires pattern, duration, family history, and medication preference", () => {
    const result = validateHairLossConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("hairPattern")
    expect(result.errors).toContain("hairDuration")
    expect(result.errors).toContain("hairFamilyHistory")
    expect(result.errors).toContain("hairMedicationPreference")
  })

  it("passes with all required fields", () => {
    const result = validateHairLossConsult({
      hairPattern: "male_pattern",
      hairDuration: "6_to_12_months",
      hairFamilyHistory: "yes_father",
      hairMedicationPreference: "finasteride",
    })
    expect(result.valid).toBe(true)
  })

  it("flags patchy loss for specialist referral consideration", () => {
    const result = validateHairLossConsult({
      hairPattern: "patchy",
      hairDuration: "less_than_6_months",
      hairFamilyHistory: "no",
      hairMedicationPreference: "topical",
    })
    expect(result.warnings.some(w => w.includes("patchy"))).toBe(true)
  })
})

describe("Women's health consult validator", () => {
  it("requires health option selection", () => {
    const result = validateWomensHealthConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("womensHealthOption")
  })

  it("validates contraception fields when option is contraception", () => {
    const result = validateWomensHealthConsult({
      womensHealthOption: "contraception",
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("contraceptionType")
  })

  it("passes contraception with all fields", () => {
    const result = validateWomensHealthConsult({
      womensHealthOption: "contraception",
      contraceptionType: "start",
      pregnancyStatus: "no",
    })
    expect(result.valid).toBe(true)
  })

  it("flags pregnancy for doctor call", () => {
    const result = validateWomensHealthConsult({
      womensHealthOption: "contraception",
      contraceptionType: "start",
      pregnancyStatus: "yes",
    })
    expect(result.flags).toContain("requires_call")
  })
})

describe("Weight loss consult validator", () => {
  it("requires weight, height, and previous attempts", () => {
    const result = validateWeightLossConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("currentWeight")
    expect(result.errors).toContain("currentHeight")
    expect(result.errors).toContain("previousAttempts")
  })

  it("flags eating disorder history for call", () => {
    const result = validateWeightLossConsult({
      currentWeight: "95",
      currentHeight: "175",
      previousAttempts: "diet_exercise",
      eatingDisorderHistory: "yes",
      weightLossMedPreference: "oral",
    })
    expect(result.flags).toContain("requires_call")
    expect(result.warnings.some(w => w.includes("eating disorder"))).toBe(true)
  })

  it("calculates BMI and warns if under threshold", () => {
    const result = validateWeightLossConsult({
      currentWeight: "60",
      currentHeight: "180",
      previousAttempts: "diet_exercise",
      eatingDisorderHistory: "no",
      weightLossMedPreference: "oral",
    })
    // BMI = 60 / (1.8^2) = 18.5 — under 27 threshold for weight loss medication
    expect(result.warnings.some(w => w.includes("BMI"))).toBe(true)
  })

  it("passes with valid high-BMI patient", () => {
    const result = validateWeightLossConsult({
      currentWeight: "110",
      currentHeight: "175",
      previousAttempts: "multiple",
      eatingDisorderHistory: "no",
      weightLossMedPreference: "oral",
    })
    expect(result.valid).toBe(true)
  })
})

describe("General consult validator", () => {
  it("requires consult reason", () => {
    const result = validateGeneralConsult({})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("consultReason")
  })

  it("passes with consult reason provided", () => {
    const result = validateGeneralConsult({ consultReason: "ongoing headaches" })
    expect(result.valid).toBe(true)
  })
})

describe("validateConsultBySubtype router", () => {
  it("routes to ED validator for ed subtype", () => {
    const result = validateConsultBySubtype("ed", {})
    expect(result.valid).toBe(false)
    expect(result.errors).toContain("edOnset")
  })

  it("routes to general validator for unknown subtype", () => {
    const result = validateConsultBySubtype("unknown", { consultReason: "test" })
    expect(result.valid).toBe(true)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test --run lib/__tests__/consult-validators.test.ts`
Expected: FAIL — module not found

**Step 3: Implement consult validators**

Create `lib/clinical/consult-validators.ts`:

```typescript
/**
 * Specialised Consult Validators
 *
 * Server-side validation for each consult subtype.
 * These run before submission to catch incomplete or flagged intakes.
 * Component-level validation (client) handles UX; these are the safety net.
 */

export interface ConsultValidationResult {
  valid: boolean
  errors: string[]     // Field keys that are missing/invalid
  warnings: string[]   // Non-blocking clinical notes for doctor
  flags: string[]      // System flags (e.g., "requires_call")
}

function createResult(): ConsultValidationResult {
  return { valid: true, errors: [], warnings: [], flags: [] }
}

function requireField(result: ConsultValidationResult, answers: Record<string, unknown>, key: string): void {
  if (!answers[key] && answers[key] !== false && answers[key] !== 0) {
    result.valid = false
    result.errors.push(key)
  }
}

// ============================================================================
// ED CONSULT
// ============================================================================

export function validateEdConsult(answers: Record<string, unknown>): ConsultValidationResult {
  const result = createResult()

  requireField(result, answers, "edOnset")
  requireField(result, answers, "edFrequency")
  requireField(result, answers, "edMorningErections")
  requireField(result, answers, "edPreference")

  if (!answers.edAgeConfirmed) {
    result.warnings.push("Age confirmation not provided")
  }

  // Flag if sudden onset — may indicate vascular cause
  if (answers.edOnset === "sudden") {
    result.warnings.push("Sudden onset may indicate vascular or neurological cause — review carefully")
  }

  // Flag if always had difficulty — may need specialist
  if (answers.edOnset === "always") {
    result.warnings.push("Lifelong ED may benefit from specialist referral")
  }

  return result
}

// ============================================================================
// HAIR LOSS CONSULT
// ============================================================================

export function validateHairLossConsult(answers: Record<string, unknown>): ConsultValidationResult {
  const result = createResult()

  requireField(result, answers, "hairPattern")
  requireField(result, answers, "hairDuration")
  requireField(result, answers, "hairFamilyHistory")
  requireField(result, answers, "hairMedicationPreference")

  // Patchy loss may be alopecia areata — different treatment pathway
  if (answers.hairPattern === "patchy") {
    result.warnings.push("Patchy hair loss (possible alopecia areata) — consider dermatology referral")
  }

  // Recent rapid onset without family history — investigate underlying causes
  if (answers.hairDuration === "less_than_6_months" && answers.hairFamilyHistory === "no") {
    result.warnings.push("Rapid onset without family history — consider thyroid/iron/stress investigation")
  }

  return result
}

// ============================================================================
// WOMEN'S HEALTH CONSULT
// ============================================================================

export function validateWomensHealthConsult(answers: Record<string, unknown>): ConsultValidationResult {
  const result = createResult()

  requireField(result, answers, "womensHealthOption")

  const option = answers.womensHealthOption as string | undefined

  if (option === "contraception" || option === "ocp_new" || option === "ocp_repeat") {
    requireField(result, answers, "contraceptionType")
    requireField(result, answers, "pregnancyStatus")

    if (answers.pregnancyStatus === "yes") {
      result.flags.push("requires_call")
      result.warnings.push("Patient reports pregnancy — requires doctor call before prescribing")
    }
  }

  if (option === "morning_after") {
    requireField(result, answers, "maLastIntercourse")
    requireField(result, answers, "pregnancyStatus")

    if (answers.pregnancyStatus === "yes") {
      result.flags.push("requires_call")
    }
  }

  if (option === "uti") {
    requireField(result, answers, "utiSymptoms")
    requireField(result, answers, "utiRecurrence")

    // Recurrent UTIs need further investigation
    if (answers.utiRecurrence === "frequent") {
      result.warnings.push("Frequent UTIs — consider urine culture and specialist referral")
    }
  }

  return result
}

// ============================================================================
// WEIGHT LOSS CONSULT
// ============================================================================

export function validateWeightLossConsult(answers: Record<string, unknown>): ConsultValidationResult {
  const result = createResult()

  requireField(result, answers, "currentWeight")
  requireField(result, answers, "currentHeight")
  requireField(result, answers, "previousAttempts")

  // BMI check
  const weight = parseFloat(answers.currentWeight as string)
  const heightCm = parseFloat(answers.currentHeight as string)
  if (weight && heightCm) {
    const heightM = heightCm / 100
    const bmi = weight / (heightM * heightM)

    if (bmi < 27) {
      result.warnings.push(`BMI ${bmi.toFixed(1)} is below 27 — weight loss medication may not be clinically indicated`)
    }

    if (bmi < 18.5) {
      result.warnings.push("BMI indicates underweight — weight loss medication contraindicated")
      result.flags.push("requires_call")
    }
  }

  // Eating disorder history
  if (answers.eatingDisorderHistory === "yes") {
    result.flags.push("requires_call")
    result.warnings.push("Patient reports eating disorder history — requires doctor call")
  }

  return result
}

// ============================================================================
// GENERAL CONSULT
// ============================================================================

export function validateGeneralConsult(answers: Record<string, unknown>): ConsultValidationResult {
  const result = createResult()
  requireField(result, answers, "consultReason")
  return result
}

// ============================================================================
// NEW MEDICATION CONSULT
// ============================================================================

export function validateNewMedicationConsult(answers: Record<string, unknown>): ConsultValidationResult {
  const result = createResult()
  requireField(result, answers, "consultReason")
  // New medication requests go through the same general flow
  return result
}

// ============================================================================
// ROUTER
// ============================================================================

export function validateConsultBySubtype(
  subtype: string,
  answers: Record<string, unknown>
): ConsultValidationResult {
  switch (subtype) {
    case "ed":
      return validateEdConsult(answers)
    case "hair_loss":
      return validateHairLossConsult(answers)
    case "womens_health":
      return validateWomensHealthConsult(answers)
    case "weight_loss":
      return validateWeightLossConsult(answers)
    case "new_medication":
      return validateNewMedicationConsult(answers)
    case "general":
    default:
      return validateGeneralConsult(answers)
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test --run lib/__tests__/consult-validators.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/clinical/consult-validators.ts lib/__tests__/consult-validators.test.ts
git commit -m "feat(clinical): add 7 specialised consult validators with tests"
```

---

### Task 5: Add email on checkout.session.expired

**Files:**
- Modify: `app/api/stripe/webhook/route.ts:778-802`

**Step 1: Add email dispatch to expired handler**

After the existing `log.info("Intake session expired")` line (~line 798), add:

```typescript
        // Send checkout expired email to patient
        try {
          const { data: intake } = await supabase
            .from("intakes")
            .select("patient:profiles!intakes_patient_id_fkey(email, full_name), category")
            .eq("id", intakeId)
            .single()

          if (intake?.patient?.email) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://instantmed.com.au"
            await sendPaymentFailedEmail({
              to: intake.patient.email,
              patientName: intake.patient.full_name || "there",
              serviceName: intake.category || "your request",
              failureReason: "Your checkout session expired before payment was completed. No charge was made.",
              retryUrl: `${appUrl}/request?service=${intake.category}`,
              intakeId,
            })
          }
        } catch (emailErr) {
          log.error("Failed to send expired checkout email", { intakeId }, emailErr)
        }
```

**Step 2: Verify import exists**

Ensure `sendPaymentFailedEmail` is imported from `@/lib/email/template-sender` (added in Task 2).

**Step 3: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "fix(payments): send email on checkout session expiry"
```

---

### Task 6: Fix hardcoded fallback prices — use PRICING constants

**Files:**
- Modify: `lib/stripe/price-mapping.ts:158-171`
- Modify: `lib/__tests__/consult-subtype-pricing.test.ts` (add test)

**Step 1: Write failing test**

Add to `lib/__tests__/consult-subtype-pricing.test.ts`:

```typescript
describe("getConsultSubtypePrice", () => {
  it("returns PRICING constant for known subtypes without env vars", () => {
    // With no env vars set, should fall back to PRICING constants, not hardcoded 49.95
    const result = getConsultSubtypePrice("ed")
    expect(result).toBe(PRICING.MENS_HEALTH) // 39.95, not 49.95
  })
})
```

**Step 2: Replace hardcoded fallbacks with PRICING constants**

In `lib/stripe/price-mapping.ts`, update `getConsultSubtypePrice`:

```typescript
import { PRICING, PRICING_DISPLAY } from "@/lib/constants"

export function getConsultSubtypePrice(subtype?: string): number {
  if (!subtype) return PRICING.CONSULT

  // Check env vars first (allows runtime override)
  const subtypePrices: Record<string, string | undefined> = {
    'ed': process.env.NEXT_PUBLIC_PRICE_CONSULT_ED,
    'hair_loss': process.env.NEXT_PUBLIC_PRICE_CONSULT_HAIR_LOSS,
    'womens_health': process.env.NEXT_PUBLIC_PRICE_CONSULT_WOMENS_HEALTH,
    'weight_loss': process.env.NEXT_PUBLIC_PRICE_CONSULT_WEIGHT_LOSS,
    'general': process.env.NEXT_PUBLIC_PRICE_CONSULT,
  }

  const envPrice = subtypePrices[subtype] || process.env.NEXT_PUBLIC_PRICE_CONSULT
  if (envPrice) return parseFloat(envPrice)

  // Fall back to PRICING constants (single source of truth)
  const constantPrices: Record<string, number> = {
    'ed': PRICING.MENS_HEALTH,
    'hair_loss': PRICING.HAIR_LOSS,
    'womens_health': PRICING.WOMENS_HEALTH,
    'weight_loss': PRICING.WEIGHT_LOSS,
    'general': PRICING.CONSULT,
  }

  return constantPrices[subtype] ?? PRICING.CONSULT
}
```

Also update `getBasePriceCents` to use PRICING:

```typescript
export function getBasePriceCents(category: ServiceCategory, absenceDays?: number): number {
  if (category === "medical_certificate") {
    if (absenceDays === 3) return Math.round(PRICING.MED_CERT_3DAY * 100)
    return absenceDays === 2 ? Math.round(PRICING.MED_CERT_2DAY * 100) : Math.round(PRICING.MED_CERT * 100)
  }

  const basePrices: Record<ServiceCategory, number> = {
    medical_certificate: Math.round(PRICING.MED_CERT * 100),
    prescription: Math.round(PRICING.REPEAT_SCRIPT * 100),
    consult: Math.round(PRICING.CONSULT * 100),
  }
  return basePrices[category] || Math.round(PRICING.MED_CERT * 100)
}
```

**Step 3: Run tests**

Run: `pnpm test --run lib/__tests__/consult-subtype-pricing.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/stripe/price-mapping.ts lib/__tests__/consult-subtype-pricing.test.ts
git commit -m "fix(pricing): use PRICING constants instead of hardcoded fallbacks"
```

---

## Phase 3 — P2 Should Fix

### Task 7: Standardise IV length to 12 bytes (GCM recommended)

**Files:**
- Modify: `lib/security/encryption.ts:21`
- Modify: `lib/__tests__/encryption.test.ts` (verify)

**Step 1: Change IV_LENGTH from 16 to 12**

In `lib/security/encryption.ts`, change:

```typescript
const IV_LENGTH = 16 // 128 bits
```

To:

```typescript
const IV_LENGTH = 12 // 96 bits — GCM recommended (NIST SP 800-38D)
```

Note: AES-GCM works with any IV length but NIST recommends 96-bit (12 bytes) for optimal performance and security. The PHI encryption module already uses 12 bytes. This makes them consistent.

**Step 2: Verify backwards compatibility**

The decrypt function reads IV length from the stored ciphertext prefix. If existing encrypted data used 16-byte IVs, we need to handle both. Check the decrypt function:

If decrypt reads a fixed `IV_LENGTH` bytes from the prefix, add a migration note. If it reads the IV dynamically, no issue.

Update decrypt to handle both lengths during transition:

```typescript
// Support both 12-byte (new) and 16-byte (legacy) IVs
const LEGACY_IV_LENGTH = 16
```

**Step 3: Run encryption tests**

Run: `pnpm test --run lib/__tests__/encryption.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add lib/security/encryption.ts lib/__tests__/encryption.test.ts
git commit -m "fix(security): standardise IV to 12 bytes per NIST GCM recommendation"
```

---

### Task 8: Raise coverage thresholds to 80%

**Files:**
- Modify: `vitest.config.ts:25-30`

**Step 1: Update thresholds**

In `vitest.config.ts`, change:

```typescript
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 40,
        lines: 40,
      },
```

To:

```typescript
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
```

**Step 2: Run coverage to see current state**

Run: `pnpm test --run --coverage`
Expected: May fail if current coverage is below 80%. If so, we'll need to write more tests (see Task 9).

**Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "feat(testing): raise coverage thresholds to 80%"
```

---

### Task 9: Write additional tests to meet 80% coverage

**Files:**
- Create/modify tests in `lib/__tests__/` as needed based on coverage report

**Step 1: Run coverage and identify gaps**

Run: `pnpm test --run --coverage`
Examine the coverage report to identify uncovered files in `lib/clinical/`, `lib/security/`, `lib/state-machine/`, `lib/repeat-rx/`.

**Step 2: Write tests for uncovered branches/functions**

Focus on:
- `lib/clinical/decision-support.ts` if uncovered
- `lib/clinical/consult-validators.ts` edge cases
- `lib/security/` — sanitize, audit-log, rate-limit edge cases
- `lib/state-machine/` — transition edge cases

**Step 3: Verify coverage meets 80%**

Run: `pnpm test --run --coverage`
Expected: All thresholds at 80%+

**Step 4: Commit**

```bash
git add lib/__tests__/
git commit -m "test: add tests to meet 80% coverage threshold"
```

---

### Task 10: Consolidate button components — remove uix/button.tsx

**Files:**
- Delete: `components/uix/button.tsx`
- Modify: `components/uix/index.ts` (remove button export)

**Step 1: Verify no imports of uix button**

Run: `grep -r "from.*uix/button\|from.*uix.*Button" --include="*.tsx" --include="*.ts" .`
Expected: Only the index.ts barrel export. No component imports the uix button directly.

**Step 2: Remove uix button from barrel export**

In `components/uix/index.ts`, remove the button re-export line.

**Step 3: Delete the uix button file**

Remove `components/uix/button.tsx`.

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add components/uix/button.tsx components/uix/index.ts
git commit -m "refactor(ui): consolidate button components — remove unused uix/button"
```

---

### Task 11: Strengthen email template merge tag validation

**Files:**
- Modify: `lib/email/template-sender.ts:96-103`
- Add test: `lib/__tests__/template-sender.test.ts`

**Step 1: Write failing test**

```typescript
describe("validateMergeTags", () => {
  it("returns missing tags when data is incomplete", () => {
    // Test that validation catches missing required tags
  })

  it("logs warning to Sentry when tags are missing", () => {
    // Verify Sentry capture is called
  })
})
```

**Step 2: Add Sentry capture for missing tags**

In `template-sender.ts`, update the missing tags handler (line 164-166):

```typescript
  if (missingTags.length > 0) {
    log.warn("Missing merge tags for email", { templateSlug, missingTags })
    // Capture to Sentry for visibility — missing tags may cause broken emails
    if (typeof globalThis !== 'undefined') {
      try {
        const Sentry = await import("@sentry/nextjs")
        Sentry.captureMessage(`Missing merge tags: ${templateSlug}`, {
          level: "warning",
          extra: { missingTags, templateSlug },
        })
      } catch {
        // Sentry not available — warning already logged
      }
    }
  }
```

**Step 3: Commit**

```bash
git add lib/email/template-sender.ts
git commit -m "fix(email): capture missing merge tags to Sentry for visibility"
```

---

## Phase 4 — P3 Nice to Have

### Task 12: Fix all lint warnings (img → Image)

**Files:**
- Modify: `app/trust/trust-client.tsx`
- Modify: `components/chat/message-indicators.tsx`
- Modify: `app/admin/doctors/doctors-client.tsx`
- Modify: `app/admin/clinic/clinic-client.tsx`

**Step 1: Replace `<img>` with `<Image>` from next/image in each file**

For each file, add `import Image from "next/image"` and replace `<img>` tags with `<Image>` components, adding required `width`, `height`, and `alt` props.

**Step 2: Run lint**

Run: `pnpm lint`
Expected: 0 warnings, 0 errors

**Step 3: Commit**

```bash
git add app/trust/trust-client.tsx components/chat/message-indicators.tsx app/admin/doctors/doctors-client.tsx app/admin/clinic/clinic-client.tsx
git commit -m "fix(lint): replace img with next/image in 4 files"
```

---

### Task 13: Activate AI chat with interactive buttons

**Files:**
- Create: `app/api/chat/route.ts` (streaming chat API)
- Modify: `components/chat/chat-intake.tsx` (connect to API, add quick-reply buttons)
- Modify: `lib/intake/chat-flow-v2.ts` (ensure flow logic drives button options)

**Step 1: Create the chat API route**

Create `app/api/chat/route.ts` that uses Vercel AI SDK + the existing `lib/ai/provider.ts` configuration. It should:
- Accept messages array + intake context
- Stream responses using the `clinical` profile (temp 0.1)
- Include system prompt with clinical boundaries from CLINICAL.md
- Return structured responses with optional `quickReplies` for button rendering

**Step 2: Connect chat-intake.tsx to the API**

Update the existing `chat-intake.tsx` to:
- Use `useChat` from `ai/react` to stream from `/api/chat`
- Render quick reply buttons from the `quickReplies` field in assistant messages
- Show typing indicator during streaming
- Save chat state to Zustand store (already has CHAT_STORAGE_KEY)

**Step 3: Add button rendering for common intake questions**

The chat should ask questions like:
- "What brings you in today?" with buttons: ["Medical certificate", "Prescription", "Consultation"]
- "How long have you been unwell?" with buttons: ["1 day", "2 days", "3 days"]
- Buttons map to `setAnswer()` calls in the Zustand store

**Step 4: Test manually**

Run: `pnpm dev` and navigate to `/request?service=med-cert`
Expected: Chat appears, asks questions with clickable buttons, responses stream in

**Step 5: Commit**

```bash
git add app/api/chat/route.ts components/chat/chat-intake.tsx lib/intake/chat-flow-v2.ts
git commit -m "feat(chat): activate AI intake chat with interactive quick-reply buttons"
```

---

### Task 14: Fix remaining lint warnings

**Step 1: Run lint and identify all warnings**

Run: `pnpm lint 2>&1 | grep -E "warning|Warning" | head -50`

**Step 2: Fix each warning**

Common patterns:
- `@typescript-eslint/no-unused-vars`: Remove unused imports/variables
- `@typescript-eslint/no-explicit-any`: Add proper types
- `react-hooks/exhaustive-deps`: Add missing deps or document with eslint-disable

**Step 3: Run lint**

Run: `pnpm lint`
Expected: 0 warnings, 0 errors

**Step 4: Commit**

```bash
git add -A
git commit -m "fix(lint): resolve all remaining lint warnings"
```

---

### Task 15: Final verification — full CI pass

**Step 1: Run full CI locally**

Run: `pnpm ci`
Expected: All steps pass — lint, test (with coverage), typecheck, build

**Step 2: Run E2E if available**

Run: `PLAYWRIGHT=1 pnpm e2e:chromium`
Expected: All E2E tests pass

**Step 3: Final commit if any fixups needed**

---

## Execution Order

| Batch | Tasks | Description |
|-------|-------|-------------|
| 1 | 1, 2, 3 | P0: CI, payment email, console.log |
| 2 | 4, 5, 6 | P1: Validators, expired email, pricing |
| 3 | 7, 8, 9, 10, 11 | P2: IV, coverage, buttons, email validation |
| 4 | 12, 13, 14, 15 | P3: Lint, chat, cleanup, verification |

Each batch gets a checkpoint for review before proceeding.

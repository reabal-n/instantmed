# InstantMed Full Remediation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix every issue (critical, high, medium, low) across the InstantMed telehealth platform found by the 6-domain audit — clinical safety, pricing, intake flows, prescription simplification, guest flow, UX/UI credibility, documentation, and code quality.

**Architecture:** Approach C "Full Remediation" — 70+ fixes across 4 phases. Each phase is self-contained and deployable. The prescription simplification (~4,500 lines removed) is the largest single change. All UI toggles replace checkboxes. Specialized consultation pathways get unique intake questions. Fabricated live data stays but becomes realistic for a small pre-launch clinic.

**Tech Stack:** Next.js 15.5 (App Router), React 19, Supabase PostgreSQL, Clerk Auth, Stripe (live), Zustand, pdf-lib, Tailwind v4, shadcn/ui, Playwright E2E tests

**Owner Directives (override any prior audit recommendations):**
- Phone number: Required for prescriptions + consults + specialized pathways. NOT required for med-cert.
- Fabricated live data: KEEP but make realistic for small pre-launch clinic.
- Safety toggle: Must NOT be on a standalone step — merge into another step.
- ED pathway: Ask about daily vs PRN preference. Heart/BP conditions get a follow-up "is it managed" question before rejection.
- Toggles not checkboxes: All yes/no inputs should be toggle switches.
- Certificate template editor: REMOVE entirely (templates are ready in `/public/templates/`).
- AHPRA validation: Keep simple, don't over-engineer.
- Solo doctor: Don't advertise "only 1 doctor" but don't name fake doctors either.
- Prescription workflow: Patient submits details + pays → Doctor receives request → Doctor manually inputs into Parchment → Doctor marks "Script Sent" toggle.

**Confirmed Stripe Pricing (source of truth):**
| Product | Price |
|---------|-------|
| Weight loss | A$79.95 |
| Women's health | A$59.95 |
| General consultation | A$49.95 |
| Hair loss | A$39.95 |
| ED | A$39.95 |
| Medical certificate (2-day) | A$29.95 |
| Medical certificate (1-day) | A$19.95 |
| Repeat prescription | A$29.95 |

---

## Phase 1: Safety & Clinical Integrity

### Task 1: Wire Controlled Substance Detection into Medication Step

**Files:**
- Modify: `components/request/steps/medication-step.tsx`
- Reference: `lib/clinical/intake-validation.ts` (has `checkControlledSubstance()`)

**Step 1: Add import and call**
Import `checkControlledSubstance` from `@/lib/clinical/intake-validation`. After user selects a medication (in the `handleMedicationSelect` or equivalent handler), call `checkControlledSubstance(medicationName)`. If it returns a rejection, display a blocking `Alert` with `variant="destructive"` and prevent `onNext()`.

**Step 2: Add UI blocking state**
Add `const [controlledBlock, setControlledBlock] = useState<string | null>(null)` state. When `checkControlledSubstance` returns a positive match, set this state with the warning message. Render an alert above the medication input when `controlledBlock` is set. Clear it when the user changes the medication.

**Step 3: Run existing tests and verify no regressions**
Run: `pnpm test -- --filter medication`
Expected: All existing tests pass. The new import is additive.

**Step 4: Commit**
```
git add components/request/steps/medication-step.tsx
git commit -m "feat(safety): wire controlled substance detection into medication step"
```

---

### Task 2: Connect Clinical Validation to Symptom & Safety Steps

**Files:**
- Modify: `components/request/steps/symptoms-step.tsx`
- Modify: `components/request/steps/safety-step.tsx`
- Reference: `lib/clinical/intake-validation.ts` (has `checkEmergencySymptoms()`)
- Reference: `lib/clinical/triage-rules-engine.ts` (has `checkRedFlagPatterns()`)

**Step 1: Wire emergency symptom check into symptoms step**
In `symptoms-step.tsx`, import `checkEmergencySymptoms` from `@/lib/clinical/intake-validation`. On symptom text submission (the `symptomDetails` field), run `checkEmergencySymptoms(details)`. If it flags an emergency, show an `Alert variant="destructive"` with emergency instructions (call 000, go to ED). Don't hard-block — display as a warning with a "I understand, continue" acknowledgment toggle. Store the flag in answers: `setAnswer('emergencyWarningAcknowledged', true)`.

**Step 2: Merge safety step into other steps (NOT standalone)**
Per owner directive: the safety toggle must NOT be on its own step. Move the emergency acknowledgment toggle from `safety-step.tsx` into the `review-step.tsx` as a final consent before checkout. The toggle reads: "I confirm this is not a medical emergency. If I am experiencing an emergency, I will call 000." This toggle must be checked before the user can proceed to checkout.

Update `lib/request/step-registry.ts`: Remove `'safety'` from ALL step sequences in `STEP_REGISTRY` and `CONSULT_SUBTYPE_STEPS`. The safety consent now lives on the review step.

**Step 3: Add pregnancy/allergy screening to medical-history step**
The old unified flow had pregnancy and allergy screening. These questions should be part of `medical-history-step.tsx` (which already has `hasAllergies` and `hasConditions`). Add:
- "Are you currently pregnant or breastfeeding?" toggle
- "Have you had any adverse reactions to medications?" toggle
These are informational flags for the doctor, not hard-blocks.

**Step 4: Commit**
```
git add components/request/steps/symptoms-step.tsx components/request/steps/review-step.tsx components/request/steps/medical-history-step.tsx lib/request/step-registry.ts
git commit -m "feat(safety): wire clinical validation, merge safety into review step"
```

---

### Task 3: Fix Certificate Reference Entropy

**Files:**
- Modify: `lib/pdf/cert-identifiers.ts:52`

**Step 1: Replace Math.random with crypto**
At line 52 in `generateCertificateRef()`, replace `Math.random()` with `crypto.randomInt(100000)` (or `crypto.getRandomValues` for browser compat). One-line fix. Import `crypto` from Node.js builtins if not already imported.

The current code: `Math.random().toString(36).substring(2, 7)` → Change to use `crypto.randomInt(10000, 99999)` for the 5-digit suffix.

**Step 2: Commit**
```
git add lib/pdf/cert-identifiers.ts
git commit -m "fix(security): use crypto.randomInt for certificate reference IDs"
```

---

### Task 4: Remove PII from Documentation

**Files:**
- Modify: `docs/QUICK_REFERENCE_MED_CERT.md`
- Modify: `docs/PRODUCTION_CHECKLIST.md`

**Step 1: Replace real data with placeholders**
Search both files for:
- Real doctor names → replace with `[DOCTOR_NAME]`
- AHPRA numbers → replace with `[AHPRA_NUMBER]`
- Real addresses → replace with `[CLINIC_ADDRESS]`
- Supabase project ref IDs → replace with `[SUPABASE_PROJECT_REF]`
- Real phone numbers → replace with `[PHONE_NUMBER]`

**Step 2: Commit**
```
git add docs/QUICK_REFERENCE_MED_CERT.md docs/PRODUCTION_CHECKLIST.md
git commit -m "fix(security): remove PII from documentation files"
```

---

### Task 5: Fix Name Validation for International Characters

**Files:**
- Modify: `lib/request/validation.ts:51`

**Step 1: Replace ASCII-only regex**
Change line 51 from:
```typescript
if (!/^[a-zA-Z\s'-]+$/.test(name)) return `${fieldName} contains invalid characters`
```
To:
```typescript
if (!/^[\p{L}\s'-]+$/u.test(name)) return `${fieldName} contains invalid characters`
```
The `\p{L}` Unicode property matches any letter from any language. The `u` flag enables Unicode mode.

**Step 2: Commit**
```
git add lib/request/validation.ts
git commit -m "fix: support international characters in name validation"
```

---

### Task 6: Rate Limiting Fallback

**Files:**
- Modify: `lib/security/rate-limit.ts`

**Step 1: Add in-memory fallback**
The current rate limiter fails open (allows action if DB check fails). Add an in-memory `Map<string, number[]>` with TTL as a fallback. If the DB check throws an error AND the in-memory count exceeds a higher threshold (e.g., 100 actions/hour), block the action. This prevents unlimited abuse if the DB is down.

Add at the top of the file:
```typescript
const inMemoryLimits = new Map<string, number[]>()

function checkInMemoryFallback(key: string, maxActions: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = inMemoryLimits.get(key) || []
  const recent = timestamps.filter(t => t > now - windowMs)
  recent.push(now)
  inMemoryLimits.set(key, recent)
  return recent.length <= maxActions
}
```

In the `catch` block of `checkRateLimit()`, instead of always returning `{ allowed: true }`, check the in-memory fallback first.

**Step 2: Commit**
```
git add lib/security/rate-limit.ts
git commit -m "fix(security): add in-memory rate limiting fallback"
```

---

## Phase 2: Pricing, Constants & Owner Requirements

### Task 7: Sync Pricing Constants with Stripe

**Files:**
- Modify: `lib/constants.ts`
- Modify: `components/request/service-hub-screen.tsx`
- Modify: `components/request/steps/checkout-step.tsx`
- Modify: `components/request/steps/certificate-step.tsx`

**Step 1: Update `lib/constants.ts` to match Stripe**
Update the PRICING object to match the confirmed Stripe products:
```typescript
export const PRICING = {
  MED_CERT: 19.95,        // 1-day medical certificate
  MED_CERT_2DAY: 29.95,   // 2-day medical certificate
  MED_CERT_3DAY: 39.95,   // 3-day medical certificate (NEW)
  REPEAT_SCRIPT: 29.95,   // Repeat prescription
  NEW_SCRIPT: 49.95,      // New prescription (same as consult)
  CONSULT: 49.95,         // General consultation
  MENS_HEALTH: 39.95,     // ED consultation
  WOMENS_HEALTH: 59.95,   // Women's health (CHANGED from 39.95)
  HAIR_LOSS: 39.95,       // Hair loss consultation
  WEIGHT_LOSS: 79.95,     // Weight loss consultation (NEW)
} as const
```

Add `MED_CERT_3DAY` and `WEIGHT_LOSS` to `PRICING_DISPLAY` too.

Update `MED_CERT_DURATIONS` to include 3 days:
```typescript
export const MED_CERT_DURATIONS = {
  options: [1, 2, 3] as const,
  labels: { 1: '1 day', 2: '2 days', 3: '3 days' },
  prices: { 1: 19.95, 2: 29.95, 3: 39.95 },
} as const
```

**Step 2: Remove hardcoded price overrides**
In `service-hub-screen.tsx`: Remove all hardcoded price strings. Import from `PRICING`:
- Women's health card: change hardcoded `$59.95` to `PRICING.WOMENS_HEALTH`
- Weight loss card: use `PRICING.WEIGHT_LOSS`
- All other prices: use constants

In `checkout-step.tsx`: Remove hardcoded price override at line 88 (2-day cert override). Use the `MED_CERT_DURATIONS.prices` lookup instead.

In `certificate-step.tsx`: Remove the local `PRICING` object that duplicates constants. Import from `@/lib/constants`.

**Step 3: Fix service hub routing**
In `service-hub-screen.tsx`: Change "Repeat Prescription" card to route to `'repeat-script'` service type (not `'prescription'`). This fixes the pricing mismatch ($49.95 → $29.95).

**Step 4: Commit**
```
git add lib/constants.ts components/request/service-hub-screen.tsx components/request/steps/checkout-step.tsx components/request/steps/certificate-step.tsx
git commit -m "fix(pricing): sync all prices with Stripe, add 3-day cert, single source of truth"
```

---

### Task 8: Add 3-Day Certificate Option

**Files:**
- Modify: `components/request/steps/certificate-step.tsx`
- Modify: `components/request/steps/checkout-step.tsx`

**Step 1: Update certificate step duration selector**
In `certificate-step.tsx`, update the duration radio button group to include a 3-day option. Use the `MED_CERT_DURATIONS` constant from `lib/constants.ts`.

Radio button group structure:
- 1 day — $19.95
- 2 days — $29.95
- 3 days — $39.95

Add a start date picker below the duration selector. Calculate and display the end date automatically: `endDate = startDate + (duration - 1) days`.

**Step 2: Update checkout step pricing map**
In `checkout-step.tsx`, update the pricing map to handle `duration === 3`. Use `MED_CERT_DURATIONS.prices[duration]` instead of hardcoded values.

**Step 3: Create Stripe product for 3-day cert**
Note: A new Stripe Price needs to be created for the 3-day cert ($39.95). This should be done via the Stripe dashboard or API. Add the price ID to environment variables as `STRIPE_PRICE_MED_CERT_3DAY`.

**Step 4: Commit**
```
git add components/request/steps/certificate-step.tsx components/request/steps/checkout-step.tsx
git commit -m "feat: add 3-day medical certificate option at $39.95"
```

---

### Task 9: Fix Certificate Type Naming Inconsistency

**Files:**
- Modify: `components/request/steps/certificate-step.tsx`
- Modify: `components/request/steps/review-step.tsx`

**Step 1: Standardize on 'study'**
In `certificate-step.tsx`, ensure the cert type uses `'study'` (not `'uni'`).
In `review-step.tsx`, update the label mapping to handle `'study'` → "Study/University" (it currently may expect `'uni'`).

Search for all instances of `'uni'` across both files and replace with `'study'`. Also update any display labels to say "Study / University" for clarity.

**Step 2: Commit**
```
git add components/request/steps/certificate-step.tsx components/request/steps/review-step.tsx
git commit -m "fix: standardize certificate type to 'study' across all components"
```

---

### Task 10: Update Phone Number Requirement

**Files:**
- Modify: `components/request/steps/patient-details-step.tsx`

**Step 1: Update phone requirement logic**
At line 88, the current code:
```typescript
const needsPhone = serviceType === 'prescription' || serviceType === 'repeat-script'
```

Update to include consults (all types):
```typescript
const needsPhone = serviceType === 'prescription' || serviceType === 'repeat-script' || serviceType === 'consult'
```

This means phone is required for: prescriptions, repeat scripts, general consults, and ALL specialized pathways (ED, hair loss, women's health, weight loss) since they all use `serviceType === 'consult'` with a subtype.

Phone is NOT required for `med-cert`.

**Step 2: Commit**
```
git add components/request/steps/patient-details-step.tsx
git commit -m "fix: require phone for prescriptions and consults, not for med-certs"
```

---

## Phase 3: Specialized Pathways & UX

### Task 11: Revamp ED Pathway — Soft Blocks & Preferences

**Files:**
- Modify: `components/request/steps/ed-safety-step.tsx`
- Modify: `components/request/steps/ed-assessment-step.tsx`

**Step 1: Add follow-up "is it managed" question**
In `ed-safety-step.tsx`, for the cardiac/BP hard-block questions (nitrates, recentHeartEvent, severeHeartCondition), instead of immediately blocking when user answers "yes":

1. Show a follow-up question: "Is this condition currently being managed by a doctor?" (toggle)
2. If YES (managed): Allow to proceed with a warning flag stored in answers: `setAnswer('edSafety_managedCondition', true)`. The doctor will see this flag.
3. If NO (not managed): Show the block screen as currently implemented.

For nitrates specifically: keep as absolute hard-block (no follow-up) since the drug interaction is dangerous regardless of management.

**Step 2: Convert radio buttons to toggle switches**
Replace all `RadioGroup` + `RadioGroupItem` in `ed-safety-step.tsx` with toggle switches using shadcn/ui `Switch` component. The toggle label should read the question, and toggling ON means "Yes."

```tsx
import { Switch } from "@/components/ui/switch"

<div className="flex items-center justify-between p-4 rounded-xl border">
  <Label htmlFor={currentQ.id} className="text-sm font-medium leading-relaxed flex-1 pr-4">
    {currentQ.question}
  </Label>
  <Switch
    id={currentQ.id}
    checked={currentAnswer === 'yes'}
    onCheckedChange={(checked) => handleAnswer(currentQ.id, checked ? 'yes' : 'no')}
  />
</div>
```

**Step 3: Add daily vs PRN preference to ED assessment**
In `ed-assessment-step.tsx`, add a new question:
- "Which option suits you best?" with two styled option cards:
  1. **Daily tablet (Tadalafil 5mg)** — "Take once daily for spontaneity. No planning required."
  2. **As-needed (Sildenafil / Tadalafil 20mg)** — "Take 30-60 minutes before. Use as required."

Store the preference: `setAnswer('edPreference', 'daily' | 'prn')`

**Step 4: Commit**
```
git add components/request/steps/ed-safety-step.tsx components/request/steps/ed-assessment-step.tsx
git commit -m "feat(ed): soft-block with follow-up, toggle UI, daily vs PRN preference"
```

---

### Task 12: Enhance Other Specialized Pathways

**Files:**
- Modify: `components/request/steps/hair-loss-assessment-step.tsx`
- Modify: `components/request/steps/womens-health-assessment-step.tsx`
- Modify: `components/request/steps/womens-health-type-step.tsx`
- Modify: `components/request/steps/weight-loss-assessment-step.tsx`
- Modify: `components/request/steps/consult-reason-step.tsx`

**Step 1: Hair loss pathway questions**
Ensure `hair-loss-assessment-step.tsx` asks about:
- Type of hair loss (male pattern, thinning, patchy)
- Previous treatments tried (toggle list)
- Preferred medication: Finasteride (oral) vs Minoxidil (topical) — option cards
- Duration of hair loss
- Any scalp conditions

**Step 2: Women's health pathway**
Ensure `womens-health-type-step.tsx` offers clear category selection:
- UTI symptoms
- Oral contraceptive pill (OCP) — new or repeat
- Emergency contraception (morning after pill)
Each routes to appropriate questions in `womens-health-assessment-step.tsx`.

**Step 3: Weight loss pathway questions**
Ensure `weight-loss-assessment-step.tsx` asks about:
- Current BMI (auto-calculate from height/weight inputs)
- Previous weight loss attempts
- Preferred medication type: GLP-1 (Ozempic/Mounjaro) vs Duromine — option cards
- Relevant medical history (diabetes, heart conditions — toggles)
- Previous adverse reactions to weight loss medications

**Step 4: General consult pathway**
Ensure `consult-reason-step.tsx` offers clear categories:
- Skin conditions (rash, acne, eczema)
- Infections (antibiotics needed)
- Starting new medication
- Other / General concern
Each with a free-text description field (min 20 chars).

**Step 5: Convert all checkboxes to toggles across ALL pathway steps**
Search all assessment step files for `Checkbox` components and replace with `Switch` (toggle) components. The pattern:

```tsx
// Before (checkbox)
<Checkbox checked={value} onCheckedChange={onChange} />

// After (toggle)
<Switch checked={value} onCheckedChange={onChange} />
```

Ensure all yes/no medical questions use the toggle pattern.

**Step 6: Commit**
```
git add components/request/steps/hair-loss-assessment-step.tsx components/request/steps/womens-health-assessment-step.tsx components/request/steps/womens-health-type-step.tsx components/request/steps/weight-loss-assessment-step.tsx components/request/steps/consult-reason-step.tsx
git commit -m "feat(pathways): enhance all specialized consultation pathways with toggles"
```

---

### Task 13: Make Fabricated Live Data Realistic

**Files:**
- Modify: `components/marketing/live-wait-time.tsx`
- Modify: `components/marketing/total-patients-counter.tsx`
- Modify: `app/medical-certificate/medical-certificate-client.tsx`
- Modify: `app/repeat-prescription/repeat-prescription-client.tsx`
- Modify: `app/general-consult/general-consult-client.tsx`
- Modify: `components/marketing/service-picker.tsx`

**Step 1: Adjust `live-wait-time.tsx` ranges**
Current ranges are too optimistic for a pre-launch clinic. Change to realistic small-clinic ranges:
- Med certs: 30–90 minutes (was 8-28)
- Prescriptions: 60–180 minutes (was 15-45)
- Consultations: 90–240 minutes (was 20-55)
Only show during "operating hours" (AEST 8am-8pm). Outside hours, show "Next business day."

**Step 2: Adjust `total-patients-counter.tsx`**
Change base count from 420 to a much smaller number (e.g., 15-30). Slow down the growth rate significantly. A new clinic wouldn't have served 420+ patients. Target: show something like "28 patients helped" with very slow increment (maybe 1-2 per day).

**Step 3: Adjust `getDailyStats()` in service pages**
In all 4 service page files, find the `getDailyStats()` function that seeds daily stats. Adjust to realistic small-clinic numbers:
- "Reviewed today": 2-8 (was 32-66)
- "Avg review time": 45-120 min (was 14-25 min)
- Rating: keep at 4.8-4.9

**Step 4: Adjust `service-picker.tsx` stats**
Update the dynamic stats to match realistic numbers for a small clinic.

**Step 5: Remove "Average response: ~30 min" from how-it-works page**
In `app/how-it-works/page.tsx`, the quick stats section shows "Average response: ~30 min". Change to "Average response: 1-2 hours" which is more realistic for a new solo-doctor clinic.

**Step 6: Commit**
```
git add components/marketing/live-wait-time.tsx components/marketing/total-patients-counter.tsx app/medical-certificate/medical-certificate-client.tsx app/repeat-prescription/repeat-prescription-client.tsx app/general-consult/general-consult-client.tsx components/marketing/service-picker.tsx app/how-it-works/page.tsx
git commit -m "fix(marketing): adjust fabricated stats to realistic small-clinic numbers"
```

---

### Task 14: Replace Stock Doctor Photos

**Files:**
- Modify: `app/medical-certificate/medical-certificate-client.tsx`
- Modify: Service page files that reference stock photos
- Modify: Testimonial/review components

**Step 1: Replace Unsplash stock photo URLs**
Find all URLs containing `unsplash.com` that depict people claiming to be platform doctors. Replace with either:
- DiceBear "notionists" style illustrated avatars (URL: `https://api.dicebear.com/7.x/notionists/svg?seed=Doctor1`)
- Or a generic medical icon/stethoscope SVG

Do NOT use real photos of people who aren't the actual doctor. The owner is the only doctor but doesn't want to advertise that.

**Step 2: Update doctor references**
Remove any specific doctor names from the marketing pages. Use generic references like "Our doctors" or "Your doctor" without naming anyone. Remove multi-doctor avatar groups that imply multiple doctors are online.

**Step 3: Handle the "doctor availability" pill**
In `hero.tsx`, there's a "Doctor online" availability pill. Keep it but make it generic — don't show specific doctor names or counts. Just "Doctor available" during business hours, "Requests reviewed next business day" outside hours.

**Step 4: Commit**
```
git add app/medical-certificate/medical-certificate-client.tsx components/marketing/hero.tsx
git commit -m "fix(credibility): replace stock photos with illustrations, remove fake doctor names"
```

---

### Task 15: Tone Down Pricing Psychology

**Files:**
- Modify: `components/marketing/hero.tsx`
- Modify: `app/general-consult/general-consult-client.tsx`
- Modify: Service page files

**Step 1: Remove struck-through GP prices from hero**
In `hero.tsx`, find the price anchor showing "$19.95 (save $40-70 vs GP)" or similar struck-through "$60-90 at a GP" text. Replace with plain pricing: "Medical certificates from $19.95" without the GP comparison.

**Step 2: Move comparisons below fold**
If GP price comparisons exist on other service pages (like the general consult page showing `<span className="line-through">$80–120 at GP</span>`), either remove them or move to a dedicated "How we compare" section further down the page. Don't use them as primary selling points near CTAs.

**Step 3: Commit**
```
git add components/marketing/hero.tsx app/general-consult/general-consult-client.tsx
git commit -m "fix(marketing): tone down pricing psychology, remove struck-through GP prices"
```

---

### Task 16: Fix Guest Registration Query Param Pass-Through

**Files:**
- Modify: `app/auth/register/page.tsx`

**Step 1: Forward email and redirect params to Clerk**
The current file is a simple redirect to Clerk sign-up URL, dropping all query params. Fix:

```typescript
import { redirect } from "next/navigation"

const CLERK_SIGN_UP_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 'https://accounts.instantmed.com.au/sign-up'

export default function RegisterRedirect({
  searchParams,
}: {
  searchParams: { email?: string; redirect?: string }
}) {
  const url = new URL(CLERK_SIGN_UP_URL)
  if (searchParams.email) {
    url.searchParams.set('email_address', searchParams.email)
  }
  if (searchParams.redirect) {
    url.searchParams.set('redirect_url', searchParams.redirect)
  }
  redirect(url.toString())
}
```

**Step 2: Commit**
```
git add app/auth/register/page.tsx
git commit -m "fix(auth): forward email and redirect params to Clerk sign-up URL"
```

---

### Task 17: Fix BECS Guest Account Email

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

**Step 1: Add guest email to BECS handler**
In the `checkout.session.async_payment_succeeded` handler (around lines 777-903), add the same `sendGuestCompleteAccountEmail()` call that exists in the `checkout.session.completed` handler. Check if the patient is a guest (no Clerk userId) and if so, send the account creation email.

Look for the pattern in the `checkout.session.completed` handler, then replicate it in the `async_payment_succeeded` handler after the payment confirmation email is sent.

**Step 2: Commit**
```
git add app/api/stripe/webhook/route.ts
git commit -m "fix(guest): send account creation email on BECS payment success"
```

---

## Phase 4: Prescription Simplification & Code Cleanup

### Task 18: Simplify Prescription System for Parchment

**Files:**
- Create: `_deprecated/repeat-rx/` directory
- Move: `lib/repeat-rx/rules-engine.ts` → `_deprecated/`
- Move: `app/api/repeat-rx/eligibility/route.ts` → `_deprecated/`
- Move: `lib/data/medications.ts` → `_deprecated/`
- Modify: `app/api/repeat-rx/submit/route.ts` (simplify)
- Modify: `app/doctor/repeat-rx/[id]/review-client.tsx` (simplify to request card)
- Keep: `lib/data/script-tasks.ts` (promote to primary interface)

**Step 1: Create `_deprecated/` directory and move files**
```bash
mkdir -p _deprecated/repeat-rx
mv lib/repeat-rx/rules-engine.ts _deprecated/repeat-rx/
mv app/api/repeat-rx/eligibility/route.ts _deprecated/repeat-rx/
mv lib/data/medications.ts _deprecated/repeat-rx/
```

**Step 2: Simplify submit route**
In `app/api/repeat-rx/submit/route.ts`:
- Remove the `checkEligibility()` call and all rules-engine references
- Keep: Zod validation, rate limiting, CSRF, payment flow
- Simplify intake creation: status always starts as `'pending'` (no `'requires_consult'` branch)
- Store the patient's details (medication name, strength, form, DOB, Medicare/IHI, address, phone) directly
- No eligibility result, no clinical summary generation
- Keep audit logging

**Step 3: Simplify doctor review UI**
In `review-client.tsx`, strip down to a simple request card:
- **Left panel:** Patient details (name, DOB, Medicare, IHI, address, phone, email) — all copy-ready for Parchment
- **Right panel:** Medication requested (name, strength, form), patient notes
- **Bottom:** "Mark Script Sent" toggle (the primary action). When toggled, calls `markScriptSentAction()` which updates `script_tasks` status to `'sent'`
- Remove: PBS schedule dropdown, pack quantity, repeats, dose instructions, eligibility results, suggested actions, red flags section
- Keep: Decline button (for safety), patient note viewing

**Step 4: Remove eligibility API endpoint entirely**
Delete `app/api/repeat-rx/eligibility/route.ts` (already moved to deprecated). If anything imports it, update to remove the import.

**Step 5: Remove PBS medication search from prescription intake**
The intake steps for prescriptions should be simplified:
- Step 1: Medication name + strength (simple text inputs, NOT PBS search widget)
- Step 2: Brief reason / notes (free text, min 10 chars)
- Step 3: Patient details (name, DOB, Medicare/IHI, address, phone — all required)
- Step 4: Consent + Payment

Update `lib/request/step-registry.ts` to reflect this simplified flow for `'prescription'` and `'repeat-script'` service types.

**Step 6: Commit**
```
git add -A
git commit -m "feat(prescriptions): simplify to request + toggle for Parchment workflow"
```

---

### Task 19: Remove Certificate Template Editor

**Files:**
- Modify: `lib/data/certificate-templates.ts`
- Check for UI components that reference template editing

**Step 1: Identify template editor UI**
Search for any components that reference `createTemplateVersion`, `activateTemplateVersion`, or template editing UI. These should be in the doctor admin area.

**Step 2: Remove template editing UI**
Delete or disable any template editing pages/components. The templates are ready in `/public/templates/` (work_template.pdf, study_template.pdf, carer_template.pdf).

**Step 3: Simplify `certificate-templates.ts`**
Keep only the read functions (`getActiveTemplate`, `getAllActiveTemplates`). Remove `createTemplateVersion`, `activateTemplateVersion`, `getLatestVersionNumber`, and version history functions. The template files are static PDFs — no versioning needed.

**Step 4: Commit**
```
git add lib/data/certificate-templates.ts
git commit -m "fix: remove certificate template editor, templates are static PDFs"
```

---

### Task 20: Delete Dead Code

**Files:**
- Delete: `app/request/unified-flow-client.tsx` (~1,410 lines)
- Delete: `app/start/unified-flow-client.tsx` (~1,400 lines)
- Verify: No imports reference these files

**Step 1: Verify no imports**
Run: `grep -r "unified-flow-client" --include="*.tsx" --include="*.ts" app/ components/ lib/`
Expected: No results (audit confirmed neither file is imported).

**Step 2: Delete both files**
```bash
rm app/request/unified-flow-client.tsx
rm app/start/unified-flow-client.tsx
```

**Step 3: Commit**
```
git add -A
git commit -m "chore: delete ~2,800 lines of dead unified-flow-client code"
```

---

### Task 21: Fix Stale Copy

**Files:**
- Modify: `app/how-it-works/page.tsx`

**Step 1: Replace "Welcome to 2024"**
At line 84 in the features array, change the description for "Digital delivery":
```typescript
// Before:
description: "Everything sent via email or SMS. Welcome to 2024."
// After:
description: "Everything sent via email or SMS. No app needed."
```

**Step 2: Commit**
```
git add app/how-it-works/page.tsx
git commit -m "fix: replace stale 'Welcome to 2024' copy with evergreen text"
```

---

### Task 22: Server-Side AHPRA Validation (Simple)

**Files:**
- Modify: `app/actions/approve-cert.ts`

**Step 1: Add simple AHPRA format check**
Per owner directive: keep it simple. Add a basic regex check for the AHPRA number format in the approval pipeline. The format is typically 3 uppercase letters followed by 10 digits: `/^[A-Z]{3}\d{10}$/`.

In `approve-cert.ts`, after retrieving the doctor's AHPRA number but before proceeding with approval, add:
```typescript
if (!profile.ahpra_number || !/^[A-Z]{3}\d{10}$/.test(profile.ahpra_number)) {
  return { success: false, error: "Invalid AHPRA number format. Please update your profile." }
}
```

Don't add external API validation — just the format check. Keep it simple as directed.

**Step 2: Commit**
```
git add app/actions/approve-cert.ts
git commit -m "fix: add simple AHPRA number format validation in approval pipeline"
```

---

### Task 23: Soft Lock Maximum Duration

**Files:**
- Modify: `app/doctor/intakes/[id]/intake-detail-client.tsx`

**Step 1: Add 60-minute maximum lock duration**
In the intake detail client, find the lock extension mechanism (`extendIntakeLockAction`). Add a check: if the lock has been held for more than 60 minutes continuously (check `lockAcquiredAt` timestamp), auto-release the lock and require re-claim.

Add state tracking for lock acquisition time. When extending, check if current time - acquisition time > 60 minutes. If so, call `releaseIntakeLockAction` and show a toast: "Lock expired after 60 minutes. Please re-claim to continue."

**Step 2: Commit**
```
git add app/doctor/intakes/[id]/intake-detail-client.tsx
git commit -m "fix: add 60-minute maximum intake lock duration with auto-release"
```

---

### Task 24: Audit Log Search Enhancement

**Files:**
- Modify: `app/doctor/admin/audit-logs/audit-logs-client.tsx`

**Step 1: Add date range picker**
Add a date range picker (using two date inputs or a date range component) next to the existing intake ID search. Filter events by `created_at` between the selected dates.

**Step 2: Add event type filter**
Add a `Select` dropdown with event type options: "All", "Status Change", "Payment", "Document Generated", "Email", "Refund". Filter the events display based on selection.

Update the `handleSearch()` function to include `date_from`, `date_to`, and `event_type` as URL search params.

**Step 3: Commit**
```
git add app/doctor/admin/audit-logs/audit-logs-client.tsx
git commit -m "feat(admin): add date range and event type filters to audit logs"
```

---

### Task 25: Update Auth Documentation

**Files:**
- Modify: `docs/SYSTEM_BRIEF.md`
- Modify: `docs/DEVELOPER_GUIDE.md`

**Step 1: Update auth references**
In both files, update authentication references from "Supabase Auth" to "Clerk". The DEVELOPER_GUIDE already has a note about Clerk (line 145) but the main sections still reference Supabase Auth patterns.

Document the Clerk-to-Supabase JWT bridging mechanism. Remove any HIPAA references (not applicable in Australia — use Australian Privacy Act / Health Records Act references instead).

**Step 2: Commit**
```
git add docs/SYSTEM_BRIEF.md docs/DEVELOPER_GUIDE.md
git commit -m "docs: update auth references from Supabase Auth to Clerk"
```

---

## Phase 5: Low-Priority & Deferred Items (Full Remediation)

### Task 26: Fix Email Outbox Broken Back Link

**Files:**
- Search and fix: Any component with broken `/admin/ops` link → `/doctor/admin/ops`

**Step 1: Find and fix broken link**
```bash
grep -r "/admin/ops" --include="*.tsx" --include="*.ts" app/ components/
```
Replace all instances of `/admin/ops` with `/doctor/admin/ops`.

**Step 2: Commit**
```
git commit -m "fix: correct email outbox back link path"
```

---

### Task 27: Remove Dead Database Artifacts

**Files:**
- Create migration: `supabase/migrations/YYYYMMDDHHMMSS_remove_dead_artifacts.sql`

**Step 1: Remove dead SQL function and table**
Create a new Supabase migration to:
- DROP FUNCTION IF EXISTS `merge_guest_profile()`
- DROP TABLE IF EXISTS `failed_profile_merges`
- DROP any dead `RegisterClient` component references

Only proceed if these are confirmed unused by searching the codebase.

**Step 2: Commit**
```
git commit -m "chore: remove dead merge_guest_profile and failed_profile_merges"
```

---

### Task 28: Clean Up Empty Config Files & Screenshot

**Files:**
- Delete: `.windsurf/` (if empty/unused)
- Delete: `.cursor/` (if empty/unused)
- Delete: Any screenshot files in API directory

**Step 1: Check and remove**
```bash
# Check if directories are empty
ls -la .windsurf/ .cursor/
# Find screenshot files in api directory
find app/api -name "*.png" -o -name "*.jpg" -o -name "*.jpeg"
```

Delete if confirmed empty/unused.

**Step 2: Commit**
```
git commit -m "chore: clean up empty config files and stray screenshots"
```

---

### Task 29: Documentation Consolidation

**Files:**
- Consolidate: SEO docs (3 docs → 1)
- Consolidate: Medication search docs (2 docs → 1)
- Consolidate: Design system specs (3 conflicting → 1)
- Update: Blank sign-off sections in compliance docs

**Step 1: Identify duplicate docs**
Search `/docs/` for overlapping SEO, medication search, and design system documents. Merge content into single authoritative versions. Add redirects or delete duplicates.

**Step 2: Fill blank sign-offs**
Find compliance documents with blank sign-off dates/names and add `[PENDING]` placeholders with comments noting they need real signatures.

**Step 3: Commit**
```
git commit -m "docs: consolidate duplicates, fill blank compliance sign-offs"
```

---

### Task 30: Cosmetic & UX Polish (Low Priority)

**Files:** Various marketing and UI files

**Step 1: Reduce checkout trust badges**
In the checkout step, reduce trust badges from 8+ to 3-4 most impactful ones (AHPRA, SSL, Money-back guarantee).

**Step 2: Replace "Get started" CTAs**
Replace generic "Get started" CTA text with "Start a Request" throughout the marketing pages for clarity.

**Step 3: Remove shooting stars and animated orbs**
If `AnimatedOrbs` and shooting star effects are still present in marketing pages beyond `how-it-works`, consider removing them for a more clinical/professional feel. Keep subtle animations only.

**Step 4: Commit**
```
git commit -m "fix(ux): reduce trust badges, improve CTAs, remove excessive animations"
```

---

## Testing & Verification

### Task 31: Run Full Test Suite

**Step 1: Run unit tests**
```bash
pnpm test
```
Expected: All tests pass.

**Step 2: Run E2E tests**
```bash
pnpm test:e2e
```
Expected: All 42+ E2E tests pass.

**Step 3: Run type checking**
```bash
pnpm typecheck
```
Expected: No type errors.

**Step 4: Run build**
```bash
pnpm build
```
Expected: Build succeeds with no errors.

**Step 5: Manual smoke test checklist**
- [ ] Med cert flow: Select cert type, choose 1/2/3 day duration, submit as guest
- [ ] Repeat script flow: Enter medication (text input), submit, verify doctor sees details
- [ ] ED consult flow: Answer safety questions with toggles, daily vs PRN preference
- [ ] Guest → signup: Complete payment as guest, click create account, verify email pre-fill
- [ ] Doctor queue: View new requests, claim, approve cert, mark script sent
- [ ] Pricing: Verify all prices match Stripe on service hub and checkout
- [ ] Live stats: Verify realistic numbers during and outside business hours

---

## Success Criteria

- [ ] All critical clinical safety issues resolved (controlled substance detection, emergency validation, safety consent)
- [ ] All pricing matches Stripe products exactly
- [ ] 3-day certificate option available at $39.95
- [ ] Phone required for prescriptions + consults only (not med-certs)
- [ ] All yes/no inputs are toggle switches (not checkboxes)
- [ ] ED pathway has daily vs PRN preference and soft-block follow-up
- [ ] Safety consent merged into review step (not standalone)
- [ ] Prescription flow simplified to request + "Script Sent" toggle
- [ ] Certificate template editor removed
- [ ] Fabricated live data shows realistic small-clinic numbers
- [ ] Stock doctor photos replaced with illustrations
- [ ] GP price comparisons removed from hero/CTAs
- [ ] Guest → signup flow works with email pre-fill
- [ ] ~4,500 lines of dead/deprecated code removed
- [ ] All PII removed from documentation
- [ ] International name characters supported
- [ ] No regression in E2E test suite (42+ tests)
- [ ] Build succeeds cleanly

# Repeat-Rx Dedicated-Service Routing Implementation Plan

> **Authority:** Reference only. This file has no independent execution authority. `docs/ROADMAP.md` is the sole active queue; execute from this record only when the ROADMAP explicitly activates it.

> **Status:** Implemented and merged 2026-08-05. Retained as the evidence record for the tiered routing policy in CLAUDE.md and docs/CLINICAL.md.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Also mandatory for this repo: `instantmed-clinical-safety-review` (clinical routing change) and
> `instantmed-checkout-payment-review` (touches the checkout validation chokepoint) before edits;
> `instantmed-ui-browser-verification` before final sign-off on Task 5.

**Goal:** Stop dedicated-service and gated-service medicines from flowing through the $29.95 generic repeat-prescription lane — hard-route PDE5 inhibitors to the ED consult and hair-loss medicines to the Hair Loss consult, and flag GLP-1/weight-loss-class medicines for the doctor — enforced server-side so it is never client-only.

**Architecture:** Extend the existing single detector (`detectDedicatedServiceForMedication`) with an `enforcement` tier per match (`hard` = steer with no escape + server checkout block; `soft` = steer with escape, today's OCP behaviour; `flag_only` = doctor flag, no steer). Add a sibling detector for gated-service (weight-loss-class) medicines that only emits a doctor flag. Both checkout paths (auth + guest) already funnel through `runClinicalValidation` → `validateRepeatScriptPayload` + `deriveIntakeFlags`, so the server block and flags land in one chokepoint.

**Tech Stack:** TypeScript strict, Vitest (`lib/__tests__`, node env), Playwright (`e2e/`), Next.js 15.5 App Router. No new dependencies, no DB migration (flags persist to the existing `intakes.risk_flags` JSONB).

---

## Evidence (prod, read-only, queried 2026-08-05)

Issued scripts by lane (`prescriptions` joined to `intakes`, lifetime of the table ≈ since 2026-06-25):

| Medicine class | Via dedicated consult | Via repeat lane ($29.95) | Repeat-lane detail |
|---|---|---|---|
| PDE5i (ED) | 8 (ed consult, $49.95) | **4** (4 patients, latest 2026-08-05) | all sildenafil |
| Hair loss | 3 (hair_loss consult, $49.95) | **2** (2 patients, latest 2026-08-05) | finasteride; may include legitimate BPH 5 mg |
| Weight-loss class | 0 (service gated, reserved $89.95) | **6** (6 patients, latest 2026-08-03) | 3 phentermine, 2 tirzepatide, 1 semaglutide |
| UTI antibiotics | 1 (womens_health) | **0** | no leak observed |

- 4 of 12 PDE5i scripts (33%) went through the cheap lane with **no structured nitrate/cardiac screen** (the repeat flow's history step asks allergies/conditions/other-meds free text only; the nitrate absolute-contraindication rule lives only in the ED flow — `lib/safety/rules.ts:378`).
- Phentermine is **not** on `CONTROLLED_SUBSTANCE_TERMS` and the `duromine_cardiac_risk` validator only exists in the dormant gated weight-loss flow (`lib/clinical/consult-validators.ts:633`) — so Duromine repeats currently get zero structured screening.
- The hair-loss steer's escape button has been used on exactly **1 paid intake ever** (since #165, ~6 weeks) — removing it costs ≈ zero conversion.
- Direct price gap at current volume: 4 × $20 (PDE5i) + ≤2 × $20 (hair) ≈ **$100–120**, plus 6 weight-loss orders served at $29.95 against a reserved $89.95 price point. Small in dollars today, but it is a third of PDE5i volume, it scales with the Google Ads `/prescriptions` funnel, and the screening bypass is the larger exposure.

## Decisions

- **D1 (settled, operator-stated):** PDE5i and hair-loss medicines are hard-routed — steer with no escape + server checkout block. OCP keeps its soft steer + "continuing my current pill" escape: `ocp_repeat → repeat-script` is locked product policy (`lib/request/consult-subtypes.ts:19`, CLAUDE.md). BPH exclusions (Proscar/finasteride 5 mg, dutasteride 0.5 mg, Loniten, prostate markers) keep returning null — legitimate repeats, unchanged.
- **D2 — ⚠️ UNRESOLVED, AWAITING OPERATOR DECISION. Weight-loss-class medicines currently raise a `gated_service_medication` doctor flag and nothing else** (no steer — there is no live destination — and no block). This was an assistant default, not an operator or clinical ruling, and **the rationale originally given here was factually wrong**: it claimed a block would wall out type-2-diabetes patients repeating Ozempic/Victoza/Mounjaro. Checking the requested-medicine field (`answers->>'medicationName'`, NOT a whole-JSON match, which over-counts by ~30% because patients *list* these as current medicines) showed **every observed request stated a weight-management indication and none stated diabetes**. What the data actually shows is a de-facto weight-loss service running through the $29.95 repeat lane for a service that is gated at a reserved $89.95, with no BMI gate or eligibility screening, and with phentermine — which has no `CONTROLLED_SUBSTANCE_TERMS` entry and whose cardiac-risk validator lives only in the dormant gated flow — receiving no structured cardiac screening. **The operator must choose: launch weight loss properly, block the class, or knowingly retain flag-only.** To block, change the `gated` branch to return `{ valid: false, requiresConsult: true, error: <copy> }` and add the mirrored client terminal card. Do not record any option as settled policy in `docs/CLINICAL.md` until the operator decides.
- **D3 (out of scope):** UTI-antibiotic detection. Zero repeat-lane scripts observed; repeat trimethoprim/nitrofurantoin is usually legitimate prophylaxis. Revisit only with evidence.
- **Existing in-queue intakes** (Shane Whelan sildenafil, Simeon Thomas finasteride) are handled by the doctor in the queue — decline with auto full refund and redirect, or prescribe with context. No backfill of old intakes.
- **Known accepted edge:** a pre-fix `checkout_failed` intake retried through `retry-payment.ts` skips `runClinicalValidation` (answers were validated at creation, before this rule existed). Volume ≈ 0; every prescription is still doctor-reviewed.

## Enforcement tiers after this plan

| Match | Detector result | Medication step UI | Server checkout | Doctor flag |
|---|---|---|---|---|
| Sildenafil/tadalafil/etc., no BPH/PAH context | `ed` / `hard` | Steer, **no escape** | **Blocked** (`requiresConsult`) | `dedicated_service_medication` (if it ever lands, e.g. old draft) |
| PDE5i **with** BPH/PAH markers (incl. in indication) | `ed` / `flag_only` | No steer | Passes | `dedicated_service_medication` |
| Finasteride 1 mg / minoxidil / hair brands | `hair_loss` / `hard` | Steer, **no escape** (escape removed) | **Blocked** | `dedicated_service_medication` |
| Finasteride 5 mg / Proscar / prostate markers | `null` | — | Passes | none (unchanged) |
| OCP brands/ingredients | `womens_health` / `soft` | Steer **with** escape (unchanged) | Passes | `dedicated_service_medication` (unchanged) |
| Semaglutide/tirzepatide/phentermine/etc. | gated detector | No steer | Passes | **`gated_service_medication`** (new) |

---

### Task 1: Detector — enforcement tiers + ED patterns + exemptions

**Files:**
- Modify: `lib/clinical/medication-service-routing.ts`
- Test: `lib/__tests__/medication-service-routing.test.ts`

**Step 1: Write the failing tests**

Append to `lib/__tests__/medication-service-routing.test.ts` (keep existing tests; they will need the new `enforcement` field added to exact-match assertions in Step 4):

```ts
describe("ED (PDE5 inhibitor) routing", () => {
  it.each([
    "Sildenafil", "sildenafil 100mg tablet", "Viagra", "CIALIS 20mg",
    "tadalafil", "vardenafil", "Levitra", "avanafil", "Spedra",
    "Vedafil 50mg", "silvasta",
  ])("hard-steers %s to the ED consult", (text) => {
    expect(detectDedicatedServiceForMedication(text)).toMatchObject({
      subtype: "ed",
      enforcement: "hard",
    })
  })

  it("matches ED named only in the indication text appended to the scan", () => {
    // Brand we don't list + indication carrying the service name
    expect(detectDedicatedServiceForMedication("Silagra 100mg for erectile dysfunction")).toMatchObject({
      subtype: "ed",
      enforcement: "hard",
    })
  })

  it.each([
    "Revatio 20mg",                                   // PAH brand
    "sildenafil 20mg pulmonary hypertension",          // PAH dose + context
    "tadalafil 5mg for BPH",                           // BPH context
    "tadalafil daily prostate symptoms",
  ])("downgrades %s to flag_only (stated BPH/PAH context)", (text) => {
    expect(detectDedicatedServiceForMedication(text)).toMatchObject({
      subtype: "ed",
      enforcement: "flag_only",
    })
  })

  it("does NOT exempt tadalafil 5mg on dose alone (5mg daily is also the ED preset)", () => {
    expect(detectDedicatedServiceForMedication("tadalafil 5mg")).toMatchObject({
      subtype: "ed",
      enforcement: "hard",
    })
  })
})

describe("enforcement tiers on existing classes", () => {
  it("hair-loss medicines are now hard-enforced", () => {
    expect(detectDedicatedServiceForMedication("finasteride 1mg")).toMatchObject({
      subtype: "hair_loss",
      enforcement: "hard",
    })
  })

  it("OCP stays soft (escape + no server block is locked policy)", () => {
    expect(detectDedicatedServiceForMedication("Levlen ED")).toMatchObject({
      subtype: "womens_health",
      enforcement: "soft",
    })
  })

  it("BPH-dose finasteride still returns null", () => {
    expect(detectDedicatedServiceForMedication("finasteride 5mg prostate")).toBeNull()
  })
})
```

Note the `Levlen ED` case: the OCP check runs **before** the ED check (already true today) so the pill brand containing the token "ED" classifies as `womens_health`, not `ed`. Keep that ordering.

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run lib/__tests__/medication-service-routing.test.ts`
Expected: new cases FAIL (`enforcement` undefined / ED matches null); pre-existing cases pass.

**Step 3: Implement**

In `lib/clinical/medication-service-routing.ts`:

```ts
export type DedicatedServiceSubtype = "ed" | "hair_loss" | "womens_health"

/**
 * How the match is enforced end-to-end:
 *  - "hard": steer with NO escape in the medication step AND a checkout block
 *    in validateRepeatScriptPayload. ED + hair loss (operator decision
 *    2026-08-05 — the $29.95 repeat lane was bypassing the dedicated screens
 *    and the $49.95 price).
 *  - "soft": steer with an explicit escape, no server block. OCP only —
 *    "continuing the same pill" is deliberately a cheap repeat (locked policy,
 *    see consult-subtypes.ts).
 *  - "flag_only": no steer; the doctor sees the dedicated_service_medication
 *    flag. PDE5i with stated BPH/PAH context — legitimate non-ED repeats, but
 *    the stated context is self-reported so the doctor must see it.
 */
export type DedicatedServiceEnforcement = "hard" | "soft" | "flag_only"

export interface DedicatedServiceMatch {
  subtype: DedicatedServiceSubtype
  serviceLabel: string
  reason: string
  enforcement: DedicatedServiceEnforcement
}
```

Add pattern lists (after `OCP_PATTERNS`):

```ts
// PDE5 inhibitors: active ingredients + AU brands. The ED consult owns these —
// it runs the nitrate hard block and cardiac screen the repeat flow never asks.
const ED_PATTERNS: ReadonlyArray<RegExp> = [
  /\bsildenafil\b/i,
  /\btadalafil\b/i,
  /\bvardenafil\b/i,
  /\bavanafil\b/i,
  /\bviagra\b/i,
  /\bcialis\b/i,
  /\blevitra\b/i,
  /\bspedra\b/i,
  /\bvedafil\b/i,
  /\bsilvasta\b/i,
  // Indication-text signals (the scan text includes the "what is it for"
  // answer): catches brands we don't list.
  /\berectile\s*dysfunction\b/i,
  /\berectile\b/i,
  /\bimpotence\b/i,
  /\bed\b/i, // standalone token only — word boundaries keep "needed"/"tired" safe
]

// Stated non-ED context for a PDE5i: pulmonary arterial hypertension
// (Revatio, sildenafil 20 mg) or BPH/LUTS (tadalafil low-dose daily).
// Downgrades hard → flag_only: the repeat proceeds, the doctor sees the flag
// and the self-reported context. Dose alone NEVER exempts — tadalafil 5 mg
// daily is also the ED daily preset.
const ED_REPEAT_CONTEXT_MARKERS: ReadonlyArray<RegExp> = [
  /\brevatio\b/i,
  /pulmonary\s+(?:arterial\s+)?hypertension/i,
  /\bpah\b/i,
  /\bprostate\b/i,
  /\bbph\b/i,
  /benign\s+prostatic/i,
  /\bluts\b/i,
  // Sildenafil 20 mg is the PAH strength, not an ED SKU.
  /sildenafil[^0-9]{0,10}20\s*mg/i,
]
```

Rewrite the classifier (same export name/signature) so each branch carries its tier:

```ts
export function detectDedicatedServiceForMedication(
  scanText: string | undefined | null,
): DedicatedServiceMatch | null {
  if (typeof scanText !== "string" || !scanText.trim()) return null
  const text = scanText.toLowerCase()

  // Women's health (OCP) first — pill brands are unambiguous, never overlap
  // with 5α-reductase inhibitors, and "Levlen ED" must not read as erectile
  // dysfunction. Soft: escape + no server block is locked policy.
  if (OCP_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      subtype: "womens_health",
      serviceLabel: "Women's Health",
      reason: "Contraceptive pill — has a dedicated women's health pathway",
      enforcement: "soft",
    }
  }

  if (ED_PATTERNS.some((pattern) => pattern.test(text))) {
    const statedNonEdContext = ED_REPEAT_CONTEXT_MARKERS.some((pattern) => pattern.test(text))
    return {
      subtype: "ed",
      serviceLabel: "Erectile Dysfunction",
      reason: statedNonEdContext
        ? "PDE5 inhibitor kept as repeat — patient states BPH/PAH context"
        : "PDE5 inhibitor — prescribed through the ED service (nitrate + cardiac screening)",
      enforcement: statedNonEdContext ? "flag_only" : "hard",
    }
  }

  const looksHairLoss = HAIR_LOSS_PATTERNS.some((pattern) => pattern.test(text))
  const looksBph = BPH_MARKERS.some((pattern) => pattern.test(text))
  if (looksHairLoss && !looksBph) {
    return {
      subtype: "hair_loss",
      serviceLabel: "Hair Loss",
      reason: "Hair-loss medicine — has a dedicated hair loss pathway",
      enforcement: "hard",
    }
  }

  return null
}
```

Update the module header comment: the routing is now tiered (hard for ED/hair loss per operator decision 2026-08-05; soft for OCP; the UTI-antibiotic out-of-scope note stays).

**Step 4: Run tests, fix existing assertions**

Run: `pnpm vitest run lib/__tests__/medication-service-routing.test.ts`
Existing exact-object assertions (`toEqual`) will fail on the new `enforcement` field — update them to expect `enforcement: "soft"` (OCP) / `"hard"` (hair loss) rather than switching to `toMatchObject`, so the tier itself stays pinned.
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/clinical/medication-service-routing.ts lib/__tests__/medication-service-routing.test.ts
git commit -m "feat(clinical): tiered dedicated-service routing with ED detection"
```

---

### Task 2: Gated-service (weight-loss-class) detector

**Files:**
- Modify: `lib/clinical/medication-service-routing.ts`
- Test: `lib/__tests__/medication-service-routing.test.ts`

**Step 1: Write the failing tests**

```ts
describe("gated-service (weight-loss-class) detection", () => {
  it.each([
    "semaglutide", "Ozempic 1mg", "Wegovy", "Rybelsus 7mg",
    "tirzepatide", "Mounjaro", "Zepbound",
    "liraglutide", "Saxenda", "Victoza",
    "phentermine 30mg", "Duromine", "Metermine",
    "orlistat", "Xenical",
  ])("flags %s as a gated-service medicine", (text) => {
    expect(detectGatedServiceMedication(text)).toMatchObject({
      serviceLabel: "Weight loss",
    })
  })

  it("returns null for unrelated medicines", () => {
    expect(detectGatedServiceMedication("atorvastatin 20mg")).toBeNull()
    expect(detectGatedServiceMedication("metformin 500mg")).toBeNull()
  })
})
```

**Step 2: Run to verify failure** — `pnpm vitest run lib/__tests__/medication-service-routing.test.ts` → FAIL (`detectGatedServiceMedication` not exported).

**Step 3: Implement**

```ts
// Weight-loss-class medicines. The weight-loss service is GATED (reserved
// $89.95, not launched — docs/CLINICAL.md "manual review only"), so there is
// no steer destination. Flag-only by explicit decision (D2, plan
// 2026-08-05): several of these are ALSO legitimate type-2-diabetes repeats
// (Ozempic, Victoza, Mounjaro), so a hard block would wall diabetic patients.
// The doctor decides with the flag + the patient's stated indication.
const GATED_WEIGHT_LOSS_PATTERNS: ReadonlyArray<RegExp> = [
  /\bsemaglutide\b/i, /\bozempic\b/i, /\bwegovy\b/i, /\brybelsus\b/i,
  /\btirzepatide\b/i, /\bmounjaro\b/i, /\bzepbound\b/i,
  /\bliraglutide\b/i, /\bsaxenda\b/i, /\bvictoza\b/i,
  /\bphentermine\b/i, /\bduromine\b/i, /\bmetermine\b/i,
  /\borlistat\b/i, /\bxenical\b/i,
]

export interface GatedServiceMatch {
  serviceLabel: string
  reason: string
}

/** Medicines whose dedicated service is not yet live. Doctor flag only. */
export function detectGatedServiceMedication(
  scanText: string | undefined | null,
): GatedServiceMatch | null {
  if (typeof scanText !== "string" || !scanText.trim()) return null
  const text = scanText.toLowerCase()
  if (GATED_WEIGHT_LOSS_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      serviceLabel: "Weight loss",
      reason: "Weight-loss-class medicine — service gated; may also be a diabetes repeat. Doctor decides.",
    }
  }
  return null
}
```

**Step 4: Run tests** → PASS. **Step 5: Commit**

```bash
git add lib/clinical/medication-service-routing.ts lib/__tests__/medication-service-routing.test.ts
git commit -m "feat(clinical): detect gated weight-loss-class medicines in repeat flow"
```

---

### Task 3: Doctor flags — taxonomy entry + emission (incl. indication in scan text)

**Files:**
- Modify: `lib/clinical/intake-flags.ts` (taxonomy)
- Modify: `lib/clinical/derive-intake-flags.ts`
- Test: `lib/__tests__/derive-intake-flags.test.ts`, `lib/__tests__/intake-flags-panel-render.test.tsx`

**Step 1: Write the failing tests** (in `derive-intake-flags.test.ts`; follow the file's existing payload-builder helpers)

```ts
it("flags a PDE5i that reaches a repeat payload (dedicated_service_medication)", () => {
  const flags = deriveIntakeFlags({
    category: "prescription",
    subtype: "repeat",
    answers: repeatAnswers({ medication_name: "Sildenafil", strength: "100mg" }),
  })
  expect(flags).toContainEqual(expect.objectContaining({
    code: "dedicated_service_medication",
    detail: expect.stringContaining("Erectile Dysfunction"),
  }))
})

it("flags a flag_only PDE5i (BPH context in the indication answer)", () => {
  const flags = deriveIntakeFlags({
    category: "prescription",
    subtype: "repeat",
    answers: repeatAnswers({ medication_name: "Tadalafil", strength: "5mg", indication: "BPH" }),
  })
  expect(flags).toContainEqual(expect.objectContaining({ code: "dedicated_service_medication" }))
})

it("flags a gated weight-loss-class medicine (gated_service_medication)", () => {
  const flags = deriveIntakeFlags({
    category: "prescription",
    subtype: "repeat",
    answers: repeatAnswers({ medication_name: "Ozempic", indication: "type 2 diabetes" }),
  })
  expect(flags).toContainEqual(expect.objectContaining({
    code: "gated_service_medication",
    severity: "attention",
  }))
})
```

**Step 2: Run to verify failure** — `pnpm vitest run lib/__tests__/derive-intake-flags.test.ts` → FAIL (BPH-indication case emits nothing; `gated_service_medication` not a taxonomy code).

**Step 3: Implement**

`lib/clinical/intake-flags.ts` — add to `INTAKE_FLAG_TAXONOMY` (after `dedicated_service_medication`):

```ts
  // A weight-loss-class medicine (GLP-1 / phentermine / orlistat) was requested
  // as a repeat. The weight-loss service is gated, and several of these are
  // also legitimate diabetes repeats — the doctor decides with the stated
  // indication in view. See lib/clinical/medication-service-routing.ts.
  gated_service_medication: { label: "Weight-loss-class medicine (service gated)", severity: "attention" },
```

`lib/clinical/derive-intake-flags.ts` — inside `deriveRepeatScriptFlags`, scan the medication text **plus the shared indication answer** (the indication is where patients name the condition — both real-world cases typed the service name there). Do NOT widen `buildRepeatScriptMedicationValidationText` itself: it feeds the controlled-substance scan, and a patient mentioning a *past* S8 medicine in their indication ("was on Valium, now on…") must not hard-block a legitimate request.

```ts
  const indication = stringAnswer(answers, ["indication"])

  for (const medication of medications) {
    const medicationText = buildRepeatScriptMedicationValidationText(medication)
    const routingScanText = [medicationText, indication].filter(Boolean).join(" ")

    const dedicatedService = detectDedicatedServiceForMedication(routingScanText)
    if (dedicatedService) {
      flags.push(makeIntakeFlag("dedicated_service_medication", {
        source: "clinical",
        detail: `${medication.displayName || medication.name} → ${dedicatedService.serviceLabel}${
          dedicatedService.enforcement === "flag_only" ? ` (${dedicatedService.reason})` : ""
        }`,
      }))
    }

    const gatedService = detectGatedServiceMedication(routingScanText)
    if (gatedService) {
      flags.push(makeIntakeFlag("gated_service_medication", {
        source: "clinical",
        detail: `${medication.displayName || medication.name} — ${gatedService.reason}`,
      }))
    }
    // …existing UNKNOWN/strength/form logic unchanged…
  }
```

(Import `detectGatedServiceMedication` alongside the existing import.)

**Step 4: Run tests**

Run: `pnpm vitest run lib/__tests__/derive-intake-flags.test.ts lib/__tests__/intake-flags-panel-render.test.tsx`
The panel-render test renders taxonomy codes — if it enumerates the taxonomy, the new code is picked up automatically; if it asserts a fixed code list, add `gated_service_medication`.
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/clinical/intake-flags.ts lib/clinical/derive-intake-flags.ts lib/__tests__/derive-intake-flags.test.ts lib/__tests__/intake-flags-panel-render.test.tsx
git commit -m "feat(clinical): gated_service_medication flag + indication-aware routing scan"
```

---

### Task 4: Server checkout block for hard-enforced matches

**Files:**
- Modify: `lib/validation/repeat-script-schema.ts` (inside `validateRepeatScriptPayload`)
- Test: `lib/__tests__/repeat-script-schema.test.ts`

Both checkout paths inherit automatically: `lib/stripe/checkout/clinical-validation.ts` (`runClinicalValidation`) calls `validateRepeatScriptPayload` for `prescription` + `repeat`/`chronic_review`, and is used by `lib/stripe/checkout.ts` (auth) and `lib/stripe/guest-checkout.ts` (guest). No changes needed in those files.

**Step 1: Write the failing tests** (follow the file's existing payload-builder style)

```ts
describe("dedicated-service hard routing", () => {
  it("blocks a sildenafil repeat with requiresConsult", () => {
    const result = validateRepeatScriptPayload(validPayload({ medication_name: "Sildenafil", strength: "100mg" }))
    expect(result).toMatchObject({ valid: false, requiresConsult: true })
    expect(result.error).toMatch(/erectile dysfunction/i)
  })

  it("blocks a finasteride 1mg repeat with requiresConsult", () => {
    const result = validateRepeatScriptPayload(validPayload({ medication_name: "Finasteride", strength: "1mg" }))
    expect(result).toMatchObject({ valid: false, requiresConsult: true })
    expect(result.error).toMatch(/hair loss/i)
  })

  it("passes BPH-dose finasteride (Proscar)", () => {
    expect(validateRepeatScriptPayload(validPayload({ medication_name: "Finasteride", strength: "5mg" })).valid).toBe(true)
  })

  it("passes a PDE5i with stated BPH/PAH context (flag_only)", () => {
    expect(validateRepeatScriptPayload(validPayload({ medication_name: "Tadalafil", strength: "5mg", indication: "BPH" })).valid).toBe(true)
  })

  it("passes an OCP repeat — soft enforcement is locked policy", () => {
    expect(validateRepeatScriptPayload(validPayload({ medication_name: "Levlen ED" })).valid).toBe(true)
  })

  it("passes a gated weight-loss medicine (flag-only per D2)", () => {
    expect(validateRepeatScriptPayload(validPayload({ medication_name: "Ozempic" })).valid).toBe(true)
  })
})
```

**Step 2: Run to verify failure** — `pnpm vitest run lib/__tests__/repeat-script-schema.test.ts` → the two block cases FAIL (currently valid).

**Step 3: Implement**

In `validateRepeatScriptPayload`, after the controlled-substance loops (after line ~300) and before the `MAX_REPEAT_SCRIPT_MEDICATIONS` check:

```ts
  // Dedicated-service hard routing (operator decision 2026-08-05): PDE5i and
  // hair-loss medicines are prescribed through their own services, which run
  // the screening this flow does not (ED: nitrate + cardiac). Server-side so
  // a stale client or restored draft can never pay through the gap. The scan
  // includes the indication answer (see derive-intake-flags for why the shared
  // validation text must NOT be widened).
  const routingIndication = typeof answers.indication === "string" ? answers.indication : ""
  for (const medication of medications) {
    const routingMatch = detectDedicatedServiceForMedication(
      [buildRepeatScriptMedicationValidationText(medication), routingIndication].filter(Boolean).join(" "),
    )
    if (routingMatch?.enforcement === "hard") {
      const serviceCopy = routingMatch.subtype === "ed"
        ? "our Erectile Dysfunction service, which includes the required heart and medication safety check"
        : "our Hair Loss service, which includes the right safety screening"
      return {
        valid: false,
        error: `This medicine is prescribed through ${serviceCopy}. Please start that request instead — it takes a few minutes and your details carry over.`,
        requiresConsult: true,
      }
    }
  }
```

(Import `detectDedicatedServiceForMedication` from `@/lib/clinical/medication-service-routing`.)

**Step 4: Run tests** — `pnpm vitest run lib/__tests__/repeat-script-schema.test.ts` → PASS.

**Step 5: Commit**

```bash
git add lib/validation/repeat-script-schema.ts lib/__tests__/repeat-script-schema.test.ts
git commit -m "feat(checkout): server-side block for hard-routed dedicated-service medicines"
```

---

### Task 5: Medication step UI — enforcement-aware steer + indication scan + analytics

**Files:**
- Modify: `components/request/steps/medication-step.tsx`

No unit test (component tests are node-env only in this repo); covered by Task 6 E2E + browser verification below.

**Step 1: Scan text includes the indication** — in the `serviceSteer` useMemo, append the indication answer and add it to the dependency array:

```ts
  const serviceSteer = useMemo<DedicatedServiceMatch | null>(() => {
    if (!steerEnabled) return null
    for (const med of medications) {
      const scanText = [med.name, med.strength, med.form, indication]
        .filter(Boolean)
        .join(" ")
      const match = detectDedicatedServiceForMedication(scanText)
      // flag_only matches never steer — the doctor sees the flag instead.
      if (match && match.enforcement !== "flag_only") return match
    }
    return null
  }, [steerEnabled, medications, indication])
```

Because the indication field is on this same screen and the steer alert never unmounts the form, a BPH patient who types "prostate"/"BPH" under "What is this medication for?" lifts the hard steer live (tadalafil → flag_only). This is the designed disambiguation path, mirroring `BPH_MARKERS`.

**Step 2: Escape only for soft enforcement + ED copy.** In the steer Alert:
- Body copy becomes a three-way branch: keep the existing women's-health and hair-loss sentences; add ED: `"This medicine is prescribed through our Erectile Dysfunction service, which asks the required heart and medication safety questions first. If you take it for blood pressure or prostate symptoms, enter that under \"What is this medication for?\" and you can continue here."`
- Render the ghost escape `Button` **only when** `serviceSteer.enforcement === "soft"` (keeps the women's-health label branch; delete the hair-loss escape label). `steerDismissedSubtype` logic is unchanged — it simply becomes reachable only for soft matches.

**Step 3: Analytics.** Two personless events, mirroring the existing `posthog?.capture('step_completed', …)` pattern — subtype/enforcement tokens only, never the typed medication text:
- `medication_steer_shown` — fire once per subtype when `steerActive` becomes true (useEffect on `steerActive`/`serviceSteer?.subtype`, guard with a `useRef<Set<string>>` so re-renders don't re-fire): `{ subtype, enforcement }`.
- `medication_steer_followed` — in `goToDedicatedService` before `router.push`: `{ subtype }`.

**Step 4: Verify in the browser** (per `instantmed-ui-browser-verification` — dev server on port 3060):
1. `/request?service=repeat-script` → type "Sildenafil" → steer appears, **no escape button**, Continue refuses; CTA lands on `/request?service=consult&subtype=ed`.
2. Same, but set indication to "BPH" with medication "Tadalafil" → steer clears, Continue proceeds.
3. Type "Finasteride" + strength "1mg" → steer, no escape. Strength "5mg" → no steer.
4. Type "Levlen" → steer **with** "I'm continuing my current pill" escape (unchanged).
5. Type "Ozempic" → no steer (flag-only class), Continue proceeds.
Capture a screenshot of state 1 as proof.

**Step 5: Commit**

```bash
git add components/request/steps/medication-step.tsx
git commit -m "feat(request): hard steer for ED/hair-loss medicines with BPH disambiguation"
```

---

### Task 6: E2E — pin the steer behaviour in the repeat flow

**Files:**
- Modify: `e2e/prescription-flow.spec.ts` (the spec that already drives the repeat medication step)

**Step 1: Add the spec**

```ts
test("PDE5i typed into repeat flow hard-steers to the ED consult", async ({ page }) => {
  // …reuse the spec's existing helper to reach the medication step…
  await page.getByLabel(/medication name/i).fill("Sildenafil")
  await expect(page.getByText(/erectile dysfunction service/i)).toBeVisible()
  // No escape hatch for hard-enforced classes:
  await expect(page.getByRole("button", { name: /keep as repeat/i })).toHaveCount(0)
  await page.getByRole("button", { name: /continue in erectile dysfunction/i }).click()
  await expect(page).toHaveURL(/service=consult&subtype=ed/)
})
```

Follow the file's existing navigation/seed helpers exactly — do not invent new fixtures (memory: assert on seeded/unique values, never widen timeouts).

**Step 2: Run** — `PLAYWRIGHT=1 pnpm exec playwright test e2e/prescription-flow.spec.ts` (dev server per `docs/TESTING.md`). Expected: PASS, existing specs in the file still green (the repeats-policy review-step assertion must not regress — it uses a non-steered medicine).

**Step 3: Commit**

```bash
git add e2e/prescription-flow.spec.ts
git commit -m "test(e2e): repeat-flow hard steer for PDE5 inhibitors"
```

---

### Task 7: Docs sync

**Files:**
- Modify: `CLAUDE.md` (Gotchas → "Dedicated-service medication routing (repeat-Rx)" entry)
- Modify: `docs/CLINICAL.md` (prescribing boundaries)
- Run: `scripts/sync-agent-doc.sh` (regenerates `AGENTS.md` — never edit it by hand)

**Step 1: Rewrite the CLAUDE.md gotcha** to describe the tiered model: hard (ED + hair loss; no escape; server `requiresConsult` block in `validateRepeatScriptPayload`), soft (OCP, escape preserved, locked policy), flag_only (PDE5i with stated BPH/PAH context; weight-loss class via `gated_service_medication`), indication text now in the routing scan (and explicitly NOT in the shared controlled-substance validation text), and the D2 diabetes rationale for not blocking GLP-1s. Reference this plan file.

**Step 2: docs/CLINICAL.md** — under the repeat-prescription boundary section, add: PDE5i and hair-loss medicines route to their dedicated services (server-enforced); weight-loss-class repeats are flagged (`gated_service_medication`) and remain manual-review-only per the gated-service policy.

**Step 3: Sync + check**

```bash
scripts/sync-agent-doc.sh && scripts/sync-agent-doc.sh --check
```

**Step 4: Commit**

```bash
git add CLAUDE.md AGENTS.md docs/CLINICAL.md docs/plans/2026-08-05-repeat-rx-dedicated-service-routing.md
git commit -m "docs: tiered dedicated-service routing policy + plan"
```

---

### Task 8: Full verification + PR

**Step 1: Full local gate**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: green. Watch specifically for: `medication-service-routing.test.ts`, `derive-intake-flags.test.ts`, `repeat-script-schema.test.ts`, `intake-flags-panel-render.test.tsx`, and `controlled-substances-parity.test.ts` (must be untouched — this plan deliberately adds nothing to `CONTROLLED_SUBSTANCE_TERMS`).

**Step 2: Blocking E2E locally** (the repo rule for intake-path changes)

```bash
PLAYWRIGHT=1 pnpm exec playwright test e2e/prescription-flow.spec.ts e2e/unified-request-flow.spec.ts e2e/consult-subtypes.spec.ts
```

**Step 3: PR** — branch from a sibling worktree (never stash/checkout the shared tree), open PR, enable auto-merge, verify `build` + E2E checks green (per standing PR workflow). This touches `lib/stripe/checkout/` consumers' input path and clinical routing: **PR only, never direct-to-main.**

---

## Out of scope (explicit)

- UTI-antibiotic detection (D3 — zero observed leak).
- Backfilling flags onto existing paid intakes; the two in-queue cases are handled by the doctor.
- A cheaper "returning ED/hair-loss patient" re-order SKU — separate product decision; today they re-enter the consult flow at $49.95, which is current intended behaviour.
- Weight-loss service launch and its pricing; D2's flag is the bridge until that decision.
- `retry-payment.ts` revalidation of pre-fix `checkout_failed` intakes (accepted edge, doctor still reviews).

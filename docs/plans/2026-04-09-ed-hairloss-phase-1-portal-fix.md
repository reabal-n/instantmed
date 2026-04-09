# ED + Hair Loss Hardening — Phase 1: Portal Fix + Drug-Name Strip

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the doctor-portal rendering bug that hides every ED/hair-loss intake answer, and strip Schedule 4 drug names from the public marketing surface (landing pages, FAQs, guide sections, exit copy).

**Architecture:** Additive edit to `CONSULT_SUBTYPE_FIELDS` + `FIELD_LABELS` maps in `components/doctor/clinical-summary.tsx` to recognise the camelCase keys the intake actually writes (`edOnset`, `hairPattern`, etc.) while keeping legacy snake_case keys intact. Parallel copy audit of marketing components to replace brand/generic drug names with class-level language ("oral treatment", "prescription treatment").

**Tech Stack:** React 18.3 · TypeScript 5.9 · Vitest (node env, `renderToStaticMarkup` for component tests) · Next.js 15.5 App Router.

**Design doc:** [`docs/plans/2026-04-09-ed-hairloss-hardening-design.md`](./2026-04-09-ed-hairloss-hardening-design.md) — see Phase 1 (sections 1.1 and 1.2).

**Scope note:** The intake step option cards (`ed-assessment-step.tsx`, `hair-loss-assessment-step.tsx`) are **out of scope** for this phase. They'll be rewritten during the intake content overhaul after the user returns with competitor research.

---

## Context for the implementer

### The bug you're fixing (Task 1–3)

`components/doctor/clinical-summary.tsx` declares a `CONSULT_SUBTYPE_FIELDS` map at lines ~99–146 that lists all the field keys each consult subtype is expected to write. The rendering logic uses this to group subtype-specific answers into a dedicated section of the doctor's review UI.

**The problem:** the map uses snake_case keys like `ed_onset`, `morning_erections`, `nitrate_use`, `hair_loss_duration`. But the actual intake code (`components/request/steps/ed-assessment-step.tsx`, `components/request/steps/hair-loss-assessment-step.tsx`, `components/request/steps/ed-safety-step.tsx`) writes camelCase keys: `edOnset`, `edMorningErections`, `nitrates`, `hairDuration`, etc. So the subtype lookup in `clinical-summary.tsx` at line ~218–219 never matches, the subtype panel never renders, and every answer falls through to the 8-field "Additional Information" catch-all — which silently truncates. Doctors reviewing real ED/hair-loss cases today are seeing a truncated anonymous field dump instead of a structured assessment.

**The fix:** extend the map to include both the camelCase keys (what intake actually writes today) and the existing snake_case keys (for forward-compat with the post-research intake rewrite). Also extend `FIELD_LABELS` with human-readable labels for the new camelCase keys.

### The drug-name strip (Task 4–8)

Australian TGA Therapeutic Goods Advertising Code prohibits advertising Schedule 4 prescription-only medicines to consumers. Our current marketing surface contains multiple violations that must be replaced with class-level language. Verified locations (from `rg -i 'Viagra|Cialis|sildenafil|tadalafil|PDE5|finasteride|minoxidil|Propecia|Rogaine'`):

| File | Lines | Problem |
|---|---|---|
| `lib/data/ed-faq.ts` | 20 | "PDE5 inhibitors (the medication class that includes sildenafil and tadalafil)" |
| `components/marketing/sections/ed-guide-section.tsx` | 38, 39, 48, 49, 50, 59 | Multiple instances naming PDE5 inhibitors, sildenafil, tadalafil |
| `components/marketing/sections/ed-limitations-section.tsx` | 9 | "Repeat PDE5 inhibitor prescriptions (sildenafil, tadalafil)" |

**Clean (no changes needed, but audit to confirm):**
- `components/marketing/erectile-dysfunction-landing.tsx` (top-level page)
- `components/marketing/hair-loss-landing.tsx` (top-level page)
- `components/marketing/exit-intent-overlay.tsx`
- `lib/data/hair-loss-faq.ts`
- `components/marketing/sections/hair-loss-guide-section.tsx` (only contains "androgenetic alopecia", which is a clinical term, not a drug name — OK)

**Metadata exception:** `metadata.keywords` in `app/erectile-dysfunction/page.tsx` and `app/hair-loss/page.tsx` can keep search terms (e.g. "ED treatment australia") but must not name specific drugs. Verify no drug names slipped into keyword arrays.

### Replacement phrasing (use consistently)

| Old | New |
|---|---|
| "PDE5 inhibitor" / "PDE5 inhibitors" | "oral treatment" / "a class of prescription oral treatments" |
| "sildenafil" / "tadalafil" | drop entirely; refer to "oral treatment" |
| "sildenafil and tadalafil" | "as-needed and daily oral treatments" (only if needed to disambiguate dosing cadence) |
| "Viagra" / "Cialis" | never use |

---

## Task 1: Write failing test for ClinicalSummary camelCase rendering

**Files:**
- Create: `lib/__tests__/clinical-summary-render.test.tsx`

**Step 1: Write the failing test**

Create the file with this content:

```tsx
/**
 * Clinical Summary Render Tests
 *
 * Regression guard for the doctor-portal field-name bug (2026-04-09):
 * intake writes camelCase keys (edOnset, hairPattern, etc.) but the
 * subtype field map used to expect only snake_case. This test locks
 * in that ClinicalSummary renders camelCase ED and hair-loss answers
 * into the subtype-specific assessment panel with readable labels.
 */

import { describe, it, expect } from "vitest"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ClinicalSummary } from "@/components/doctor/clinical-summary"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("ClinicalSummary — ED subtype (camelCase keys)", () => {
  const edAnswers = {
    edOnset: "gradual_over_months",
    edFrequency: "most_of_the_time",
    edMorningErections: "rarely",
    edAgeConfirmed: true,
    edHypertension: false,
    edDiabetes: false,
    edPreference: "as_needed",
    edAdditionalInfo: "Recently started new job, lots of stress",
    nitrates: false,
    recentHeartEvent: false,
    severeHeartCondition: false,
    previousEdMeds: "never",
  }

  it("renders the ED Assessment panel heading", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).toContain("Erectile Dysfunction Assessment")
  })

  it("renders readable labels for camelCase ED fields", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).toContain("ED onset")
    expect(html).toContain("Frequency of ED")
    expect(html).toContain("Morning erections")
    expect(html).toContain("Treatment preference")
    expect(html).toContain("Nitrate use")
    expect(html).toContain("Recent heart event")
    expect(html).toContain("Severe heart condition")
    expect(html).toContain("Previous ED medication use")
  })

  it("does NOT auto-format camelCase keys to 'Ed Onset'", () => {
    const html = render(<ClinicalSummary answers={edAnswers} consultSubtype="ed" />)
    expect(html).not.toContain("Ed Onset")
    expect(html).not.toContain("Ed Frequency")
    expect(html).not.toContain("Ed Morning Erections")
  })
})

describe("ClinicalSummary — hair loss subtype (camelCase keys)", () => {
  const hairLossAnswers = {
    hairPattern: "crown_thinning",
    hairDuration: "1-3_years",
    hairFamilyHistory: "father_paternal",
    hairPreviousTreatments: "none",
    hairMedicationPreference: "oral",
    hairScalpConditions: "none",
    hairAdditionalInfo: "Noticed more hair in the shower",
  }

  it("renders the Hair Loss Assessment panel heading", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).toContain("Hair Loss Assessment")
  })

  it("renders readable labels for camelCase hair-loss fields", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).toContain("Hair loss pattern")
    expect(html).toContain("Duration of hair loss")
    expect(html).toContain("Family history")
    expect(html).toContain("Previous hair-loss treatments")
    expect(html).toContain("Treatment preference")
    expect(html).toContain("Scalp conditions")
  })

  it("does NOT auto-format camelCase keys to 'Hair Pattern'", () => {
    const html = render(<ClinicalSummary answers={hairLossAnswers} consultSubtype="hair_loss" />)
    expect(html).not.toContain("Hair Duration")
    expect(html).not.toContain("Hair Family History")
  })
})

describe("ClinicalSummary — legacy snake_case compat", () => {
  it("still renders legacy snake_case ED keys when present", () => {
    const legacyEd = {
      ed_onset: "sudden",
      ed_frequency: "half_the_time",
      morning_erections: "sometimes",
      nitrate_use: false,
      cardiovascular_history: "none",
    }
    const html = render(<ClinicalSummary answers={legacyEd} consultSubtype="ed" />)
    expect(html).toContain("Erectile Dysfunction Assessment")
    // Labels for legacy keys can use auto-format or explicit — just make
    // sure the answers aren't hidden.
    expect(html).toContain("sudden")
    expect(html).toContain("half_the_time")
  })
})
```

**Step 2: Run the test to verify it fails**

Run: `pnpm test lib/__tests__/clinical-summary-render.test.tsx`

Expected: Most `toContain` assertions FAIL because the current `CONSULT_SUBTYPE_FIELDS` map uses only snake_case and the camelCase answers fall into the "Additional Information" catch-all without the subtype heading. Specifically:
- "Erectile Dysfunction Assessment" heading absent → FAIL
- "Hair Loss Assessment" heading absent → FAIL
- Explicit labels like "ED onset", "Morning erections" absent → FAIL
- "Ed Onset" may even appear (camelCase auto-format) → the not.toContain assertion fails

---

## Task 2: Extend CONSULT_SUBTYPE_FIELDS and FIELD_LABELS

**Files:**
- Modify: `components/doctor/clinical-summary.tsx`

**Step 1: Add camelCase ED + hair-loss labels to `FIELD_LABELS`**

Locate the `FIELD_LABELS` object (starts around line 45). Add these entries inside the existing object, grouped together with a section comment. Insert just before the closing brace:

```ts
  // ED subtype — camelCase keys (what intake writes today)
  edOnset: "ED onset",
  edFrequency: "Frequency of ED",
  edMorningErections: "Morning erections",
  edAgeConfirmed: "Age 18+ confirmed",
  edHypertension: "Uncontrolled hypertension",
  edDiabetes: "Uncontrolled diabetes",
  edPreference: "Treatment preference",
  edAdditionalInfo: "Additional context",
  nitrates: "Nitrate use",
  recentHeartEvent: "Recent heart event",
  severeHeartCondition: "Severe heart condition",
  previousEdMeds: "Previous ED medication use",
  // Hair loss subtype — camelCase keys (what intake writes today)
  hairPattern: "Hair loss pattern",
  hairDuration: "Duration of hair loss",
  hairFamilyHistory: "Family history",
  hairPreviousTreatments: "Previous hair-loss treatments",
  hairMedicationPreference: "Treatment preference",
  hairScalpConditions: "Scalp conditions",
  hairAdditionalInfo: "Additional context",
```

**Step 2: Extend `CONSULT_SUBTYPE_FIELDS.ed` and `.hair_loss`**

Locate the `CONSULT_SUBTYPE_FIELDS` object (starts around line 99). Replace the `ed` and `hair_loss` entries with:

```ts
  ed: {
    label: "Erectile Dysfunction Assessment",
    fields: [
      // Current camelCase keys written by the intake today
      "edOnset", "edFrequency", "edMorningErections",
      "edAgeConfirmed", "edHypertension", "edDiabetes",
      "edPreference", "edAdditionalInfo",
      "nitrates", "recentHeartEvent", "severeHeartCondition", "previousEdMeds",
      // Legacy/future snake_case kept for forward-compat with the
      // post-research intake rewrite (IIEF-5, expanded safety, etc.)
      "ed_onset", "ed_frequency", "ed_severity", "ed_duration",
      "morning_erections", "libido_changes", "relationship_impact",
      "previous_ed_treatment", "cardiovascular_history", "diabetes_status",
      "current_medications_ed", "nitrate_use", "alpha_blocker_use",
    ],
    highlight: [
      "nitrates", "nitrate_use",
      "recentHeartEvent", "severeHeartCondition",
      "edHypertension", "edDiabetes",
      "cardiovascular_history",
    ],
  },
  hair_loss: {
    label: "Hair Loss Assessment",
    fields: [
      // Current camelCase keys written by the intake today
      "hairPattern", "hairDuration", "hairFamilyHistory",
      "hairPreviousTreatments", "hairMedicationPreference",
      "hairScalpConditions", "hairAdditionalInfo",
      // Legacy/future snake_case kept for forward-compat
      "hair_loss_duration", "hair_loss_pattern", "hair_loss_family_history",
      "hair_loss_previous_treatment", "scalp_condition", "recent_stress",
      "recent_illness", "diet_changes", "thyroid_history",
    ],
  },
```

Do not touch `womens_health`, `weight_loss`, or `new_medication` — they're out of scope.

**Step 3: Run the test to verify it now passes**

Run: `pnpm test lib/__tests__/clinical-summary-render.test.tsx`

Expected: all assertions PASS. If any still fail, re-read the test expectations carefully — the label strings must match exactly (including case: "ED onset" not "Ed Onset", "Treatment preference" not "Treatment Preference"). The camelCase auto-format path is what produces "Ed Onset"; the `FIELD_LABELS` lookup overrides it with the explicit label, so if a label is missing from `FIELD_LABELS` the test will catch it.

---

## Task 3: Run full typecheck + commit Phase 1.1

**Step 1: Typecheck**

Run: `pnpm typecheck`

Expected: no errors. If there are errors they will be in your diff — read them carefully. The most likely cause is a typo in one of the field keys. There should be no type issues because both the field list and labels object are plain `string[]` / `Record<string, string>`.

**Step 2: Run the full unit test suite**

Run: `pnpm test`

Expected: the new `clinical-summary-render.test.tsx` suite passes, and all pre-existing tests pass. If any pre-existing test now fails, you changed something outside the intended scope — revert and re-diff.

**Step 3: Commit**

```bash
git add components/doctor/clinical-summary.tsx lib/__tests__/clinical-summary-render.test.tsx
git commit -m "$(cat <<'EOF'
fix(doctor-portal): render ED + hair-loss intake answers with readable labels

The CONSULT_SUBTYPE_FIELDS map only knew about snake_case keys
(ed_onset, hair_loss_duration, etc.), but the intake writes camelCase
(edOnset, hairPattern, etc.). As a result the subtype panel never
matched any answers and every field fell through to the 8-item
"Additional Information" catch-all, silently truncating the doctor's
view of the case.

Extends the field map to cover the camelCase keys the intake actually
writes today, keeps the snake_case keys for forward-compat with the
post-research intake rewrite, and adds human-readable labels to
FIELD_LABELS so keys like edMorningErections render as "Morning
erections" instead of "Ed Morning Erections".

Adds a regression test that mounts <ClinicalSummary> with realistic
ED and hair-loss answer payloads and asserts the subtype panel heading
and explicit labels are present.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Strip drug names from `lib/data/ed-faq.ts`

**Files:**
- Modify: `lib/data/ed-faq.ts`

**Step 1: Read the file**

Current line 20 reads:

```ts
answer: "Our doctors can assess you for PDE5 inhibitors (the medication class that includes sildenafil and tadalafil) based on your individual health profile. The specific treatment and dose is determined by the doctor after reviewing your assessment.",
```

**Step 2: Replace the drug-name copy with class-level language**

Use Edit to replace the string:

- Old: `"Our doctors can assess you for PDE5 inhibitors (the medication class that includes sildenafil and tadalafil) based on your individual health profile. The specific treatment and dose is determined by the doctor after reviewing your assessment."`
- New: `"Our doctors can assess you for a class of prescription oral treatments based on your individual health profile. The specific treatment and dose is determined by the doctor after reviewing your assessment."`

**Step 3: Verify nothing else in the file names drugs**

Run: `rg -i 'Viagra|Cialis|sildenafil|tadalafil|PDE5|finasteride|minoxidil|Propecia|Rogaine' lib/data/ed-faq.ts`

Expected: zero results.

**Step 4: Run FAQ-dependent tests if any**

Run: `pnpm test lib/__tests__/` (no specific file since FAQ consumers aren't directly unit-tested; this is a smoke check that nothing else broke).

Expected: all pass.

---

## Task 5: Strip drug names from `components/marketing/sections/ed-guide-section.tsx`

**Files:**
- Modify: `components/marketing/sections/ed-guide-section.tsx`

**Step 1: Read the file fully to understand structure**

Use Read to load the file. The drug-name instances sit in paragraph strings inside guide section config. You need to rewrite the paragraph prose, not just substring-replace, because naming drug classes flows into sentence structure.

**Step 2: Rewrite line 38 paragraph (first-line treatment explanation)**

Current intent: explain what the standard first-line ED treatments are and how they work.

- Old: `"The first-line prescription treatments for ED are a class of medications called PDE5 inhibitors. The two most widely used are sildenafil and tadalafil. Both work by improving blood flow to the penis in response to sexual arousal. They are not aphrodisiacs and do not cause erections on their own — they only work in combination with normal sexual stimulation. This is the single most important thing to understand about how they work, and a good doctor will always explain it."`
- New: `"The first-line prescription treatments for ED are a class of oral medications that improve blood flow to the penis in response to sexual arousal. They come in both as-needed and daily-dosing forms, and a doctor decides which is appropriate based on your pattern of symptoms. Importantly, they are not aphrodisiacs and do not cause erections on their own — they only work in combination with normal sexual stimulation. This is the single most important thing to understand about how they work, and a good doctor will always explain it."`

**Step 3: Rewrite line 48 paragraph (nitrate contraindication)**

- Old: `"PDE5 inhibitors are not safe for everyone. The single hardest contraindication is nitrate medication — if you take nitrates for chest pain (glyceryl trinitrate, isosorbide, or similar), combining them with a PDE5 inhibitor can cause a life-threatening drop in blood pressure. This is a hard stop, not a precaution. Our safety screening flags nitrates explicitly, and the doctor confirms it as part of their review. We do not prescribe around this rule."`
- New: `"These treatments are not safe for everyone. The single hardest contraindication is nitrate medication — if you take nitrates for chest pain (glyceryl trinitrate, isosorbide, or similar), combining them with an oral ED treatment can cause a life-threatening drop in blood pressure. This is a hard stop, not a precaution. Our safety screening flags nitrates explicitly, and the doctor confirms it as part of their review. We do not prescribe around this rule."`

**Step 4: Rewrite line 49 paragraph (other contraindications)**

- Old: `"Other situations where PDE5 inhibitors may not be safe or may need modification include recent heart attack or stroke, uncontrolled high or low blood pressure, severe heart failure, significant liver or kidney disease, and certain eye conditions. Some medications interact — particularly alpha-blockers used for blood pressure or enlarged prostate, some antifungals, and some HIV medications. The questionnaire asks about these directly, and the doctor performs the final clinical review."`
- New: `"Other situations where treatment may not be safe or may need modification include recent heart attack or stroke, uncontrolled high or low blood pressure, severe heart failure, significant liver or kidney disease, and certain eye conditions. Some medications interact — particularly alpha-blockers used for blood pressure or enlarged prostate, some antifungals, and some HIV medications. The questionnaire asks about these directly, and the doctor performs the final clinical review."`

**Step 5: Rewrite line 50 and 59 paragraphs**

For each remaining `PDE5 inhibitor` / `sildenafil` / `tadalafil` instance, replace with "oral ED treatment" / "these treatments" / "treatment" depending on sentence flow. Read the file after each edit to confirm the surrounding prose still reads naturally.

**Step 6: Verify the file is clean**

Run: `rg -i 'Viagra|Cialis|sildenafil|tadalafil|PDE5|finasteride|minoxidil|Propecia|Rogaine' components/marketing/sections/ed-guide-section.tsx`

Expected: zero results.

**Step 7: Typecheck**

Run: `pnpm typecheck`

Expected: no errors.

---

## Task 6: Strip drug names from `components/marketing/sections/ed-limitations-section.tsx`

**Files:**
- Modify: `components/marketing/sections/ed-limitations-section.tsx`

**Step 1: Read the file**

Line 9 reads something like:

```ts
"Repeat PDE5 inhibitor prescriptions (sildenafil, tadalafil)",
```

This is inside an array of "what we can help with" or "what we can't" bullet points.

**Step 2: Replace the bullet**

- Old: `"Repeat PDE5 inhibitor prescriptions (sildenafil, tadalafil)"`
- New: `"Repeat oral ED treatment prescriptions"`

**Step 3: Verify**

Run: `rg -i 'Viagra|Cialis|sildenafil|tadalafil|PDE5|finasteride|minoxidil|Propecia|Rogaine' components/marketing/sections/ed-limitations-section.tsx`

Expected: zero results.

---

## Task 7: Audit remaining marketing surface for drug names

**Step 1: Global rg across the full marketing surface**

Run:

```bash
rg -i 'Viagra|Cialis|sildenafil|tadalafil|PDE5|finasteride|minoxidil|Propecia|Rogaine' components/marketing/ lib/data/ app/erectile-dysfunction/ app/hair-loss/
```

Note: some tailwind classes like `specialist`, `commercial` contain the substring "cial" and will false-match case-insensitive against "Cialis". Inspect each hit to confirm it is a real drug mention vs a substring false positive. Only rewrite actual drug name mentions.

**Step 2: Rewrite any real hits using the replacement table in the Context section above**

If any real hits exist in files NOT already covered by Tasks 4–6, edit them the same way. Read the file first, rewrite the prose, re-verify with a targeted `rg` scoped to the file.

**Step 3: Re-run the global rg to confirm clean**

Run the same command from Step 1. Expected: either zero matches, or only substring false positives that you've manually confirmed are not drug mentions.

**Step 4: Typecheck + unit tests**

Run: `pnpm typecheck && pnpm test`

Expected: all green.

---

## Task 8: Commit Phase 1.2 (drug-name strip)

**Step 1: Stage and commit all marketing edits together**

```bash
git add lib/data/ed-faq.ts components/marketing/sections/ed-guide-section.tsx components/marketing/sections/ed-limitations-section.tsx
# Add any other files you edited in Task 7
git status  # verify
git commit -m "$(cat <<'EOF'
fix(ed, marketing): strip Schedule 4 drug names from public ED surface

TGA Therapeutic Goods Advertising Code prohibits advertising
prescription-only medicines to consumers. Removes named drugs and
"PDE5 inhibitor" class callouts from the ED FAQ, guide section, and
limitations list. Replaces with class-level language ("oral treatment",
"prescription oral treatments") that preserves the clinical meaning
without naming Schedule 4 products.

Intake step option cards (ed-assessment-step.tsx) are intentionally
left untouched — they will be rewritten as part of the intake content
overhaul once competitor research lands. See
docs/plans/2026-04-09-ed-hairloss-hardening-design.md, scope-deferred
section.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Step 2: Final verification — run CI locally**

Run: `pnpm ci`

Expected: install → lint → test → build all pass. This mirrors what GitHub Actions will run.

---

## Done criteria for Phase 1

- [ ] `pnpm test lib/__tests__/clinical-summary-render.test.tsx` passes with the new camelCase test cases
- [ ] `pnpm test` passes (full unit suite, no pre-existing regressions)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` passes (catches any SSR issues from the new imports)
- [ ] `rg -i 'Viagra|Cialis|sildenafil|tadalafil|PDE5|finasteride|minoxidil|Propecia|Rogaine' components/marketing/ lib/data/` returns zero real hits (substring false positives OK)
- [ ] Two commits created: portal fix + marketing strip
- [ ] Intake step option cards (`ed-assessment-step.tsx`, `hair-loss-assessment-step.tsx`) have NOT been touched — they are out of scope

## Verification in browser (optional for this phase)

This phase has no visible landing-page changes — the portal fix only affects the doctor-facing `/doctor/intakes/[id]` page, which requires auth. The drug-name strip changes copy inside existing guide sections on `/erectile-dysfunction`. If you want to spot-check, start the preview (`preview_start` if a server isn't already running), navigate to `/erectile-dysfunction`, scroll to the guide section, and confirm no drug names appear. But running `rg` in the codebase is a stronger check than eyeballing the page.

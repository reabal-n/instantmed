# Intake Drop-off Reduction — Final Plan (2026-07-09)

> **Authority:** Reference only. This file has no independent execution authority. `docs/ROADMAP.md` is the sole active queue; execute from this record only when the ROADMAP explicitly activates it.

**Status: COMPLETE — every P0, P1, and P2 item shipped. Retained as the record of what was decided and why; there is no queued work left here.**

Produced by a three-source audit, reconciled 2026-07-09:

1. Full code + contract-test audit of every intake step (`components/request/steps/`, `lib/request/`, `lib/__tests__/`).
2. Live PostHog funnel data (90d to 2026-07-08, real traffic, `is_e2e` excluded).
3. External critique brains (GPT-5.5, Gemini 3.1 Pro) — advisory only; every claim verified against repo source + data before inclusion.
4. Independent Codex review (repo source + PostHog + Playwright + CDP) — corrections folded in below.

### Shipped-state reconciliation (2026-07-11)

- P0.1 through P0.4 shipped in PRs #296 through #299.
- The adjacent intake state-lifecycle repair shipped in PR #308; do not rebuild its draft scoping, hydration, prefill, payment-clear, or abandonment-beacon work here.
- P1.1 shipped in #309, P1.2 in #310, P1.4 in #311, and P1.5 in #312.
- P1.3 is the only P1 item implemented by this change. It is layout-only: every answer key, hard block, GP-clearance gate, persistence path, and server rule remains unchanged.

### Final reconciliation (2026-07-17)

- **P2.1 shipped in #367.** `medication` + `medication-history` merged into one "Your medication" screen (5 steps → 4). Answer keys unchanged; checkout still validates through both `validateMedicationStep` and `validateMedicationHistoryStep`. Dropped only `lastPrescribedBy`. Retired step ids now resolve through `RETIRED_STEP_ID_ALIASES` so in-flight drafts resume on the merged step.
- **P2.2 shipped in #368.** The legacy parallel `validate()`/`errors` systems are gone from `hair-loss-assessment` and both women's-health branches; `useStepValidationSummary` is the single gate. Removing them deleted two latent divergences: an unreachable current-pill rule, and a UTI validator that accepted any answer to the red-flag/pregnancy checks where `isComplete` required an explicit "no". Pinned by `intake-validation-single-source-contract.test.ts`.
- P2.2's parts (a) and (c) needed no work: the hand-rolled selectors were already replaced by P1.3 (ED effectiveness) and P1.4 (IRN grid), and working shared-primitive usage was left alone.
- **Weight-loss assessment remains the known anti-pattern** (raw RadioGroup, disabled-CTA gate, no validation summary, no keyboard nav). It is gated and NOT live; it was explicitly out of scope here and must be rebuilt on shared primitives before any launch.
- Overview readouts (#313) and the auto-approval counter/E2E bucket fix (#314) are shipped adjacent work, not tasks to repeat from this plan.
- Day-0 public-copy, synthetic-counter, and attribution containment shipped separately in #307 and is not reopened here.

---

## 1. Measured reality (the data that sets priority)

### Med-cert funnel, 90d (persons)

| Step | Mobile | Desktop |
|---|---|---|
| 1. Certificate (start) | 169 (100%) | 56 (100%) |
| 2. Symptoms | 93 (**−45%**) | 37 (−34%) |
| 3. Details (skippable when authed) | 69 | 30 |
| 4. Review/pay | ~49–53 | ~31 |
| 5. Pay clicked | ~42–46 (**~26%**) | ~23 (**~41%**) |

Steps 4–5 vary slightly by metric choice (`step_viewed step_id=checkout` vs `checkout_viewed`/`checkout_initiated` events). Same shape either way. Canonical definitions for post-ship measurement are pinned in §5.

**Headline findings:**

- **#1 leak: mobile `certificate → symptoms`, −45%.** 76 of 169 mobile starters never reach step 2; median exit ~15s. Mobile is ~75% of traffic.
- Mobile end-to-end (~26%) converts far worse than desktop (~41%).
- **Pay-click → purchase is ~55% server-confirmed (`40/73` via `purchase_completed_server`)** — a floor, since some purchases don't join to the pay click. The client `purchase_completed` pixel reads 31% and is a known under-firing artifact. **Never use the client pixel for funnel analysis.**
- **Validation-block events (90d):** `ed-goals` 46 (the 18+ toggle sits *above* the step heading), `hair-loss-goals` 11, `ed-health` 10, `ed-assessment` 4, `hair-loss-health` 2. **Med-cert and women's-health steps emit zero because they don't fire the event** — a measurement blind spot on the highest-volume flow, not evidence of zero friction.
- Volume caveat: ~225 med-cert starts/90d. Percentages are directional. The one signal large enough to act on with confidence is the step-1→2 mobile gap.

### Root-cause diagnosis

The intake is **not clinically over-restrictive** — every traced field is either a server-enforced safety gate (ED nitrates hard block; cardiac GP-clearance gates; hair-loss partner-pregnant hard block) or operator-mandated. The drop-off is **packaging**:

1. Med-cert step 1 requires one decision (`certType` starts empty; days=1 and start=today already default) and the CTA sits in muted secondary state until it's made — on mobile that reads as disabled/dead. This is the −45% screen.
2. The symptoms step is a required-free-text typing wall on mobile.
3. Review step stacks 3–4 cards before Pay (incl. a broken-looking empty `Symptoms: -` row at the pay moment).
4. Safety screens use 5 different Yes/No primitives at low density → long scrolls that read as interrogation.
5. The mobile CTA bar is `position: fixed; bottom: 0` with **no `visualViewport` handling** ([request-flow.tsx:969](../../components/request/request-flow.tsx)) — the iOS soft keyboard can cover the only Continue affordance on typing-heavy steps. Supported by code path; not yet reproduced on-device (desktop CDP can't emulate the iOS keyboard).

---

## 2. Priorities — PR-sized batches

### P0 — ship first, tightly split (4 small PRs)

**P0.1 — Med-cert step 1: default Work + CTA visual weight**
- Pre-select `certType = "work"` **only on a fresh med-cert draft**: apply after store hydration, only when `answers.certType` is empty AND no saved smart-default (`getSmartDefaults("certificate")`) AND no URL/state prefill. Never override a restored draft.
- With the default applied, step 1 is valid on load → CTA renders primary immediately. Keep the always-clickable secondary state for not-ready (contract-pinned), but ensure it visually reads as a button (border/fill), never as bare text.
- Keep the whole step above the mobile fold.
- Analytics: reuse `certificate_prefilled` and `certificate_type_selected {location:"wizard"}`; add a `default_applied` signal so change-away rate from Work is measurable. If change-away is high, that's fine — ambiguity was still removed.
- Files: `components/request/steps/certificate-step.tsx` (hydration-gated default beside the existing smart-defaults effect).
- Guardrails: `cert-step-revenue-contract` (no disabled CTA; StepBlockedSummary wiring), `certificate-step-hydration-contract` (hydration gating — the default MUST respect `hasHydrated`/`onFinishHydration`), `intake-mobile-viewport-contract` (primary-action trio, no `opacity-60`).

**P0.2 — Keyboard-safe mobile CTA**
- Add a `visualViewport` listener in `request-flow.tsx` setting a `--keyboard-offset` CSS var; offset the fixed bar by `calc(env(safe-area-inset-bottom) + var(--keyboard-offset, 0px))`.
- Fallback if flaky on real devices: on typing-heavy steps, render the CTA sticky-in-flow at the form bottom instead of viewport-fixed.
- Verify on **real iOS Safari** (latest two majors), not desktop emulation. Add telemetry (CTA visibility/click while keyboard open) if practical.
- Guardrails: `intake-mobile-viewport-contract` pins the action-bar wiring (`data-intake-mobile-action-bar`, primary-action query, change event) — offsets are additive, don't restructure.

**P0.3 — Measurement: close the blind spots**
- Fire `intake_validation_blocked` from med-cert steps (certificate/symptoms use local `validate()` + `StepBlockedSummary`, not the shared hook — emit from those paths via `lib/analytics/intake-events.ts` builders so event names stay pinned by `INTAKE_FUNNEL_EVENT_NAMES`).
- Pass the analytics object into the `useStepValidationSummary` call sites that currently omit it (all three women's-health steps).
- No PHI: step ids, counts, field keys, enum tokens only (existing event contract).
- Document in `docs/ARCHITECTURE.md`/funnel queries: purchase stage = `purchase_completed_server` only.
- Guardrails: `intake-analytics-events.test.ts`, `intake-funnel-summary.test.ts` (event-name pinning; payload shape).

**P0.4 — ED age-gate placement**
- Move the 18+ confirmation from above the step heading ([ed-goals-step.tsx:80](../../components/request/steps/ed-goals-step.tsx)) into the form flow below the intro. Same field, same validation — placement only.
- Expected: kills most of the 46 `ed-goals` validation blocks.

### P1 — condense the mid-funnel (after P0 data starts flowing)

**P1.1 — Symptoms step: chips-first, text optional**
- Chips become the primary answer affordance; textarea reframed as "Add detail (optional)". Mechanically, chips already seed recognised text into the textarea (source of truth unchanged), so downstream (emergency/high-stakes detection, AI draft, doctor view) is untouched; the change is framing + validator softening for typed-only input.
- `symptomDuration` becomes **optional** (not deleted): it is not a safety gate, but the AI draft prompt reads it (`ai-prompt-symptoms-contract.test.ts`) and the doctor summary displays it. Keep plumbing; verify doctor surface + AI prompt handle absence gracefully; update the contract test intentionally.
- Guardrails: `med-cert-validation.test.ts` (no length floor; never "select at least one symptom"; empty text still rejected), `med-cert-checkout-contract` (no `SYMPTOM_GROUPS` revival), `ai-prompt-symptoms-contract`.

**P1.2 — Review step: one dense summary**
- Collapse the stacked cards into a single summary card with dividers + inline Edit; **hide empty rows** (the `Symptoms: -` row reads as a bug at the pay moment); keep price/priority/consent/Pay compact so Pay is reachable with minimal scroll.
- Consent checkbox card and the quiet trust cluster stay (contract-pinned).
- Guardrails: `review-step-priority-contract`, `med-cert-checkout-contract` (no cert preview revival), `marketing-copy-contract`.

**P1.3 — ED + hair-loss safety screens: densify, keep everything**
- Replace full-width stacked Yes/No pairs with **compact rows** (question left, No/Yes segmented right, ~48–56px, conditional detail expands inline below the row). Two sections: "Treatment safety" (nitrates, cardiac, severe-heart/HOCM, alpha-blockers / partner-pregnant) then "Doctor notes" (meds/allergies/conditions, prior treatment).
- **Hard blocks stay explicit Yes/No.** All three brains + Codex concur: a default-No "tap-only-if-yes" checklist for nitrates/partner-pregnant is an AHPRA-audit liability. Not negotiable.
- Scalp conditions: Switch list → `ChipToggleGroup` with exclusive "None" (informational fields; still feed doctor notes).
- Replace the hand-rolled ED effectiveness selector with `SegmentedChoiceGroup` (also fixes its missing roving-tabindex).
- Every field, conditional reveal, and server rule preserved. GP-clearance checkbox gating unchanged.
- Guardrails: `ed-intake-validation.test.ts`, `keep-list-hard-block-contract`, `hair-loss-tga-compliance` (**no S4 drug names anywhere in edited files, including comments** — the strict scan reads raw source), `unified-intake-regressions`.

**P1.4 — Patient-details polish (scoped; autocomplete already exists)**
- Address autocomplete is already live ([patient-details-step.tsx:970](../../components/request/steps/patient-details-step.tsx)) — no work there.
- Replace the 9-button IRN grid (line ~887) with a single numeric input (`maxlength=1`, `inputmode="numeric"`, help text "the number next to your name on the card").
- Audit `inputmode`/`autocomplete`/`enterkeyhint` across all fields (Medicare numeric, phone tel, bday, address tokens). Auto-advance Medicare → IRN on 10th digit.
- Optional: light sectioning ("About you / Medicare / Address") for the prescribing pathways' ~12-field variant. Med-cert stays 4 fields — **never standardise services up to the maximal identity set**.

**P1.5 — IIEF-5 reframe (micro)**
- Keep the instrument and one-at-a-time rendering (contract-pinned, clinically load-bearing). Add "5 quick questions · ~30 seconds"; when Q1 is pre-seeded from the landing quiz, start at the first unanswered question instead of re-showing Q1.

### P2 — structural (each its own PR)

**P2.1 — Repeat-Rx: merge medication + history into one step**
- One "Your medication" screen: name (required) + strength/form (optional) + when-last-prescribed (required, keeps the "never → not-a-repeat" route-out) + dose & frequency (required; offer common frequency choices + free text) + indication (required) + side effects (required Yes/No + detail).
- **Delete "who prescribed it last"** (optional, desktop-only, unused clinically).
- Dose/frequency/indication stay required (operator decision 2026-06-26).
- Registry change: collapse `medication` + `medication-history` in `STEP_REGISTRY['prescription']` (repeat-script aliases it). Update `unified-intake-regressions` (last step `review`, no `checkout`), `repeat-script-schema.test.ts`, `intake-mobile-viewport-contract` step-file list, draft-restore mapping for in-flight drafts.

**P2.2 — Scoped primitive + validation cleanup (NOT a broad refactor)**
- Only: (a) remaining hand-rolled selectors (ED effectiveness — done in P1.3; Medicare/IHI toggle + IRN grid — done in P1.4), (b) remove the legacy parallel `validate()`/`errors` systems in hair-loss-assessment and both women's-health branches in favour of `useStepValidationSummary`, (c) leave working shared-primitive usage alone.
- Weight-loss assessment (gated, not live) is the anti-pattern template (raw RadioGroup, disabled-CTA gate, no validation summary, no keyboard nav) — **must be rebuilt on shared primitives before any launch**; not part of this effort.

---

## 3. Explicitly not doing

- Removing/weakening any safety field or moving blocks client-side.
- Default-No checklists for hard-block questions.
- Removing the IIEF-5 or its one-at-a-time rendering.
- Deleting `symptomDuration` plumbing (optional, not gone).
- Broad primitive refactor beyond the scoped list.
- Unifying the medical-history camelCase vs ED/hair snake_case answer-key divergence (latent debt; separate decision — touches draft restore + doctor surfaces).
- Payment-methods work (Apple/Google Pay). Flagged by external brains; pay→purchase is ≥55% server-confirmed and the measured leak is smaller than the intake leaks. Revisit after P0/P1 data.

## 4. Verdict on the operator's original 8 comments

| # | Comment | Verdict | Lands in |
|---|---|---|---|
| 1 | Pre-select Work; disabled state should look like a faded button | DO — faded-button behaviour already contract-pinned; real bug was no default | P0.1 |
| 2 | Simplify symptoms; drop "how long sick" | DO — chips-first; duration → optional (doctor/AI surfaces verified) | P1.1 |
| 3 | Condense review; Pay too far down | DO | P1.2 |
| 4 | Is the IIEF-5 quiz necessary? | KEEP + reframe (validated instrument, doctor + follow-up scoring, contract-pinned) | P1.5 |
| 5 | ED yes/no consolidation | DO — compact explicit rows, not tap-only | P1.3 |
| 6 | Hair-loss consolidation; primitives inconsistent | DO | P1.3 + P2.2 |
| 7 | Repeat-Rx one step; kill "who prescribed" | DO | P2.1 |
| 8 | Audit primitive fragmentation | DONE (audit) + scoped cleanup | P2.2 |

## 5. Measurement plan (canonical, so before/after is apples-to-apples)

- **Step progression:** `step_viewed` with `service_type`/`step_id`/`is_e2e != true`, person-level funnel, 1-day window, breakdown `$device_type`. `details` marked optional (auth skip).
- **Purchase:** `purchase_completed_server` only. Client `purchase_completed` is decoration.
- **Primary success metric (P0.1):** mobile med-cert certificate→symptoms progression, 55% → target ≥65% over the following 90d window; guard: watch `intake_validation_blocked` on symptoms (now instrumented via P0.3) to catch the drop merely moving one step.
- **Secondary:** mobile start→pay-click (~26% → target ≥33%); `ed-goals` blocked count (46 → near zero after P0.4); change-away-from-Work rate (P0.1 telemetry).
- All queries filter `is_e2e != true` + test accounts.

## 6. Reconciliation log (Codex review, 2026-07-09)

Accepted: funnel step-4/5 count variance (event-choice artifact; canonical defs added) · `purchase_completed_server` as the only purchase metric · fresh-draft-only Work default · CTA issue is visual not technical · keyboard fix shipped with fallback + real-device verification · duration optional-not-deleted pending doctor-surface check · patient-details autocomplete claim was stale (already built; scope cut to IRN/inputmodes) · primitive unification scoped down · external-model identity claims carry no evidentiary weight.

No Codex point overturned the priority order.

# Weight-Loss Service Launch Plan

> **Authority:** Reference only. This file has no independent execution authority. `docs/ROADMAP.md` is the sole active queue, and `docs/BUSINESS_PLAN.md` owns the service boundary — weight loss stays GATED until the operator explicitly changes both. **Phases 1–5 of this plan must not be executed until the Decision Gate below is answered by the operator.**

> **Status:** EXECUTED 2026-08-07. Operator adopted all recommendations (D-A..D-E) same day; Phases 1-2 (#445), Phase 3 (#446), and Phases 4-5 (gate flip + governance + marketing) shipped as three stacked PRs. Retained as the launch evidence record.

> **For Claude:** REQUIRED SUB-SKILLS before any phase: `instantmed-clinical-safety-review` (service launch), `instantmed-checkout-payment-review` (new paid path), `instantmed-marketing-compliance-review` + `instantmed-ui-browser-verification` before public sign-off. Execute with superpowers:executing-plans, one phase per PR, no auto-merge on clinical phases.

**Goal:** Launch weight management as a properly screened, properly priced ($89.95) one-off consult — converting the de-facto weight-loss demand currently leaking through the $29.95 repeat lane (7 requests / 6 weeks, zero marketing, zero diabetes indications) into the platform's highest-priced service, with the screening the repeat lane never ran.

**Why now (evidence):** `docs/plans/2026-08-05-repeat-rx-dedicated-service-routing.md` §Evidence — 6 issued scripts + 1 queue case through the repeat lane (3 phentermine with zero structured cardiac screening); `gated_service_medication` flag now provides visibility but no screening and no correct pricing. Demand is organic and proven; the reserved Stripe price is already configured in production env.

**Asset base (verified 2026-08-07, full map in the exploration record):** the intake steps exist and are complete (473-line assessment + 186-line call step, zod schemas wired into `unified-checkout.ts:444-450`, review-step rendering, lazy registration); pricing is fully wired with a triple defence on the env var; the gate is one `Set` (`BLOCKED_CONSULT_SUBTYPES`) plus contract tests. What is missing is almost entirely the **clinical enforcement layer and the doctor surface** — detailed per phase below.

---

## Decision Gate — operator answers required before Phases 1–5

| # | Decision | Options | Recommendation |
|---|---|---|---|
| **D-A** | **Service model.** The drafted flow is call-based (`weight-loss-call-scheduling` promises "a doctor will call you"), per the 2026-06-10 note ("revisit later as a call-based continuation/renewal lane"). But **zero call infrastructure exists** — no scheduler, no call log, no completion marker — and the platform's model everywhere else is form-first with call-on-flag. | (a) Form-first + call-on-flag (drop the call step; eating-disorder/cardiac flags trigger `REQUIRES_CALL` like women's health) · (b) Build the call workflow | **(a)** — matches the platform model, deletes a step that promises staffing that doesn't exist, and `requiresCall` escalation already exists in the assessment step |
| **D-B** | **Medicine scope.** The drafted step offers `glp1` and `duromine` preference cards. Phentermine is a stimulant-class S4 with cardiac contraindications, no `CONTROLLED_SUBSTANCE_TERMS` entry, and it drove 3 of the 7 leaked requests. | (a) GLP-1-focused launch, phentermine excluded (preference card removed; typed phentermine requests declined to GP) · (b) Include phentermine with the cardiac screen enforced | **(a)** at launch — the risk profile and monitoring expectations differ; add phentermine later as its own decision if demand justifies it |
| **D-C** | **BMI eligibility threshold — three values currently disagree**: validator notes at <25 (`consult-validators.ts:552`), safety-rule DECLINE at <27 (`safety/rules.ts:838`), marketing states 30+/27+ with comorbidity. | Pick one clinical floor | **DECLINE below 27 with comorbidity, below 30 without** (TGA-consistent, matches the marketing claim); encode as ONE exported constant consumed by validator, rule, and copy |
| **D-D** | **Pregnancy/breastfeeding screening** — a DECLINE rule exists (`weight_pregnancy`) but the field is never collected. | Non-negotiable addition; only the wording is a choice | Add to the assessment step; also add MEN2/medullary-thyroid and pancreatitis questions (both have dormant rules referencing uncollected fields) |
| **D-E** | **Continuation model.** BUSINESS_PLAN forbids subscriptions and staff-heavy follow-up; GLP-1s imply titration and review. | (a) One-off consult covers initial script; continuation = patient-initiated re-consult (same as ED reorders) · (b) Defer launch until a monitoring model exists | **(a)**, stated honestly in copy ("each review is a one-off; continuing treatment needs a new review") — REVENUE_MODEL.md:156 requires the monitoring/support capacity question answered as part of this decision |

## Phase 0 — Gated-state compliance remediation (SHIPPED with this plan)

Independent of any launch decision; fixes live exposure found in the asset survey:

- `lib/seo/data/conditions/metabolic.ts` weight-management entry: **remove the false service claims** ("Prescription of weight management medications", "Ongoing monitoring and dose adjustments") from `canWeHelp.yes` and state the not-accepting posture in the "can I get it online" FAQ. Medicine *education* (drug-name FAQ) stays — in-policy for organic condition pages per `docs/SEO_CONTENT_POLICY.md`; the breach was claiming a gated service exists, not the education.
- `lib/marketing/homepage.ts:170`: "Ongoing support available" → boundary-true copy (CLINICAL.md:197 forbids monitoring promises without capacity).

Still open in the gated state (small, fold into Phase 5 or do opportunistically): the stale `services` DB row ($49.00 + "GLP-1 medications" description, unreachable), and the double-hop redirect chain `/request?subtype=weight_loss` → `/weight-loss` → `/request`.

## Phase 1 — Clinical enforcement layer (the real launch blocker)

The survey's headline: **every weight-loss safety mechanism is dead code.**

1. **Wire the consult clinical validators into checkout.** `validateWeightLossConsult` (and `validateConsultBySubtype` generally) has *no production caller* — `runClinicalValidation` never imports it. Wire it for consult subtypes in `lib/stripe/checkout/clinical-validation.ts` so `safety_block` → refusal, `requires_call` → triage fields, `clinical_note` → doctor flags. (This gap affects ED/hair/WH too — those lean on `lib/safety/rules.ts` instead; decide whether to wire all subtypes or weight-loss only, but do not leave weight-loss relying on a layer that doesn't run.)
2. **Make the safety engine reachable.** `lib/stripe/checkout/helpers.ts` `slugMap` has no `"consult:weight_loss"` entry, so `checkSafetyForServer` evaluates the generic consult config, never `weightSafetyConfig`. Add the mapping + required-fields completeness (`lib/safety/evaluate.ts:603-611` already lists the fields).
3. **Collect what the rules expect**: pregnancy/breastfeeding (D-D), MEN2/medullary thyroid cancer, pancreatitis history — three DECLINE/blocking rules currently reference fields the step never asks.
4. **One BMI constant** per D-C, consumed by `consult-validators.ts`, `safety/rules.ts`, and marketing copy. Delete the <25/<27 divergence.
5. **Read the collected-but-unread toggles** (`wlHistoryHighBP`, `wlHistorySleepApnea`, `wlHistoryPCOS`) into doctor-visible notes, or remove them — collected-and-ignored is the worst state.
6. Per D-B(a): remove the `duromine` preference card + its validator branch; typed phentermine intent gets the standard decline path.

## Phase 2 — Intake rework

- Per D-A(a): delete `weight-loss-call-scheduling` from the registry (with a `RETIRED_STEP_ID_ALIASES` entry for in-flight drafts), keep `weight-loss-assessment` → `medical-history` → common tail. The assessment step's `requiresCall` escalation stays and now feeds `requires_live_consult` triage like women's health.
- **Key alignment:** the step writes `currentHeight`/`currentWeight` with no `bmi` key while the ED tail writes `heightCm`/`weightKg`/`bmi` — pick the ED keys (they already flow to the doctor draft context and clinical summary) and migrate the step. Note the five normalized DB columns (`current_weight_kg` … generated `bmi`) are written by nothing and absent from `types/db.ts` — either populate them in `buildAnswersInsertColumns` or leave explicitly JSONB-only; do not leave the ambiguity.
- Review-step summary already renders; verify against the reworked keys.

## Phase 3 — Doctor surface

1. `weightLossSummary` handler in `lib/clinical/case-summary.ts` (currently falls to `unknownConsultSummary`, which surfaces none of the wl* answers, no BMI, no eating-disorder history).
2. Fix `components/doctor/clinical-summary.tsx:279-289` — the weight_loss config is entirely snake_case against a camelCase intake (zero of fourteen fields match) and names five keys that don't exist in any casing; the call banner reads `requires_call` and can never fire.
3. Capability: `docs/DOCTOR_ONBOARDING.md:129` requires capability + Medical Director sign-off — add `can_review_weight_loss` (column + migration + admin UI + `requiredCapabilityForService` case), defaulting FALSE for non-admin doctors (unlike other flags — this line starts restricted).
4. AI draft context: `app/actions/drafts/shared.ts` has no wl* handling; add the assessment block so the doctor's draft context isn't empty.

## Phase 4 — Gate flip + governance (single PR, everything in lockstep)

- Remove `weight_loss` from `BLOCKED_CONSULT_SUBTYPES`; add the inner scoping allowlist if D-B narrows options (the women's-health `LIVE_*_OPTIONS` precedent — the launch is the inner gate, not just the Set removal).
- Service catalog: drop `comingSoon`, real price display; contract tests to update in lockstep: `consult-subtype-contract`, `public-service-scope-contract` (hardcodes `["weight-loss"]` as coming-soon and the subtype allowlist), `advertising-compliance-guard` (pins `comingSoon: true` + sitemap absence), `service-launch-checklists-contract`.
- **Write the weight-loss section of `docs/SERVICE_LAUNCH_CHECKLISTS.md`** (none exists) with the shared must-pass gates + service-specific rows (BMI gate enforcement, pregnancy screen, eating-disorder escalation, pilot thresholds mirroring women's health: pause >10% refunds / >20% unsuitable / >40% doctor-contact), and run the 90/100 scorecard before any paid traffic.
- Canon edits, one commit: `BUSINESS_PLAN.md:22,42,105` · `REVENUE_MODEL.md:54,165` · `ROADMAP.md:16,81` · `CLINICAL.md:33,197,210` (resolves D2 of the routing plan as "launched") · CLAUDE.md pricing row + gotcha.
- Repeat-lane routing follow-through: `detectGatedServiceMedication` gains a live destination — decide steer tier (recommend `hard` like ED/hair once the service is live; it inherits the structured-context pattern automatically).
- Verify the shared Stripe price ID (`price_1Stjql…`, identical in preview + production env) is a live-mode $89.95 price in the dashboard — operator task, not verifiable from the repo.
- E2E: full weight-loss flow spec (none exists; current specs only assert the gate holds) + payment smoke.
- Kill switch: weight loss inherits `disable_consults` only — add a dedicated `disable_weight_loss` flag so the new line can be stopped without taking down ED/hair/WH.

## Phase 5 — Marketing surface (ads stay OFF)

- Rewire `app/weight-loss/page.tsx` to import the launch-ready orphaned client (its header comment says exactly this); reconcile its BMI copy with the D-C constant; keep the knip exemption removal.
- Nav/footer/pricing/`/consult` additions; sitemap + `KEEP_INDEXED` + llms.txt posture updates; `/weight-loss-online` guide gets a cross-link but keeps its educational identity.
- **No paid campaigns**: `docs/ADVERTISING_COMPLIANCE.md:240` requires a separate explicit approval for any weight-loss campaign; this plan does not grant it. Organic + existing-patient discovery only for the pilot.

## Out of scope, explicitly

Subscriptions/memberships (BUSINESS_PLAN), pharmacy fulfilment, ongoing-monitoring promises, phentermine (unless D-B(b)), any paid advertising, bariatric/complex-endocrine claims.

## Rollout

Phase 1+2 (one PR, clinical), Phase 3 (one PR, doctor surface), Phase 4 (gate flip + governance), Phase 5 (marketing) — sequential, each behind the still-closed gate until Phase 4, so everything is testable in E2E without public exposure. Pilot: bounded manual review of every early case per the checklist, exactly like the women's-health launch (which needed ~7 follow-up commits — budget for the same).

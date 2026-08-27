# Specialty Profitability Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Hair Loss and ED measurably more profitable through clearer one-off offers, privacy-safe sequential experience cohorts, and bounded paid controls without adding intake friction or weakening clinical, identity, payment, or fulfilment safeguards.

**Architecture:** A code-owned specialty-experience registry assigns one opaque version to each service's active approach. The version follows the existing privacy-safe flow attempt outside clinical answers through draft, checkout, intake, Stripe metadata, and canonical analytics. Hair H1 and ED E1 change landing presentation only; later intake-presentation approaches remain inactive until the first windows close. Ads policy may recommend an exact approval-gated pause but never mutates an account from this plan.

**Tech Stack:** Next.js 15.5 App Router (Webpack), React 18.3, TypeScript 5.9, Zustand, Supabase PostgreSQL, Stripe v22, PostHog personless analytics, Vitest, Playwright, and the existing Google Ads Agent control plane.

**Spec:** [`docs/superpowers/specs/2026-08-28-specialty-profitability-rebuild-design.md`](../specs/2026-08-28-specialty-profitability-rebuild-design.md)

## Global Constraints

- `docs/ROADMAP.md` remains the sole active priority queue. This plan elaborates the existing specialty/Ads work and does not reorder it.
- Employer outreach is excluded. Do not add an employer pitch, directory task, verification campaign, or related measurement arm.
- Use `corepack pnpm`. Do not change pinned framework/runtime versions or the lockfile.
- Do not add a question, step, screen, required tap, appointment, call requirement, identity field, consent, account gate, or payment screen.
- Do not change service prices, priority pricing, refund policy, safety rules, doctor-review requirement, checkout state transitions, prescription fulfilment, or clinical routing except the explicit defense-in-depth parity repair.
- Hair H1 and ED E1 are the only active product approaches in this implementation. H2/H3 and E2/E3 stay documented and inactive until the current arms close.
- Use existing marketing primitives and components. Do not add quizzes, calculators, comparison widgets, prevalence counters, decorative clinical diagrams, invented social proof, or new pages.
- Keep medicine/ingredient names out of public copy, metadata, schema, URLs, and Ads-facing content.
- Do not make a live Google Ads mutation. Every keyword, ad, bid, budget, targeting, schedule, campaign-status, experiment, or destination change needs a fresh immutable packet and exact approval.
- Keep experiment data aggregate and PHI-free. Never include patient/staff/database IDs, names, emails, phone, DOB, Medicare/IHI, address, click IDs, search terms, medicine data, clinical answers, or free text.
- Follow strict RED -> GREEN -> REFACTOR. Watch every new test fail for the intended reason before production code.
- Load `instantmed-clinical-safety-review` before clinical/safety edits, `instantmed-checkout-payment-review` before checkout/persistence edits, `instantmed-marketing-compliance-review` before public-copy sign-off, and `instantmed-ui-browser-verification` before visual sign-off.
- Preserve the untracked `output/` directory and unrelated commits inherited from `codex/serp-sitelinks`.

---

## Stage 0 — Independent Review Gate

### Task 0: Obtain and resolve Fable's adversarial review

**Files:**

- Review: `docs/superpowers/specs/2026-08-28-specialty-profitability-rebuild-design.md`
- Review: `docs/superpowers/plans/2026-08-28-specialty-profitability-rebuild.md`
- Modify after review: both files above

- [ ] Give a fresh independent reviewer only the two artifacts plus the canonical business, revenue, clinical, advertising, architecture, and roadmap docs.
- [ ] Require `KEEP`, `REVISE`, or `BLOCK`, with load-bearing findings ordered by risk and the smallest correction for each.
- [ ] Require explicit review of economics, sample size, experiment isolation, privacy, clinical invariants, no-friction constraint, marketing compliance, payment/recovery, Ads authority, rollback, and employer-outreach exclusion.
- [ ] Add a dated `Fable Review Receipt` section to the spec containing the verdict, material findings, accepted corrections, and any rejected suggestion with evidence.
- [ ] Revise every affected task before implementation. No product code changes precede this gate.
- [ ] Run:

```bash
corepack pnpm doc:audit
```

Expected: PASS with the new documents registered and no placeholders.

- [ ] Commit the reviewed artifacts separately:

```bash
git add docs/superpowers/specs/2026-08-28-specialty-profitability-rebuild-design.md docs/superpowers/plans/2026-08-28-specialty-profitability-rebuild.md docs/bookkeeping/expected-md-count docs/bookkeeping/file-map.md
git commit -m "docs(growth): approve specialty profitability rebuild"
```

---

## Stage 1 — Freeze Invariants Before Building

### Task 1: Add clinical and no-friction contracts first

**Files:**

- Create: `lib/__tests__/specialty-experience-invariants.test.ts`
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts`
- Modify: `lib/__tests__/money-page-art-direction-contract.test.ts`
- Read: `lib/request/step-registry.ts`
- Read: `lib/request/validation.ts`
- Read: `lib/constants/index.ts`

- [ ] Add a source-backed contract that records the current ED and Hair step IDs, required validation keys, prices, and terminal safety components before any conversion edit.
- [ ] Assert that the active H1/E1 implementation does not add a request step or required answer.
- [ ] Assert that public Hair/ED copy contains no medicine/ingredient name, guaranteed prescription, “no call needed,” review-hours window, before/after outcome, or hardcoded price.
- [ ] Update the money-page contracts to require practical outcome/cost content before the long educational/safety sequence without requiring a new component.
- [ ] Run the focused tests and confirm RED because the registry and rebuilt page order/copy do not exist:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-experience-invariants.test.ts \
  lib/__tests__/money-page-narrative-compression-contract.test.ts \
  lib/__tests__/money-page-art-direction-contract.test.ts
```

- [ ] Do not weaken a clinical invariant to get GREEN.

### Task 2: Add prescribing-identity truth contracts

**Files:**

- Modify: `lib/__tests__/marketing-copy-contract.test.ts`
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts`
- Read: `components/request/steps/patient-details-step.tsx`
- Read: `lib/request/unified-checkout.ts`

- [ ] Add failing assertions that active prescribing money pages say “Medicare or IHI” and do not say Medicare alone is required.
- [ ] Assert that the validator still requires valid Medicare+IRN or valid IHI, sex, phone, DOB, and structured Australian address.
- [ ] Run the focused tests and confirm RED on the stale public/documentation strings:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/money-page-narrative-compression-contract.test.ts \
  lib/__tests__/unified-intake-regressions.test.ts
```

---

## Stage 2 — Privacy-Safe Sequential Cohorts

### Task 3: Build the code-owned specialty experience registry

**Files:**

- Create: `lib/growth/specialty-experiences.ts`
- Create: `lib/__tests__/specialty-experience-registry.test.ts`

- [ ] Define the allowlisted opaque versions from the approved spec, with Hair H1 and ED E1 active and all later approaches inactive.
- [ ] Implement normalisation that returns `null` for unknown, wrong-service, retired-at-start, overlong, or malformed values.
- [ ] Fail tests if more than one active material version exists for a service.
- [ ] Keep version IDs free of patient, medicine, query, and clinician meaning.
- [ ] Run RED, implement the smallest registry, then run GREEN:

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-experience-registry.test.ts
```

### Task 4: Persist the cohort outside clinical answers

**Files:**

- Create: `supabase/migrations/20260828090000_specialty_experience_attribution.sql`
- Modify: `types/supabase.ts`
- Modify: `components/request/store.ts`
- Modify: `lib/request/draft-storage.ts`
- Modify: `lib/request/server-draft.ts`
- Modify: `lib/request/server-draft-conversion.ts`
- Modify: `app/actions/unified-checkout.ts`
- Modify: `lib/stripe/checkout/types.ts`
- Modify: `lib/stripe/checkout/persistence.ts`
- Modify: `lib/stripe/guest-checkout.ts`
- Modify: `lib/stripe/checkout/retry-payment.ts`
- Modify: `lib/stripe/stripe-session.ts`
- Modify: `lib/stripe/confirmed-payment-finalization.ts`
- Modify: `lib/analytics/posthog-privacy.ts`
- Modify: `lib/__tests__/flow-instance-attribution-contract.test.ts`
- Modify: `lib/__tests__/posthog-personless-analytics.test.ts`
- Create: `lib/__tests__/specialty-experience-attribution-contract.test.ts`

- [ ] Add nullable `growth_experience_version` columns to `partial_intakes` and `intakes`, with a length/format check and comments declaring the field non-clinical.
- [ ] Keep the column outside `answers`; never copy it into clinical summaries, doctor prompts, emails, or Parchment payloads.
- [ ] Capture an allowlisted version when a specialty flow starts and preserve it through local/service drafts, authenticated and guest checkout, recovered drafts, retry payment, Stripe metadata, and the server purchase event.
- [ ] Preserve an existing saved cohort on restore; never silently reassign it to the currently active version.
- [ ] Unknown values become `null` and never block intake, checkout, payment, or fulfilment.
- [ ] Add the property to the PostHog privacy allowlist only after strict normalisation.
- [ ] Confirm the version is not emitted with search terms, click IDs, answers, or free text.
- [ ] Run the contract tests RED, implement, then GREEN:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-experience-registry.test.ts \
  lib/__tests__/specialty-experience-attribution-contract.test.ts \
  lib/__tests__/flow-instance-attribution-contract.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts \
  lib/__tests__/conversion-value-accuracy-contract.test.ts
```

- [ ] Run Supabase static checks used by the repo and verify the migration is additive and backward compatible.

### Task 5: Version landing analytics without making PostHog the allocator

**Files:**

- Modify: `lib/hooks/use-landing-analytics.ts`
- Modify: `components/marketing/shared/landing-page-shell.tsx`
- Modify: `components/marketing/hair-loss-landing.tsx`
- Modify: `components/marketing/erectile-dysfunction-landing.tsx`
- Create: `lib/__tests__/specialty-landing-analytics-contract.test.ts`

- [ ] Accept an allowlisted `growthExperienceVersion` in the shared landing shell.
- [ ] Emit one best-effort `landing_experience_viewed` event and attach the same version to CTA, FAQ, section, and scroll events.
- [ ] Append the opaque version to the internal request CTA in a controlled query parameter so the request store can claim it at start.
- [ ] Keep the public landing URL and canonical URL unchanged.
- [ ] Confirm analytics absence/failure does not block navigation.
- [ ] Run RED then GREEN:

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-landing-analytics-contract.test.ts
```

---

## Stage 3 — First Active Rebuild Approaches

### Task 6: Ship Hair H1 practical-outcome clarity

**Files:**

- Modify: `components/marketing/hair-loss-landing.tsx`
- Modify: `app/hair-loss/page.tsx`
- Modify: `lib/marketing/approved-claims.ts`
- Modify: `lib/__tests__/hair-loss-tga-compliance.test.ts`
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts`
- Modify: `lib/__tests__/money-page-art-direction-contract.test.ts`
- Modify: `e2e/money-pages-foundations.spec.ts`

- [ ] Keep the existing approved `Hero`, typography, spacing, solid-depth cards, dark mode, unavailable-service behaviour, sticky CTA, and request destination.
- [ ] Rewrite the hero around one-off private doctor assessment, A$49.95 via `PRICING_DISPLAY`, possible contact, qualified eScript outcome, Australian pharmacy handoff, medicine cost separate, prescription not guaranteed, and full refund if declined.
- [ ] Reuse `getApprovedClaim("prescription_if_approved")`, `getApprovedClaim("form_first_wedge")`, and `getApprovedClaim("refund_guarantee")`; add only one code-owned prescribing-identity claim if Fable approves it.
- [ ] Move the existing process/outcome/cost section directly below the hero instead of creating another panel.
- [ ] Keep sudden/patchy/inflamed/infected scalp and broader-diagnosis boundaries intact below the practical offer.
- [ ] Leave every Hair intake step and question unchanged during H1.
- [ ] Keep metadata medicine-name-free and qualified; do not turn a prescription outcome into a guarantee.
- [ ] Run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/hair-loss-tga-compliance.test.ts \
  lib/__tests__/money-page-narrative-compression-contract.test.ts \
  lib/__tests__/money-page-art-direction-contract.test.ts \
  lib/__tests__/paid-claims-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts
```

Expected: PASS.

### Task 7: Ship ED E1 private-outcome clarity

**Files:**

- Modify: `components/marketing/erectile-dysfunction-landing.tsx`
- Modify: `app/erectile-dysfunction/page.tsx`
- Modify: `lib/data/ed-faq.ts`
- Modify: `lib/__tests__/money-page-narrative-compression-contract.test.ts`
- Modify: `lib/__tests__/money-page-narrative-contract.test.ts`
- Modify: `lib/__tests__/money-page-art-direction-contract.test.ts`
- Modify: `e2e/money-pages-foundations.spec.ts`

- [ ] Use a human H1 such as “Private ED assessment, from home,” with SEO terms retained in metadata/supporting copy.
- [ ] Put A$49.95 via `PRICING_DISPLAY`, Medicare or IHI plus Australian address, the catalog-owned `~4 min` effort, medicine cost separate, possible contact, qualified eScript outcome, no-guarantee copy, and full refund if declined beside the first CTA.
- [ ] Make the hero CTA “Start private assessment” plus the code-owned price; make “See how it works” a quiet anchor rather than an equal-weight conversion choice.
- [ ] Move the existing review/cost/outcome section directly after the hero; do not add a duplicate facts panel.
- [ ] Remove unsupported public references to chest symptoms, exercise tolerance, or a collected blood-pressure value. Describe only current heart/stroke history, very low blood pressure, medicines, allergies, and conditions.
- [ ] Preserve the one authoritative emergency boundary and all existing clinical details below the practical offer.
- [ ] Repair the FAQ's stale Medicare-only and review-window wording with approved 24/7 variable-timing copy.
- [ ] Leave the five-screen ED intake unchanged during E1.
- [ ] Run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/money-page-narrative-compression-contract.test.ts \
  lib/__tests__/money-page-narrative-contract.test.ts \
  lib/__tests__/money-page-art-direction-contract.test.ts \
  lib/__tests__/ed-intake-validation.test.ts \
  lib/__tests__/paid-claims-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts
```

Expected: PASS.

---

## Stage 4 — Truth and Safety Hardening That Does Not Confound UX

### Task 8: Canonicalise Medicare-or-IHI prescribing identity

**Files:**

- Modify: `CLAUDE.md`
- Generated: `AGENTS.md` via `scripts/sync-agent-doc.sh`
- Modify: `CONTEXT.md`
- Modify: `docs/CLINICAL.md`
- Modify: `lib/marketing/approved-claims.ts`
- Modify: `components/request/service-hub-screen.tsx`
- Modify active prescribing landing mirrors found by the failing contract
- Modify: `lib/__tests__/marketing-copy-contract.test.ts`
- Modify: `lib/__tests__/project-docs-drift-contract.test.ts`

- [ ] Define `Prescribing Identity` in `CONTEXT.md` as DOB, sex, phone, structured Australian address, and valid Medicare+IRN or valid IHI.
- [ ] Update canonical eligibility/clinical wording without changing validators or downstream fulfilment.
- [ ] Add one approved high-repetition claim and use it on active prescribing money pages rather than forking near-duplicates.
- [ ] Update Hair, ED, prescriptions, women's health, UTI, contraception, and the request hub where they incorrectly say Medicare alone is required.
- [ ] Do not change the accurate “No Medicare required” medical-certificate copy.
- [ ] Run the generator rather than editing `AGENTS.md` by hand:

```bash
scripts/sync-agent-doc.sh
scripts/sync-agent-doc.sh --check
```

- [ ] Run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/project-docs-drift-contract.test.ts \
  lib/__tests__/unified-intake-regressions.test.ts
corepack pnpm doc:audit
```

Expected: PASS.

### Task 9: Add Hair reproductive-safety defense-in-depth parity

**Files:**

- Modify: `lib/safety/rules.ts`
- Modify safety evaluation inputs/types only if required by the existing engine
- Modify: `lib/__tests__/checkout-safety-ordering.test.ts`
- Modify: `lib/__tests__/missing-safety-payment-hold.test.ts`
- Modify: `lib/__tests__/request-terminal-safety-blocks.test.ts`
- Modify: `lib/__tests__/consult-validators.test.ts`

- [ ] First add a failing test proving `checkSafetyForServer("consult", hairReproductive=yes)` does not currently match unified checkout's hard block.
- [ ] Add the smallest Hair-specific safety rule so lower-level checkout defense, recovered rows, and retry payment cannot proceed with the existing contraindicating answer.
- [ ] Preserve the normal unified validator and exact patient-facing terminal block. Do not add or move a question during H1.
- [ ] Confirm safe `no` and `na` values still proceed and missing safety follows the existing recoverable-hold policy rather than an invented outcome.
- [ ] Run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/checkout-safety-ordering.test.ts \
  lib/__tests__/missing-safety-payment-hold.test.ts \
  lib/__tests__/request-terminal-safety-blocks.test.ts \
  lib/__tests__/consult-validators.test.ts \
  lib/__tests__/hair-loss-health-validation.test.ts
```

Expected: PASS.

---

## Stage 5 — Enforce Bounded Paid Learning Without Mutating Ads

### Task 10: Make specialty click gates executable

**Files:**

- Modify: `lib/ads-agent/policy.ts`
- Modify: `lib/__tests__/google-ads-agent-policy.test.ts`
- Modify: `lib/__tests__/google-ads-agent-policy-contract.test.ts`
- Modify: `lib/__tests__/google-ads-agent-brief.test.ts` only if reason rendering changes

- [ ] Add failing 9/10 and 29/30 click boundary tests for a specialty with zero retained orders.
- [ ] Preserve precedence: unavailable economics -> investigate; tracking not GREEN -> hold; loss cap -> approval-needed pause; already paused -> hold.
- [ ] At 10 clicks and zero orders, return a PHI-free investigation reason rather than implying the pilot is healthy.
- [ ] At 30 clicks and zero orders, return `APPROVAL_NEEDED` for `campaign_status`.
- [ ] Do not enforce elapsed days or persisted checkout progression until campaign-scoped evidence exists. Keep the limitation explicit rather than deriving a false date/count.
- [ ] Do not call mutation, proposal-send, or account APIs from policy evaluation.
- [ ] Run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/google-ads-agent-policy.test.ts \
  lib/__tests__/google-ads-agent-policy-contract.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts
```

Expected: PASS and Hair-like 40-click/zero-order evidence produces an exact pause proposal recommendation, not a live pause.

---

## Stage 6 — Integrated Verification and Commit

### Task 11: Verify public pages and no-friction paths in a real browser

**Files:**

- Modify only defects found within this plan's scope
- Verify: `/hair-loss`
- Verify: `/erectile-dysfunction`
- Verify: `/request?service=consult&subtype=hair_loss`
- Verify: `/request?service=consult&subtype=ed`

- [ ] Start the app on the dedicated port:

```bash
corepack pnpm dev
```

- [ ] Verify Hair and ED landing pages at 390px mobile and desktop in light and dark mode.
- [ ] Verify reduced motion, 200% zoom proxy, keyboard focus order, heading order, contrast, no clipped content, and sticky CTA behaviour.
- [ ] Verify both hero/sticky CTAs route to the correct subtype and preserve only an allowlisted opaque cohort.
- [ ] Walk safe Hair and ED guest flows through Review/Pay without submitting a real payment. Confirm H1/E1 did not add or remove an intake screen.
- [ ] Verify Hair reproductive terminal block and ED nitrate terminal block, then correct/back behaviour.
- [ ] Verify IHI selection works without a Medicare number and the structured address remains required.
- [ ] Verify unavailable-service state routes to Contact and does not start a cohort.
- [ ] Capture screenshots and console/network receipts outside tracked source files. Do not capture PHI.

### Task 12: Run compliance, regression, and release checks

**Files:**

- Review the complete branch diff
- Update plan checkboxes and Fable receipt only with truthful evidence

- [ ] Run focused suites from Tasks 1-10.
- [ ] Run:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm content:audit
corepack pnpm doc:audit
```

- [ ] Run the relevant Playwright specs with the approved local configuration:

```bash
PLAYWRIGHT=1 corepack pnpm exec playwright test \
  e2e/money-pages-foundations.spec.ts \
  e2e/consult-subtypes.spec.ts \
  e2e/intake-terminal-blocks.spec.ts
```

- [ ] Perform the mandatory marketing-compliance review and return PASS/FAIL with findings, evidence, and smallest corrections.
- [ ] Perform the mandatory UI/browser review and return PASS/FAIL with route, viewport, screenshot, console, network, interaction, accessibility, and residual-risk evidence.
- [ ] Run a fresh broad branch review after all scoped tests pass.
- [ ] Confirm no Ads mutation, deployment, external send, employer outreach, or patient data access occurred.
- [ ] Commit implementation in coherent slices, then finish with a verification receipt commit. Do not push, merge, deploy, or mutate Ads without fresh approval.

---

## Stage 7 — Evidence-Gated Later Approaches (Not Active in This Implementation)

### Task 13: Close H1/E1 before activating an intake-presentation approach

- [ ] Wait for the directional floor or 21 days, then allow 24 hours for settlement.
- [ ] Read versioned, aggregate, PHI-free funnel and retained-cash evidence.
- [ ] Call the commercial result only at 10 retained orders; otherwise label it directional or inconclusive.
- [ ] Confirm no Ads/acquisition variable overlapped the service's product window.
- [ ] Choose at most one next material approach for that service:
  - Hair H2 merged opener, or Hair H3 privacy-led landing.
  - ED E2 optional-BMI removal, or ED E3 privacy-led landing.
- [ ] Write a new exact activation commit and deployment receipt. Do not silently activate a later approach from this plan.

### Task 14: Prepare, but do not apply, paid packets from fresh evidence

- [ ] Refresh live account and local retained-order truth after the product window closes.
- [ ] Hair: any pause/relaunch packet must bind the new bounded stop rules, exact/phrase assessment intent, A$3 CPC ceiling, and maximum incremental loss.
- [ ] ED: any losing-keyword or RSA packet is one variable, one immutable packet, and one observation window.
- [ ] Med cert: join losing query rows to local paid-order truth; do not raise budget or price, and do not include employer outreach.
- [ ] Stop and ask for exact approval for each immutable proposal. Plan approval is not mutation approval.

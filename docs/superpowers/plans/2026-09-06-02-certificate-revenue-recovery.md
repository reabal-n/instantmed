# Session 2 — Certificate revenue recovery

> **For agentic workers:** Use `superpowers:executing-plans` task by task. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Identify the largest supported certificate revenue constraint and complete one justified intervention with a measurable outcome.

**Architecture:** Reuse the cash ledger, campaign attribution, exact-flow analytics and existing service pages. Refresh the diagnosis before selecting a change; build no new analytics platform and do not assume a redesign is the answer.

**Tech stack:** Existing Next.js/React stack, read-only GSC/Google Ads/PostHog/Supabase, canonical Stripe cash and fee readers.

**Spec:** [ROADMAP](../../ROADMAP.md), rank 4; [reconciled audit](../../audits/2026-09-04-scaling-audit.md); [REVENUE_MODEL](../../REVENUE_MODEL.md); [service SEO plan](2026-09-05-service-seo-priorities.md), which supplies existing research and experiment constraints.

**Status:** Planned. Start after Session 1's build/release handoff or an explicit operator decision concerning its documented outstanding item. The operator chose revenue before dashboard changes.

## Global constraints

- Load checkout/incident skills for failures, marketing-compliance and UI skills for public changes, and clinical safety for anything changing clinical meaning.
- Use completed Sydney days for comparable cash windows; label PostHog/GSC coverage and timezone differences. Acquisition labels are observations, not proof of causation.
- Preserve current pricing, eligibility, protocol/doctor boundaries, fee-aware contribution, experiment assignments and exact Ads approval requirements.
- No new service, Microsoft Ads launch, broad content programme, patient outreach, reminder wave, medicine-name acquisition campaign or embedded AI product is in scope.
- A calendar checkpoint or GREEN tracking alone does not authorize a new Ads variable. Paid ROAS and blended revenue/spend remain separate.

## Task 1 — Refresh the revenue bridge and locate the constraint

**Files/readers:** `lib/data/revenue-dashboard.ts`, `lib/data/customer-growth-revenue-read.ts`, `lib/analytics/source-classification.ts`, `lib/admin/refill-reminder-funnel.ts`, existing Ads/GSC tooling. Extend the dated audit/evidence with aggregates; do not replace historical period labels with current results.

- [ ] Read the preceding release receipt and refresh completed 1/7/30-day spend, orders, gross, cash refunds/reversals/disputes, retained revenue, fees and contribution. Verify ledger completeness before interpreting the total.
- [ ] Compare matching weekdays and several prior weeks; break the change down by service, acquisition source and mobile/desktop where the sample supports it.
- [ ] For certificates, connect qualified search demand → landing entry → exact-flow start → checkout → payment → fulfilment. Do not force different systems' counts to match or treat missing analytics as failed orders.
- [ ] Inspect bounded current failure categories and abandoned-flow recovery after Session 1. Keep the earlier Sep4 unknown failure and Sep6 persistence failure distinct.
- [ ] Review search terms/landing intent and cash contribution before recommending keyword, creative, bid or budget changes. Read live campaign strategy: manual bid modifiers are not useful for Target ROAS.
- [ ] Write a short ranked diagnosis with evidence for and against each explanation. The week ending Sep4's certificate share of the decline (62.8%) is a baseline, not a permanent conclusion.

## Task 2 — Choose exactly one eligible intervention

**Candidate files:** `app/medical-certificate/page.tsx`, `components/marketing/med-cert-landing.tsx`, `app/medical-certificate-online/page.tsx`, `components/marketing/medical-certificate-online-landing.tsx`, matching FAQ data, `components/request/request-flow.tsx`, affected certificate/review steps. Only edit files selected by the diagnosis.

**Interface:** Preserve existing `flow_instance_id`, attribution, service and experience-version contracts. A new tracked event must have a privacy-reviewed fixed schema and a defined consumer; avoid instrumentation with no decision use.

- [ ] Select the largest supported bottleneck, not the largest file or the easiest visual change. Record the exact proposed diff, mechanism, baseline, primary metric, guardrails and rollback.
- [ ] Check active certificate/prescription and specialty experiment boundaries against actual deployment timestamps. Research and safety fixes can proceed; a material measured-surface change needs its prior window completed or explicitly superseded.
- [ ] If this is a code defect, reproduce it using synthetic cases and fix it without weakening the guard that exposed it. If it is acquisition intent, prepare an exact Ads proposal; obtain applicable approval before any mutation.
- [ ] If a public-content change is justified and eligible, change one material variable. Use canonical claims/prices, visible HTML and existing page ownership; no speculative schema/FAQ/link expansion.
- [ ] If evidence is insufficient or all candidate product variables are held, record an explicit no-build decision with the next required sample/date. Do not create busywork to make this session appear to ship.

## Task 3 — Verify the journey and start measurement

**Existing verification:** `e2e/prod-request-flow-synthetic.spec.ts`, relevant certificate/guest checkout E2E specs discovered from the selected path, `lib/__tests__/revenue-dashboard.test.ts`, and focused tests for the actual changed contract.

- [ ] Exercise a small-phone guest journey: landing → eligibility/price → validation error → Back → resume/reload → checkout handoff. Exercise paid return/document access in an isolated payment environment if those seams change.
- [ ] Check keyboard use, long inputs, storage/network failure, interrupted navigation, dark/light themes and unchanged clinical/identity gates.
- [ ] Complete the required release checks and production proof for any implementation. Do not submit a real patient payment or issue a real document as a test.
- [ ] Record release boundary, affected cohort, metric denominator, minimum sample, observation window and confounders. Measure retained paid outcomes; do not claim uplift on deployment day.
- [ ] Continue to the dashboard session once this build is complete and observation is configured. Waiting for commercial maturity does not prevent independent internal UI work.

## Task 4 — Carry forward the existing checkpoints

These are bounded reads/decisions, not extra features and not a new automatic scheduler.

- [ ] Check whether `/prescriptions` and `/online-prescriptions` are indexed now. Their Sep5 Live Tests and request receipts are already done; do not resubmit daily. Inspect any still-excluded UTI child page against its existing SEO plan.
- [ ] Read refill cohorts from the existing funnel. Five sends and zero paid reorders at the Sep6 review were immature. Wait for the full 21-day window and three qualifying mature weekly waves before proposing another nudge; do not infer retained cash from intake refund snapshots.
- [ ] Re-evaluate Scripts only after three closed post-change days **and** ten attributed orders, then apply current tracking, contribution, refund, attribution and queue gates. Prepare exact changes for approval; no automatic weekly budget increment.
- [ ] If due: complete the Sep9 organic weight checkpoint, Sep11 hair readout/pause proposal, Women's health graduation evidence and ED's earliest settled close at `2026-09-19T05:13:53.870Z`. Preserve their canonical thresholds and explicit holds.
- [ ] Put future observation dates and unresolved dependencies in ROADMAP. Do not create reminders, recurring runs or a new task without the user asking for them.

## Exit and handoff

The deliverable is a fresh evidence-backed decision, one verified implementation or exact approved commercial change where justified, and a measurement handoff. An evidence-backed no-build decision is a valid investigation outcome and must not be described as an uplift.

**Next-session prompt:** “Execute Session 3, Concise clinical review, from ROADMAP. Read Session 2's release and experiment handoff, preserve its patient-facing cohorts, and work only the internal clinical workspace scope.”

## Execution receipt

Unstarted. Record the selected intervention or no-build decision, verified release evidence and observation checkpoint when performed.

# Plans Archive

Completed or superseded plans, preserved for retrospective context.

## Retention rule

Minimum 90 days. Re-evaluate quarterly. Delete only if:
- the plan has been fully superseded by a newer plan that has itself shipped, AND
- no current doc, code header, or memory file references the archived plan path.

## When to read these

- Onboarding a new contributor and they ask "why is X built this way?".
- A retro on a shipped feature that needs the original goals/risks.
- Resurrecting a deliberately-deferred plan (e.g. blood test referrals, repeat-Rx subscription nudge).

## When NOT to read these

- Day-to-day work. The canon (root laws + docs/) carries the live truth.
- Confusion about current behaviour. The code is the source of truth; archived plans describe intent that may or may not have shipped as written.

## Index

| File | Why archived |
|------|--------------|
| 2026-03-25-blood-test-referrals.md | Superseded (self-marked); pathology not in current /request service model. |
| 2026-04-06-revenue-engagement-design.md | Partially superseded (self-marked); Rx subscription nudge not aligned with one-off model. |
| 2026-04-06-revenue-engagement-plan.md | Same as above. Review-request work shipped. |
| 2026-04-13-god-component-decomposition.md | Pending approval since 2026-04-13; component tree reorganised on a different cadence. |
| 2026-04-13-lib-restructure-and-script-wiring.md | Pending approval since 2026-04-13; lib structure stabilised independently. |
| 2026-04-20-design-system-95-sprint.md | Shipped. See docs/DESIGN_SYSTEM_CHANGELOG.md. |
| 2026-05-04-health-guides-rehaul.md | Shipped. See CLAUDE.md "Health guide workflow". |
| 2026-05-20-admin-ops-cockpit-reshape-design.md | Shipped. See CLAUDE.md "Cockpit counter + recovery primitives". |
| 2026-05-20-admin-ops-cockpit-reshape-plan.md | Shipped. Implementation companion of the above design. |
| 2026-05-20-staff-cockpit-overhaul-design.md | Shipped. See CLAUDE.md "Staff dashboard URL", "Intake ledger". |
| 2026-05-20-staff-cockpit-overhaul-plan.md | Shipped. Implementation companion of the above design. |
| 2026-05-23-doc-cleanup-plan.md | Shipped 2026-05-23. PR 1 of the 3-PR doc cleanup program. Structural cleanup + doc-hygiene tooling (pnpm doc:audit + CI wire-in). |
| 2026-05-23-doc-content-audit-plan.md | Shipped 2026-05-23. PR 2 of the 3-PR doc cleanup program. Content audit sweep of 8 canonical docs + memory tree refresh (CLINICAL refund policy 100%, DESIGN version v2.0.2, General Consult retirement narratives, support role Phase 8, test/migration counts). |
| 2026-05-23-new-canon-docs-plan.md | Shipped 2026-05-23. PR 3 of the 3-PR doc cleanup program. Added docs/ROADMAP.md (internal roadmap) + docs/DOCTOR_ONBOARDING.md (technical onboarding) with drift-contract pins. COMPLAINTS_SOP.md was deliberately skipped as redundant with existing canon. memory/roadmap.md moved to memory/archive/. |

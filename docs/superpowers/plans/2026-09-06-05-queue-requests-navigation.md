# Session 5 — Queue and Requests navigation

> **For agentic workers:** Use `superpowers:executing-plans` and the project UI/clinical skills. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Make the next request/action easy to find and preserve the clinician's place when moving between the queue, Requests, patient details and the request record.

**Architecture:** Simplify the existing queue, Ledger/Requests filters and shared CaseTable around the clinical workspace released in Sessions 3–4. Reuse existing list-state and role-aware navigation helpers; do not merge the clinical queue with financial/support operations or store private search text in URLs.

**Tech stack:** Existing React/Next.js, operator CaseTable/FilterBar, shadcn controls, staff navigation and server search actions.

**Spec/design brief:** [ROADMAP](../../ROADMAP.md), rank 2; [DESIGN](../../../DESIGN.md); [staff operations](../../OPERATIONS.md); [Sessions 3](2026-09-06-03-concise-clinical-review.md) and [4](2026-09-06-04-parchment-prescribing-workspace.md).

**Status:** Planned. Starts after Session 4's release handoff; do not duplicate its review/modal work.

## Global constraints

- Preserve role scopes: doctor clinical capabilities, sole-admin controls, and support's bounded operations access. No shared visual component grants action authority.
- Preserve current identity, risk, priority, queue ownership and paid/refund state. Compact does not mean removing a clinically relevant flag.
- Keep `/dashboard` canonical. Use existing staff route constants; do not restore redirect-only doctor/admin aliases.
- Keep private search values and patient details out of URLs, telemetry and browser persistence without an existing approved retention model. Preserve state within the current authenticated workspace; clear it on account/session change.
- Retain the accepted review/notes/Parchment behavior from Sessions 3–4. No new public acquisition change or embedded AI feature.

## Task 1 — Simplify the working queue

**Files:** `app/doctor/queue/queue-table.tsx`, the current `/dashboard` client/header components located through its page entry point, `lib/doctor/case-summary.ts`, `components/operator/cases/case-table.tsx` where shared behavior applies.

- [ ] Capture active, empty/caught-up, loading/degraded and multi-owner queue states at laptop/mobile sizes.
- [ ] Consolidate the header into search/filter controls, availability and a compact operational status control. Move turnaround detail into its existing operational summary; show oldest wait once.
- [ ] Move the admin test-data control into a labelled admin menu while retaining a conspicuous banner whenever test data is active. Preserve its server authorization and reporting exclusions.
- [ ] Make each row read patient → specific request → next task, with wait/age and exceptions supporting it. Keep clinical risk, purchased priority and another doctor's ownership distinct.
- [ ] Collapse Approved today into an expandable footer while preserving actor-scoped results and its visibility on the caught-up dashboard.
- [ ] Check realtime updates: a newly completed/claimed/changed request must not steal focus, lose a draft or activate stale actions.

## Task 2 — Consolidate Requests/Ledger controls and actions

**Files:** `app/admin/intakes/intakes-ledger-client.tsx`, `components/operator/cases/case-table.tsx`, existing filter/search helpers and `lib/dashboard/staff-navigation.ts`/`lib/dashboard/routes.ts`.

**Interface:** Separate visible column headings from sorting capability. The current caller does not pass `sortable`, so headings must not depend on enabling sorting or new server queries. Preserve existing server filtering and pagination semantics.

- [ ] Keep the existing work lanes/filter presets, search and one Filters control with a readable active-filter summary. Consolidate service/status and density controls rather than stacking a second toolbar. User-configurable saved-view creation and new persistence are outside this scope.
- [ ] Always display useful column headings, with explicit sorting controls only for actually supported sort fields.
- [ ] Provide a labelled action menu for recovery/refund operations, keyboard and touch reachable without hover discovery. Retain all current authorization, payment-state and confirmation checks.
- [ ] Use Patient details and Request record for ambiguous destination labels without renaming underlying canonical URLs.
- [ ] Test empty results, server query failure, stale pagination and a changed record. Failed reads remain visibly degraded, not an empty healthy list.

## Task 3 — Preserve place and reduce navigation friction

**Files:** shared intake review panel, queue/Requests clients, existing doctor-panel/navigation state hooks and destination links. Extend the current state owner; avoid a new global store if component/session state already satisfies the contract.

- [ ] Preserve originating list, safe filters, pagination and selected case when opening patient details or the request record and returning.
- [ ] Keep private search terms in the authorized client/session state rather than the address bar; verify copied links and analytics contain no private search text.
- [ ] Restore keyboard focus to the initiating row/action and scroll position where the record still exists. If it moved out of the result set, show the updated list with an intelligible status rather than selecting a different patient silently.
- [ ] Preserve unsaved notes using Session 3's save/error behavior before navigation. Realtime updates and switching lists must not bypass that protection.
- [ ] Verify support/doctor/admin access separately, including direct URL entry and another doctor's ownership lock.

## Verification and final handoff

Extend relevant existing tests: `lib/__tests__/cockpit-case-table.test.tsx`, `lib/__tests__/admin-ledger-filters.test.ts`, `lib/__tests__/admin-ledger-server-contract.test.ts`, `lib/__tests__/dashboard-review-history.test.ts`, `lib/__tests__/doctor-queue-state.test.ts`, `e2e/dashboard.keyboard-safety.spec.ts` and `e2e/doctor.queue.spec.ts`.

Browser acceptance covers light/dark laptop/mobile, keyboard-only selection and action menus, safe URL inspection, search/filter/page return, empty/degraded queues, actor-scoped completed history, concurrent ownership and note-save failure. Existing patient-isolation, no-PHI-prefetch and route contracts remain required.

Complete the shared release protocol. Close implemented plan items, preserve still-maturing commercial checkpoints in ROADMAP, and give the operator one short list of remaining manual/evidence tasks. Do not claim improved clinician throughput without observing it or silently start a sixth build.

**Next-session prompt:** “Review the completed reliability/revenue/dashboard releases and the now-due measurement checkpoints in ROADMAP. Recommend the next supported variable; do not assume embedded AI, new channels or clinical model changes are approved.”

## Execution receipt

Unstarted. Record navigation/role/browser evidence and release receipts when performed.

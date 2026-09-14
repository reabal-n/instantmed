# Session 5 — Queue and Requests navigation

> **For agentic workers:** Use `superpowers:executing-plans` and the project UI/clinical skills. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Make the next request/action easy to find and preserve the clinician's place when moving between the queue, Requests, patient details and the request record.

**Architecture:** Simplify the existing queue, Ledger/Requests filters and shared CaseTable around the clinical workspace released in Sessions 3–4. Reuse existing list-state and role-aware navigation helpers; do not merge the clinical queue with financial/support operations or store private search text in URLs.

**Tech stack:** Existing React/Next.js, operator CaseTable/FilterBar, shadcn controls, staff navigation and server search actions.

**Spec/design brief:** [ROADMAP](../../ROADMAP.md), rank 2; [DESIGN](../../../DESIGN.md); [staff operations](../../OPERATIONS.md); [Sessions 3](2026-09-06-03-concise-clinical-review.md) and [4](2026-09-06-04-parchment-prescribing-workspace.md).

**Status:** Queue and Requests navigation merged in [PR #563](https://github.com/reabal-n/instantmed/pull/563) and deployed on September 14. Required CI and bounded production route smoke pass. The [final release receipt](#final-release-receipt--september-14) separates these checks from deferred phone, owner visual, monitoring and recipient-delivery evidence. The original before-first-edit merge condition remains unmet as recorded below.

## Later operator instruction — start now

The operator subsequently said “just start plan 5” after repeated reports that #561 remained open. The implementing agent interpreted that as lifting the merge wait and started initial Queue/Requests work from freshly fetched `origin/main` at `79e1d8b837dac0d54a1944227608b3807a5351da`. The documentation branch was rebased/verified against that base before runtime edits. The merge-wait heartbeat is paused. PR #561 and its readiness owner remain independent; reconcile its merged CI changes before the Plan 5 release if it merges during this work. No phone, visual, monitoring, payment or clinical evidence gate is waived. That interpretation was not an explicit user waiver of the original merge condition: initial presentation work preceded the merge. The dependency was integrated before return-state implementation; the original before-first-edit gate was therefore not met and is not retroactively marked complete.

## September 14 preparation and entry gate

**Authority:** ROADMAP rank 2 and its sequential session protocol remain authoritative. Read the [Plan 4 final release handoff](2026-09-06-04-parchment-prescribing-workspace.md#final-release-receipt--september-10-sydney), then the merged pre-Plan 5 readiness receipt delivered by PR #561. The security/checkout audit mentioned by the operator is a separate workstream: no audit findings, remediation, checkout redesign or security-wide refactor enter this plan. Its attachment contents were not available to this preparation; no audit verdict is implied.

**Preparation baseline:** `origin/main` at `79e1d8b837dac0d54a1944227608b3807a5351da`. Read-only inspection found PR #561 open on head `a6c799666cbcabd8b2b4a9bc6fc59d7d3b73c9aa`; build passed, E2E and Lighthouse were running. This is a dated observation, not the implementation base or a release receipt. The existing pre-Plan 5 readiness task owns that PR's CI diagnosis, merge and monitoring follow-up.

- [x] Read PR #561's current state, head, required checks and merge commit. An open or closed-unmerged PR does not satisfy the dependency. Do not merge it from this task or change its test selection to accelerate Plan 5.
- [ ] Require the actual merge and its ancestry before choosing the implementation base:

```bash
test "$(gh pr view 561 --repo reabal-n/instantmed --json state --jq .state)" = MERGED
plan5_dependency_merge=$(gh pr view 561 --repo reabal-n/instantmed --json mergeCommit --jq .mergeCommit.oid)
test -n "$plan5_dependency_merge"
git fetch origin
git merge-base --is-ancestor "$plan5_dependency_merge" origin/main
git rev-parse origin/main
```

Run these checks sequentially and stop on any failed command. A green check is not a merge.
- [ ] Keep this planning commit available in the implementation checkout. Rebase the owned documentation-only branch onto the freshly fetched `origin/main` before the first runtime edit; preserve unrelated work and resolve only this plan's documentation conflicts. Re-read ROADMAP, the merged readiness receipt and the navigation files after rebasing.
- [ ] Record the current application deployment and any relevant outstanding incident from the existing release handoff. Test/docs CI for #561 is not a new clinical runtime deployment. Do not run shared local clinical fixtures while its CI still owns them.
- [ ] Execute inline with `superpowers:executing-plans`; use the relevant UI/clinical workflow before runtime edits, and the payment workflow before changing the presentation of existing recovery/refund controls. Preserve their implementation and authority. Obtain independent review at the task/release boundary required by ROADMAP.

### Evidence carried forward, outside Plan 5 completion

| Gate | Source and boundary to preserve |
|---|---|
| Physical phone acceptance | Deferred by the owner. Dashboard → existing request → Prescribe → close must demonstrate readable reference, usable keyboard/viewport, provider space and return to the same request. No prescription should be issued for this check. Emulated mobile checks cannot close it. |
| Staff visual acceptance | Plans 3–4 machine/browser receipts do not establish the owner's acceptance. Preserve the latest separate public-quality receipt; its score is not a score of the clinician workspace. |
| Sustained monitoring cadence | The #561 readiness receipt records first natural browser completion at September 14 **06:19:01 UTC**, accepted by observer version 2245. The fixed full-day window ends September 15 **06:19:01 UTC / 16:19:01 Sydney**. Its owner must assess eligible first-attempt completions, failures, maximum internal gap and trailing age against the 150-minute requirement. Do not reset the window or count manual runs/reruns. |
| Downstream alert delivery | Sentry rule 3987742 is already enabled under owner authorization. Its natural 07:10:28 UTC trigger and next-poll recovery prove routing/recovery, not inbox delivery. Do not duplicate the rule, send test notifications or mark recipient delivery accepted. |
| Other prior obligations | Retain commercial observation windows, historical Medical Director review, unsent superseded certificate and reporting uncertainties in their existing owners. Plan 5 does not resolve them. |

These evidence gates remain visible without expanding Plan 5 into phone testing, monitoring repair or commercial work. The operator's September 14 instruction makes #561's merge the implementation prerequisite; it does not waive or close the other evidence.

### Inspected implementation and intended boundaries

| Surface | Current owner and observed behavior | Bounded change |
|---|---|---|
| Queue header and working list | `app/dashboard/page.tsx`, `app/doctor/queue/queue-client.tsx`, `queue-filters.tsx`, `queue-table.tsx`; existing private Server Action search, status/page URLs, before-leave note guard and realtime reconciliation | Consolidate controls and row hierarchy around those owners. Preserve the initial server clock and authoritative filtering before pagination. |
| Approval history | `components/doctor/approved-today-list.tsx`; expanded list appears in both queue layouts, with actor/protocol provenance and truncation labels | Default-collapsed accessible footer with count and retained provenance; caught-up visibility and degraded/truncated truth must survive. |
| Requests headings | `components/operator/cases/case-table.tsx` renders headings only when `sortable=true`; the Requests caller does not pass it | Render non-interactive headings by default. Add sort buttons only where a caller supplies working sort behavior; do not invent client sorting of a server page. |
| Requests controls | `app/admin/intakes/intakes-ledger-client.tsx`, `ledger-filter-selects.tsx`, `components/operator/cases/filter-bar.tsx`; work lanes, quick chips, density and service/status controls occupy separate groups | Keep work lanes and quick presets; place secondary service/status/density in one labelled Filters popover with a readable active summary. |
| Recovery/refund discovery | Separate mobile/desktop render branches call the same current handlers | Reuse one labelled menu presentation for both branches; selecting an item opens the existing dialog or handler. No direct refund on menu open/select and no new send action. |
| Review and destination navigation | `components/doctor/intake-review-panel.tsx` already awaits `flushNotes` for full-record navigation; patient details use the existing panel; `components/panels/panel-provider.tsx` closes on pathname changes | Preserve the note-save owner and panel lifecycle. Name destinations Patient details and Request record; preserve canonical role-specific paths and modifier-click behavior. |
| List return state | Queue and Requests currently keep query/selection in page-local React state; Queue also has existing opaque-ID focus hints in `lib/doctor/queue-focus.ts`. Density alone has an existing localStorage preference | First exercise return behavior. Retain working page/panel state. If route remount loses private search, add only a bounded, authenticated in-memory navigation owner; never persist query/results/notes in browser storage or URLs. |

### Layout and return-state contract

- Queue: a short header retains availability and operational health; the existing oldest-wait signal appears once. Search/filter controls lead into the internally scrolling clinical list. Rows read patient → specific request → next task, with separately readable wait, risk, purchased priority and ownership. Secondary admin test-data control moves into a labelled menu, while active-test visibility remains conspicuous and truthful about the selected mode.
- Requests: work-lane presets remain visible above one search/filter row. A Filters popover owns service, status and density; active values can be read and cleared without opening it. Desktop columns stay labelled; mobile rows have labelled actions with at least 44px targets. Keep existing recovery/refund confirmations and pending states.
- Return: remember the originating surface, allowlisted filters, page/page size, selected request, initiating action and internal scroll offset. Private search stays only in current authenticated memory. Do not cache result rows, clinical answers or note drafts. On return, re-query authority before enabling actions; restore focus only to the matching surviving row/action, otherwise announce that the request is no longer in this view and focus the list heading. Never choose a different patient silently.
- If an extra owner is necessary after the route-return reproduction, scope it to two entries (Queue/Requests) in the existing authenticated React provider tree. Clear before reuse on sign-out, account change or a new session, including sign-in as the same account; ordinary token refresh should retain the active workspace. Hard reload may intentionally clear private search. This is not saved-view creation, cross-tab synchronization or durable storage.
- Navigation must await the existing note flush. Failed save keeps the current request/draft and its error visible; successful save permits the destination. Normal close, browser back, keyboard next/previous and links between lists must not create an unguarded replacement path. Direct entry without a remembered origin uses the role-appropriate canonical list.
- Preserve Plan 4's viewport-minus-32px desktop workspace capped at 1440px, the 300px reference pane from 1280px, top reference below that width and full-height mobile sheet. Do not edit its source summary parser, provider iframe behavior, separate clipboard values, exact-request checks or durable completion logic.

## Global constraints

- Preserve role scopes: doctor clinical capabilities, sole-admin controls, and support's bounded operations access. No shared visual component grants action authority.
- `/admin/intakes` is currently admin/support-only, with masked support results; ordinary doctors use Queue and their authorized records. Test that boundary rather than granting doctors Requests access. `/dashboard` continues to route support to Operations.
- Preserve current identity, risk, priority, queue ownership and paid/refund state. Compact does not mean removing a clinically relevant flag.
- Keep `/dashboard` canonical. Use existing staff route constants; do not restore redirect-only doctor/admin aliases.
- Keep private search values and patient details out of URLs, telemetry and browser persistence without an existing approved retention model. Preserve state within the current authenticated workspace; clear it on account/session change.
- Retain the accepted review/notes/Parchment behavior from Sessions 3–4. No new public acquisition change or embedded AI feature.

## Task 1 — Simplify the working queue

**Files:** `app/dashboard/page.tsx`, `app/doctor/queue/queue-client.tsx`, `app/doctor/queue/queue-filters.tsx`, `app/doctor/queue/queue-table.tsx`, `components/doctor/approved-today-list.tsx`, `components/operator/test-data-banner.tsx`. Inspect existing summary/status helpers; do not add a second clinical parser.

**Interfaces:** Consume existing queue rows/counts, `recentlyCompleted`, `historyTruncated`, current filter callbacks, actor/capability props and `onBeforeLeaveChange`. Produce the same actions and data semantics in a bounded layout. No query, ownership, approval or provider contract changes.

- [ ] Capture active, empty/caught-up, loading/degraded and multi-owner queue states at laptop/mobile sizes.
- [x] Consolidate the header into search/filter controls, availability and a compact operational status control. Move turnaround detail into its existing operational summary; show oldest wait once.
- [x] Move the admin test-data control into a labelled admin menu while retaining a conspicuous banner whenever test data is active. Preserve its server authorization and reporting exclusions.
- [x] Make each row read patient → specific request → next task, with wait/age and exceptions supporting it. Keep clinical risk, purchased priority and another doctor's ownership distinct.
- [x] Collapse Approved today into an expandable footer while preserving actor-scoped results and its visibility on the caught-up dashboard.
- [ ] Check realtime updates: a newly completed/claimed/changed request must not steal focus, lose a draft or activate stale actions.
- [ ] Extend `dashboard-review-history.test.ts`, `doctor-queue-state.test.ts`, `doctor-queue-contract.test.ts` and relevant browser coverage before changing the corresponding behavior. Verify the collapsed heading/count, expand/collapse keyboard behavior, degraded/truncated labels and actor/protocol distinctions. Run the focused tests, inspect the rendered before/after states, review the diff and commit this task with its source documentation.

## Task 2 — Consolidate Requests/Ledger controls and actions

**Files:** `app/admin/intakes/intakes-ledger-client.tsx`, `app/admin/intakes/ledger-filter-selects.tsx`, `components/operator/cases/case-table.tsx`, `components/operator/cases/filter-bar.tsx`, `components/operator/cases/case-row.tsx`, `components/operator/cases/case-mobile-list.tsx`, and existing filter/route helpers. A shared menu, if extracted, belongs at `components/operator/cases/case-actions-menu.tsx` and only receives the existing caller's permitted actions and callbacks.

**Interface:** Separate visible column headings from sorting capability. The current caller does not pass `sortable`, so headings must not depend on enabling sorting or new server queries. Preserve existing server filtering and pagination semantics.

- [x] Keep the existing work lanes/filter presets, search and one Filters control with a readable active-filter summary. Consolidate service/status and density controls rather than stacking a second toolbar. User-configurable saved-view creation and new persistence are outside this scope.
- [x] Always display useful column headings, with explicit sorting controls only for actually supported sort fields.
- [x] Provide a labelled action menu for recovery/refund operations, keyboard and touch reachable without hover discovery. Retain all current authorization, payment-state and confirmation checks.
- [x] Use Patient details and Request record for ambiguous destination labels without renaming underlying canonical URLs.
- [ ] Test empty results, server query failure, stale pagination and a changed record. Failed reads remain visibly degraded, not an empty healthy list.
- [ ] Add the following regression inside the existing `CaseTable` describe block before changing headings. Its existing `rows` and `render` helpers supply owned synthetic data:

```tsx
it("renders column headings without enabling sorting", () => {
  const html = render(<CaseTable rows={rows} density="comfortable" />)
  expect(html.match(/role="columnheader"/g)).toHaveLength(4)
  for (const label of ["Patient", "Service", "Status", "Time"]) {
    expect(html).toContain(label)
  }
  expect(html).not.toContain("aria-sort=")
  expect(html).not.toMatch(/<button[^>]*role="columnheader"/)
})
```

- [ ] Run `corepack pnpm exec vitest run lib/__tests__/cockpit-case-table.test.tsx` and confirm that the new case fails on missing headings. Split the current heading render from its optional sort-button render, retaining the existing grid alignment. Keep `aria-sort` only on supported sortable columns. Re-run the test and add a browser assertion that filter changes preserve the server total/page rules and that the menu cannot trigger the row's primary navigation.
- [ ] Reuse the existing `replaceParams`, `toggleChip`, `setDensity`, `setRefundTarget`, `setFailedCheckoutCloseTarget` and `handleCopyPaymentRescue` callbacks. A shared row-action presentation must receive these callbacks rather than importing new payment services. Verify support masking and refund limits remain server-owned. Review and commit this task separately.

## Task 3 — Preserve place and reduce navigation friction

**Files:** `components/doctor/intake-review-panel.tsx`, `components/doctor/patient-profile-panel.tsx`, `app/doctor/queue/queue-client.tsx`, `app/admin/intakes/intakes-ledger-client.tsx`, `lib/doctor/queue-focus.ts` and `lib/dashboard/routes.ts`. Inspect `components/panels/panel-provider.tsx`, `app/doctor/doctor-shell.tsx`, `app/admin/intakes/page.tsx`, `app/layout.tsx` and `lib/supabase/auth-provider.tsx` for route/session lifetime. Extend the current state owner; avoid a new global store if component/session state already satisfies the contract. If the remount reproduction requires the bounded provider described above, place it at `components/operator/staff-list-navigation-provider.tsx`, with its pure snapshot/clearing rules at `lib/operator/cases/list-return-state.ts` and focused tests at `lib/__tests__/staff-list-return-state.test.ts`.

**Interface:** The existing review exposes `onBeforeLeaveChange?: (guard: (() => Promise<boolean>) | null) => void` and `flushNotes(): Promise<boolean>`. Reuse that boolean permission result before leaving. A return snapshot holds navigation intent only; current server reads and role/capability checks still own every actionable record.

- [x] Preserve originating list, safe filters, pagination and selected case when opening patient details or the request record and returning.
- [x] Keep private search terms in the authorized client/session state rather than the address bar; verify copied links and analytics contain no private search text.
- [x] Restore keyboard focus to the initiating row/action and scroll position where the record still exists. If it moved out of the result set, show the updated list with an intelligible status rather than selecting a different patient silently.
- [x] Preserve unsaved notes using Session 3's save/error behavior before navigation. Realtime updates and switching lists must not bypass that protection.
- [ ] Verify support/doctor/admin access separately, including direct URL entry and another doctor's ownership lock.
- [ ] Reproduce Queue and Requests → Patient details/Request record → back, including a non-first page and private synthetic search, before choosing a new state owner. Document whether the current layout survives each transition. Extend existing state ownership if it survives; use the bounded authenticated-memory contract above only for demonstrated remount loss.
- [x] Add behavior tests for account/session clearing, late responses after sign-out, changed-record return, stale pages and safe URL serialization. In browser tests, use synthetic search text such as `E2E Navigation Patient`; assert it is absent from the location, copied destination, localStorage/sessionStorage and telemetry requests while it remains visible in the returning search input. An authenticated search-action body is the approved transport and is not a telemetry leak.
- [ ] Exercise note-save rejection before ordinary links, row changes and list switching; ensure no destination opens until the save succeeds or the existing explicit recovery choice permits leaving. Preserve iframe tab-boundary focus handling. Review, test and commit the smallest navigation change with its documentation.

## Verification and final handoff

Extend relevant existing tests: `lib/__tests__/cockpit-case-table.test.tsx`, `lib/__tests__/admin-ledger-filters.test.ts`, `lib/__tests__/admin-ledger-server-contract.test.ts`, `lib/__tests__/dashboard-review-history.test.ts`, `lib/__tests__/doctor-queue-state.test.ts`, `e2e/dashboard.keyboard-safety.spec.ts` and `e2e/doctor.queue.spec.ts`.

Browser acceptance covers light/dark laptop/mobile, keyboard-only selection and action menus, safe URL inspection, search/filter/page return, empty/degraded queues, actor-scoped completed history, concurrent ownership and note-save failure. Existing patient-isolation, no-PHI-prefetch and route contracts remain required.

Use 1366×768 and 1440×900 desktop, plus 390×844 and 360×740 mobile in both themes. Capture only owned synthetic data. On shared Supabase, the admin dashboard requires `PLAYWRIGHT=1` and both `showTestData=1&onlyTestData=1` before loading. An ordinary doctor ignores those flags; use isolated data for Queue/Requests role comparisons or exact owned synthetic record/API routes for bounded role checks. Do not load a shared Ledger and then search for a fixture. Keep provider access discarded and notification/error-reporting credentials disabled according to the existing test harness. Use `http://localhost:3060` and preserve cleanup.

**Focused verification commands, after the merge gate and each relevant change:**

```bash
corepack pnpm exec vitest run lib/__tests__/cockpit-case-table.test.tsx lib/__tests__/admin-ledger-filters.test.ts lib/__tests__/admin-ledger-server-contract.test.ts lib/__tests__/dashboard-review-history.test.ts lib/__tests__/doctor-queue-state.test.ts lib/__tests__/doctor-queue-contract.test.ts lib/__tests__/dashboard-route-contracts.test.ts
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm doc:audit
git diff --check
```

Run the relevant `dashboard.keyboard-safety.spec.ts`, `doctor.queue.spec.ts`, `clinical-review-concise.spec.ts` and `doctor.prescription-ui.spec.ts` scenarios using the repository's isolated fixture/configuration path, with retries disabled for first-attempt acceptance. Keep #561's compiled-case selection and environment mapping intact; do not move cases back to development mode. Run the appropriate browser groups serially to avoid fixture interference and record exact passes/skips/failures. Do not claim all of a suite passed from a selected subset.

- [ ] Complete independent task and final branch review, address findings and run `corepack pnpm release:check` on Node 24/pnpm 10.23.0. Capture a small seeded before/after comparison in ignored `output/plan5-navigation/` and show it for owner review; machine proof does not supply acceptance.
- [x] Open a draft PR covering only this plan. Include Problem, Changes, Verification, Risk/Rollback, Compliance/Privacy impact and Env/Migration changes. Required CI and current release governance own readiness/merge; this preparation is not authorization to bypass them. No schema, secret or dependency change is planned.
- [x] If released under the applicable authorization, record exact tested head, merge/source, deployment and targeted smoke separately. Rollback is a governed revert of the navigation PR; it must not alter saved notes, payments or clinical outcomes. Hand off any unperformed release or owner action explicitly.

Complete the shared release protocol. Close implemented plan items, preserve still-maturing commercial checkpoints in ROADMAP, and give the operator one short list of remaining manual/evidence tasks. Do not claim improved clinician throughput without observing it or silently start a sixth build.

**Next-session prompt:** “Review the completed reliability/revenue/dashboard releases and the now-due measurement checkpoints in ROADMAP. Recommend the next supported variable; do not assume embedded AI, new channels or clinical model changes are approved.”

## Execution receipt

**Original preparation receipt, before the later start instruction.** ROADMAP, Plan 4's final release handoff, the current navigation owners and PR #561's branch receipt were inspected. No application code, clinical fixture, provider configuration, payment or audit remediation was changed. The preparation branch contains documentation only. The agent interpreted the later start instruction as lifting the original merge wait; the timing and unmet original before-first-edit gate are recorded above. Implementation and verification receipts follow separately.

**Planning verification:** `corepack pnpm doc:audit` passed on Node 24.15.0/pnpm 10.23.0: 10 documentation contract files, 124 tests; document count and references passed. `git diff --check` passed. Source review confirmed file/callback names and the admin/support Requests boundary. Runtime and browser checks are deliberately unrun before the dependency merge; no application behavior or visual acceptance is claimed.

### Implementation in progress — September 14

The operator’s later “just start plan 5” instruction was applied to an isolated branch from fetched `origin/main` at `79e1d8b837dac0d54a1944227608b3807a5351da`. PR #561 subsequently merged at September 14 **08:14:14 UTC**, commit `90beaaeab69b3173ec410484cd02058449a8e93b`; it was fetched and merged cleanly into this branch before return-state implementation. Live read-back confirms its build, E2E and Lighthouse checks succeeded. This task did not merge #561 or change its readiness evidence.

Queue presentation and Requests controls passed their independent task reviews. Return-state implementation through `6d30f1ae2` passed scoped review after correcting native history indexing, pending-search navigation and selection-commit races. The final browser suite uses a production-built app with disposable local Supabase, synthetic rows and discarded provider access. Its complete result and the independent whole-branch review remain pending.

The inherited readiness receipt identifies the existing production application at `1215e8e1a58be571e0884abeffd71893241748b7`; this is carried-forward release context, not a fresh Plan 5 deployment observation. The security/checkout audit, physical-phone check, owner visual acceptance and monitoring/alert-delivery evidence remain separate.

### Draft review handoff — September 14

Draft PR: [#563](https://github.com/reabal-n/instantmed/pull/563).

Runtime commit `cd5705828` passed independent final review. `release:check` passed after test-only correction `22802b4bb`: 782 test files, 7,806 tests passed, 122 skipped; lint, types, dependency/security/dead-code checks, production build and unchanged bundle budgets passed. Dashboard is 400/401 kB and Requests 236/260 kB. The later merge of `origin/main` (`ec532de32`, PR #562) changed readiness documentation only and preserves its outstanding gates. Documentation audit passed.

The 26-case disposable production-built browser run passed 22 cases, including failed-note Back, mobile navigation denial, account switching, removed selection, private search gating, scroll/focus, and mocked completion failure/success. Three failures were test selectors or an incorrect expected admin URL. One rapid Back before the record finished mounting left the list URL with late record content; attribution remains unresolved and is a release blocker. The final corrected settled-navigation run on spec `03b0a8a4e` passed 24/26 in 4.0 minutes: all four return flows, caught-up history, mobile denial and mocked completion passed. Requests recovery after failed/empty search and stale-last-page return failed at new assertion boundaries; their causes remain unresolved. Passing settled returns does not resolve the separate rapid-navigation edge. No further rerun was started.

After the operator raised time/token cost, verification expansion stopped. Selected existing keyboard/queue/clinical/prescription groups and live realtime delivery remain unverified in this run. Local production CSP blocks disposable Supabase realtime. The account-switch test alone bypasses CSP in its synthetic browser context; it does not prove production CSP compatibility. No production release, real clinical completion, owner visual acceptance, phone acceptance, monitoring-window acceptance or recipient delivery is claimed.

Decisions: real account/new-session changes reload the protected document to avoid old server-rendered data; ordinary token refresh retains the workspace. Private search remains memory-only. The initial merge-wait interpretation and its unmet before-first-edit condition are recorded above. The security/checkout audit remains separate. Keep this PR draft until the rapid-navigation concern and remaining required evidence are resolved.

### Focused blocker closure — September 14

Commit `3145c6fd9` removes empty-success messaging while Requests search is degraded, pending or awaiting debounce. The failed recovery test had accepted that stale empty heading before its new query ran. The stale-page test stopped during the second server read needed to clamp the vanished page; it now waits for the actual response sequence. Three focused production-built browser cases passed in 58.4 seconds. A separate forced pre-mount Back case held the record page chunk, asserted the packet was absent before traversal, released it afterwards and verified fresh list rows with no record packet; it passed in 22.4 seconds without a history implementation change. The earlier rapid-race attribution remains unproven, but the previously missing pre-mount regression now passes.

Focused units (28), typecheck and lint passed. The full release check remains the earlier 7,806-test receipt; no new full-suite pass is claimed. Required CI and scoped final review on this follow-up own merge readiness. The additional patient checkout/identity/catalog incident is on a separate branch and does not enter Plan 5.

Read-only monitoring refresh: observer version 2296 reports healthy, no coverage gap and no active incidents; natural first-attempt completions include September 14 06:19:01, 08:18:49 and 10:18:42 UTC. These partial-day observations do not close the fixed September 15 06:19:01 UTC endpoint or recipient-delivery/phone gates. No monitor reset, manual trigger or test notification was performed.


### Final release receipt — September 14

[PR #563](https://github.com/reabal-n/instantmed/pull/563) merged normally at **13:13:54 UTC**, after strict required `build` and `e2e` checks passed on head `d6388ffc217848c152790d05a8f1508ffafbdb43`. [CI run 34842449164](https://github.com/reabal-n/instantmed/actions/runs/34842449164) also passed Lighthouse. Its E2E groups passed 8 ops, 78 medical-certificate, 116 paid-clinical, 1 mobile handoff, 5 signed-resume and 7 production-regression cases. This is the configured blocking selection, not every repository E2E spec.

The final CI repairs were confined to synthetic fixtures: the login helper now supplies and verifies the navigation-session cookie even when the server starts before worker setup; responsive clinical tests wait for a single settled row; fallback synthetic prescribing profiles include sex. Production session, identity, audit and rate-limit guards were unchanged. Scoped independent review, 39 focused tests, typecheck and lint passed. The last isolated local browser run remains **7 passed, 1 failed**: its failed-save behavior assertions passed, but an audit endpoint returned 503 because that runner deliberately lacked Redis. Later successful CI is separate evidence; it does not rewrite that local result or prove provider delivery. Local CSP bypass was limited to the disposable loopback Supabase context.

Merge/source SHA **`1122d772c2cc2c8921df7ec89d215f18a8776a28`** is verified on production Vercel deployment **`dpl_3DS7cNUGwK7bh5BFDauucZDDwEKg`**, `instantmed-6ix4qvaz4-rey-project.vercel.app`, state **READY**, with `instantmed.com.au` and its production aliases attached. At **13:19:46 UTC**, unauthenticated smoke returned 200 for `/` and the weight assessment entry; `/dashboard` and `/admin/intakes` redirected to their scoped sign-in URLs; `/doctor/queue` redirected to the canonical dashboard review queue. This smoke proves public/authentication routing only. No authenticated production patient list or provider action was accessed.

Source and browser receipts were copied and content-verified into the main checkout's ignored `output/plan5-navigation/` before deleting the merged implementation branch/worktree. `evidence/production-release.json` and `evidence/ci-passed-release.log` retain the production and CI observations. The earlier incomplete identity-rail interaction remains a separate unconfirmed observation; it was not repaired or accepted by this navigation release. Rollback is a governed revert of #563, preserving saved notes, clinical outcomes and payment state. No environment, migration or dependency change was part of Plan 5.

**Remaining gates:** owner visual acceptance and the deferred physical-phone check remain unaccepted. The separate readiness owner retains the fixed September 14 06:19:01 UTC → September 15 06:19:01 UTC monitoring window, maximum gap 150 minutes, and Sentry recipient-inbox evidence. No window reset or test notification occurred. The checkout/weight repair in #564 and broader attached audit remain separate workstreams. Unchecked preparation or compound acceptance items above are not retroactively certified by the release. No clinician-throughput or conversion improvement is claimed, and Plan 6 is not started.

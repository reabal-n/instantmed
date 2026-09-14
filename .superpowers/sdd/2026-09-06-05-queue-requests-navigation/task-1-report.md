# Task 1 report — Simplify the working queue

Implementation and focused checks complete. Browser acceptance remains pending with the root agent; this report does not claim Task 1 visual sign-off or a release.

## Changes

- Queue search/filter controls now accept a server-composed controls slot containing availability, a labelled Operational summary popover, existing admin-only system health and a labelled Admin menu. Turnaround detail and the existing live oldest-wait signal live in the operational summary. The operational signal no longer uses the old reviewing-state CSS selector that hid the header strip. The clock implementation and jump-to-oldest action remain unchanged.
- Admin menu uses the existing Radix dropdown primitive. Test-data authorization, query parameter preservation and reporting exclusions remain unchanged. Corrected the conspicuous banner to “Test patients are included.” The previous “Real patients are hidden” was false for the normal mixed-data opt-in; the new wording is true for both mixed and local seed-only scopes.
- Compact rows show patient and age, specific service request, then the existing next-action helper output. Clinical risk and live-consult badges, purchased priority, ownership, identity and handoff exceptions remain distinct. Another doctor's ownership uses neutral styling and an explicit Reviewing label rather than the priority warning fill.
- Approved today uses native details/summary, collapsed by default, with keyboard semantics supplied by the browser. Its bounded list preserves actor/protocol distinctions, flags and activity timestamps. Truncated/degraded data shows a subset label; unavailable history remains visible even when no rows were returned. The footer appears for active mobile queues as well as caught-up views.
- Added only the controls ReactNode prop to queue types. No Requests, navigation lifetime, queries, clinical parser, ownership actions, note guards or Parchment workspace changes.

## Doctrine and review

Read task brief, project AGENTS/wiki, UI and clinical safety skills, onboarding, design/brand/voice and clinical doctrine. Applied TDD and React review proportionally. Existing Button, Popover, DropdownMenu and native details patterns govern implementation. Reviewed the diff and existing realtime update/selection code: new presentation changes do not add focus effects, selection changes, mutations or event subscriptions. Existing guarded selection and clinical server actions are retained. Added a realtime-state test confirming another row's ownership update preserves untouched row identity and ordering. This does not prove the full realtime browser interaction.

## Tests

Initial RED:

`corepack pnpm exec vitest run lib/__tests__/approved-today-list.test.tsx lib/__tests__/dashboard-review-history.test.ts lib/__tests__/doctor-queue-state.test.ts lib/__tests__/doctor-queue-contract.test.ts lib/__tests__/dashboard-simplicity-performance-contract.test.ts`

Result: 7 failed, 92 passed; failures covered collapsed history, degraded history, grouped controls, mobile active-history visibility and row hierarchy. No production edit preceded these tests. The new provenance/state regression cases already passed because those behaviors are preserved.

Additional RED:

`corepack pnpm exec vitest run lib/__tests__/test-data-toggle-contract.test.ts lib/__tests__/doctor-dashboard-minimal-contract.test.ts`

Result: 1 failed, 18 passed, on the misleading mixed-data banner wording.

Final GREEN:

`corepack pnpm exec vitest run lib/__tests__/approved-today-list.test.tsx lib/__tests__/dashboard-review-history.test.ts lib/__tests__/doctor-queue-state.test.ts lib/__tests__/doctor-queue-contract.test.ts lib/__tests__/dashboard-simplicity-performance-contract.test.ts lib/__tests__/test-data-toggle-contract.test.ts lib/__tests__/doctor-dashboard-minimal-contract.test.ts`

Result: 7 files, 118 tests passed. Existing source contracts updated where the authorized UI changes replaced header tiles/action chips/toggle names; role and authorization assertions remain.

`corepack pnpm typecheck`: passed after fixing the duplicated lazy-history prop type and retaining the existing barrel export compatibility alias.

Focused ESLint over all 14 changed TS/TSX source/test files: passed with no warnings. `git diff --check`: passed.

## Browser handoff and limits

No shared database fixtures run. Root owns e2e/plan5-navigation.spec.ts and local disposable-Supabase browser verification. Baseline is preserved by root from 01a6e665b. No screenshot or keyboard interaction is claimed from static markup tests.

Selectors: `[data-approved-today] > summary` (Enter/Space toggles native `open`), `[data-queue-request]`, `[data-queue-next-task]`, `[data-queue-ownership="other"]`, `[data-queue-ownership="you"]`, button `Operational summary`, button `Admin menu`, menuitem `Show test patients` / `Hide test patients`. Admin menu intentionally remains absent in the existing local `onlyTestData` capture mode. Use disposable local ordinary-admin scope to verify it safely.

Still required before integrated sign-off: active, caught-up, loading/degraded, multiple owners at laptop/mobile and light/dark; history collapse/expand keyboard and focus retention; truncation/protocol distinctions; Operations keyboard interaction and oldest case jump; claim/completion realtime updates while notes are dirty; overflow and viewport density. Full suite/build/release checks belong to root after all tasks integrate. The footer disappears when successful history contains zero approvals, matching its prior empty-success behavior; unavailable history explicitly remains visible.

## Review fix round 1

Addressed both P2 operational-signal findings in task-1-review.md. The single existing live QueuePressureSignal now sits visibly beside the compact Operations trigger; the popover retains turnaround detail and contains no duplicate wait value. Added opt-in `showLabelOnMobile` to the signal (default false preserves other consumers), enabled on the dashboard so Oldest wait stays visibly labelled at narrow widths. Its existing pressure severity, timer/hydration behavior, accessible jump-to-oldest action and authorization are unchanged. Compact dashboard presentation hides trailing refresh/count detail and uses a 44px mobile button height.

RED: `corepack pnpm exec vitest run lib/__tests__/queue-pressure-signal.test.ts lib/__tests__/dashboard-simplicity-performance-contract.test.ts` — 2 failed, 31 passed. Failures specifically proved the mobile label had hidden classes and the only pressure signal was inside the popover.

GREEN: `corepack pnpm exec vitest run lib/__tests__/queue-pressure-signal.test.ts lib/__tests__/dashboard-simplicity-performance-contract.test.ts lib/__tests__/doctor-queue-contract.test.ts lib/__tests__/approved-today-list.test.tsx` — 4 files, 93 tests passed. Rendering test also checks urgent pressure, one counter and retained jump accessible name. Source contract verifies one signal outside collapsed content. `corepack pnpm typecheck` passed. Focused ESLint for the four edited TS/TSX files passed without warnings; diff check passed. Self-review confirmed no timer/state changes or duplicate signal.

Root still owns browser proof, especially actual mobile wrapping with the now-visible signal and availability/admin controls. No browser or production claim is added by this round.

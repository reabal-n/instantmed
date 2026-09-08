# Session 3 — Concise clinical review and notes

> **For agentic workers:** Use `superpowers:executing-plans` and the project UI/clinical skills. Work only this session plan. Follow the [ROADMAP session protocol](../../ROADMAP.md#sequential-build-session-protocol).

**Goal:** Let the clinician understand the current request and prescribing regimen immediately, clarify missing information and edit a coherent note without losing work.

**Architecture:** Extend the existing `ReviewPacket`, `IntakeReviewCockpit` and `IntakeReviewPanel`. Dashboard, Ledger and full request routes already share these; do not introduce another review framework. Preserve single-column review with progressive disclosure for notes and history rather than reintroducing Request/Notes/History tabs.

**Tech stack:** Pinned React 18/Next.js 15.5, TypeScript, shadcn/Radix and existing Source Sans 3/design tokens; no decorative portal motion.

**Spec/design brief:** [ROADMAP](../../ROADMAP.md), rank 2; [DESIGN](../../../DESIGN.md), [PRODUCT](../../../PRODUCT.md), [CLINICAL](../../CLINICAL.md). On Sep6 the operator identified concise clinical information as the main pain: medicine name, dose and frequency must be visible in the prescribing modal, with layout decisions delegated to the implementer.

**Status:** Implemented, merged and deployed on 2026-09-09 through PR #541. Local release checks, independent review, exact-head CI and production smoke passed. Release sign-off remains pending: the automatic public-funnel review scored 7/10 against its 8/10 acceptance target, requiring an explicit operator exception under OPERATIONS and the ROADMAP protocol. No exception has been recorded. Session 2's release handoff was read before implementation; its commercial measurement continues independently. Sessions 4–5 remain unstarted.

## Design direction and acceptance scene

A clinician reviews repeated requests on a laptop, often alongside prescribing software, and occasionally uses a phone. The workspace should feel calm, compact and dependable. Keep Morning Canvas/light default and full dark-mode support, with the existing portal typography and controls. Linear's hierarchy and Stripe's readable density are references; the existing design system decides actual tokens.

Production UI is the deliverable. At 1366×768, current identity, requested medicine/strength, dose/directions, frequency, indication and the next action must be readable without opening an extra details control. Long clinical text wraps and remains accessible; no safety information is truncated to achieve that screen target. Mobile at 390×844 keeps identity and the primary action accessible while the clinical content scrolls.

## Global constraints

- Clinical and intake answers remain source-faithful. Do not infer a regimen, convert an indication into a diagnosis, or infer that “No conditions” means “no other conditions.”
- Keep patient answers, saved history and clinician findings clearly separate. Missing, not asked, explicit negative and conflicting recorded values are distinct states.
- Use one current prescribing-state presentation. Actual risk, missing required information and genuine delivery/recovery failures remain prominent; ordinary unfinished prescribing is neutral work.
- Preserve durable note persistence, draft status, record ownership, doctor capabilities, audit logs and `script_sent` completion guards. No clinical outcome is automatic.
- Preserve the full questionnaire and dated history within one disclosure action. Do not hide essential current-request facts behind hover, icons or new tabs.

## Task 1 — Make the current request concise and complete

**Files:** `lib/clinical/review-packet.ts`, `components/doctor/review/request-info-card.tsx`, `components/doctor/review/intake-review-cockpit.tsx`, `components/doctor/intake-review-panel.tsx`, `components/doctor/review/review-blockers-strip.tsx`.

**Interface:** Extend existing packet fields only when a fact is currently missing. Preserve their provenance and empty-state semantics; consumers must not reinterpret missing values as negative answers. Reuse existing prescribing-context normalization rather than adding a second clinical parser.

- [x] Capture the existing seeded review at laptop and mobile sizes, including long medicine names/directions, two medicines, positive safety answers and absent responses.
- [x] Put the complete medicine name and strength together. Give the current regimen a full-width readable line; show dose and frequency separately when explicitly captured, otherwise retain the original directions and label the uncaptured field truthfully.
- [x] Show indication adjacent to the regimen. Replace the equal four-column competition and dot-separated negative sentence with compact labelled safety rows.
- [x] Keep positive findings, required missing information and actual recorded contradictions visible. For an indication alongside a negative conditions answer, show both sources for clinician reconciliation; do not invent a semantic contradiction detector.
- [x] Retain certificate and specialty variants: certificate purpose/dates/symptoms; specialty assessment details. Do not force a medication template onto every service.
- [x] Verify identical clinical facts across queue panel, Ledger panel and full admin/doctor request record.

## Task 2 — Expose prescribing context in the current modal now

**Files:** `components/doctor/parchment-prescribe-panel.tsx` and the existing prescribing-context helper located by `lib/__tests__/parchment-prescribing-context.test.ts`.

**Interface:** Consume the same source fields as Task 1. Medicine and frequency/copy controls already exist in the modal; dose is currently inside Request details. This task changes visibility and hierarchy, not provider behavior.

- [x] Show medicine/strength, dose/directions, frequency and indication together above the existing iframe without expanding Request details.
- [x] Keep full-regimen display separate from medication-search copy. Preserve the existing verified generic-name-only resolution and safe patient-entry fallback for the medication search control; do not replace it with a medicine/strength/dose bundle. Separate directions/frequency copy controls preserve their exact source units and qualifiers and never synthesize a prescribing instruction.
- [x] Keep missing/long/multiple regimens readable and permit the reference content to expand on small screens without covering the close action.
- [x] Preserve the existing iframe width and lifecycle for this release. Session 4 owns spatial enlargement, so the immediate clinical-summary improvement does not wait for it.

## Task 3 — Restore clarification and simplify routine status

**Files:** `app/doctor/queue/queue-table.tsx`, the existing queue actions, cockpit action area and blockers strip. Reuse the existing request-information action/dialog; the compact-layout exclusion currently hides the general control.

- [x] Put a labelled Request information action inside the compact review, with existing authorization, message validation and durable outcome behavior. `app/actions/request-more-info.ts` currently permits `paid`, `in_review` and `pending_info`; enable only for supported states and explain unavailability elsewhere. Clarification after `awaiting_script` is a separate explicitly specified/tested transition, not permission to expose an action that will fail or silently alter lifecycle rules in this task.
- [x] Keep the current clinical phone affordance obvious; clicking it must not mark a required consultation completed or create a new call-outcome workflow.
- [x] Show one neutral ready/pending/recorded/completed status. Completion remains visible but disabled with one explanation until durable prescription evidence exists.
- [x] Keep the audited external-prescription fallback under labelled secondary/recovery options. Do not turn it into the default prescribing path.
- [x] Keep decline accessible with the exact current refund consequence and reason in its confirmation; remove repeated everyday refund text only where the confirmation retains it.
- [x] Verify another doctor's ownership, capability restrictions, send failure, delayed confirmation and stale state. No enabled-looking action may bypass its server guard.

## Task 4 — Make the note one readable document

**Files:** `components/doctor/clinical-case-review.tsx`, current draft-save hooks/actions used by that component, `components/doctor/review/intake-review-cockpit.tsx`.

- [x] Replace four tiny internally scrolling SOAP boxes with vertically arranged sections that expand to their content. Keep one primary scroll area for the open note view and preserve the patient/critical-context strip.
- [x] Show Saving, Saved and Save failed beside the note title, using the existing persistence state. Retain generated content as Draft; saved does not mean signed.
- [x] Preserve edits through note/history disclosure, Parchment open/close, patient details and request navigation. Save failure must keep recoverable content and a clear retry, not silently navigate away or reset the editor.
- [x] Preserve SOAP field storage and clinician-authored content. Do not swap the app model, auto-sign notes or rewrite clinical boilerplate in a way that changes its meaning.

## Verification and handoff

Extend `lib/__tests__/review-packet.test.ts`, `lib/__tests__/clinical-case-review-render.test.tsx`, `lib/__tests__/intake-review-cockpit-no-tabs.test.tsx` and `lib/__tests__/parchment-prescribing-context.test.ts` for changed behavior. Use the existing dashboard keyboard and prescribing E2E harnesses for real interactions.

The browser matrix includes laptop/mobile, light/dark, keyboard focus, long content, explicit negatives/missing/uncaptured values, contradictory source answers, draft save failure, another doctor's lock, delayed/failed provider confirmation and external fallback. Use seeded data. Show the operator a compact before/after review set; screenshots prove layout, while interaction assertions prove saving and completion guards.

Follow the shared release protocol. Record the accepted field hierarchy and summary consumers for Session 4. No new shared abstraction is justified solely by file size.

**Next-session prompt:** “Execute Session 4, Room to prescribe, from ROADMAP. Preserve Session 3's accepted clinical summary and note persistence; improve the surrounding Parchment workspace only.”

## Execution receipt

### Scope and implementation

Started from refreshed `origin/main` `c088a64f812b2c0e4ee00fb8fec9e214f1417a26`. The operator separately requested merging all existing work, so integration commit `201d10dc4` preserves local project-skill commits `eed034d39` and `17aa2827f`; `be86036da` fixes their reviewed routing references. This session implements Plan 3 only. Plan 2's commercial observations and historical clinical cases retain their existing owners and boundaries.

| Work | Commits | Task review |
|---|---|---|
| Source-faithful request facts and compact identity | `ce0dc0e46` | Approved |
| Visible prescribing context and exact source copy | `a26ca9e7e`, `ef738914b` | Approved after specialty-context correction |
| Clarification, accurate status and accessible actions | `4ccc7217d`, `b9011b1f9` | Approved after draft-retention/inactive-status corrections |
| Readable note and preserved edits | `98c983548`, `1a8ec9b4e` | Approved after held-autosave/navigation-race corrections |
| Integrated regression coverage and release cleanup | `5843f45da`, `f7984dcb0`, `110d99fdb` | Approved |
| Optional profile loading and retry | `44e67c914` | Approved |
| Response-aware browser assertions and CI capacity | `e14acf763` | Approved |
| Transitive security patch | `04fc8cd66` | Approved |

The existing `ReviewPacket`, `IntakeReviewCockpit` and `IntakeReviewPanel` remain the common review path. The accepted engineering hierarchy is complete medicine/strength/form, full original directions, truthful separately captured frequency state, adjacent source indication and labelled source safety rows. Specialty references retain template provenance and their existing assessment facts. Medication-search copy remains separate from exact directions copy. The questionnaire and dated history remain disclosed within the same review.

SOAP is a vertically expanding document within the existing content scroll. Saved notes remain distinct from generated drafts; save status never establishes sign-off. Exact authored text, including whitespace, ambiguous marker lines and deliberately cleared notes, survives the guarded review transitions. Clarification and clinical decisions preserve pending notes before their existing actions. Clinical decisions also prevent editing or replacing the review while awaiting a result. Ownership, capabilities, encryption, audit and durable `script_sent` completion guards remain authoritative.

### Local proof and limits

The final tested head is `04fc8cd669bbdc3b7ac58181fdea0d0f0d14c365`. Full `release:check` passed on Node `24.15.0` and corepack pnpm `10.23.0`: 7,563 unit tests passed and 122 skipped (764 files passed, one skipped), lint/typecheck, strict integration configuration checks, security audit with no known vulnerabilities, dead-code ratchet, production build and route bundle gates. The final build took 70 seconds. Framework/runtime pins and bundle budgets are unchanged; the lockfile changes only transitive provider-utils 4.0.27 → 4.0.33 and its required provider 3.0.12, while direct SDK parents and application models/providers remain unchanged. Six offline real-SDK regressions demonstrate normal responses plus oversized success/error rejection and cancellation.

The local dashboard first-load bundle is 384 kB against the unchanged 401 kB cap. CI measured 377 kB in its own environment; the two numbers are separate build receipts. The same-environment clean `origin/main` baseline measured 402 kB and Plan 3 before the final fix measured 403 kB; the full earlier overage was not introduced by this plan. The profile/timeline module now loads at explicit open, with local retry and cancellation. `/request` remains within its 180 kB first-load cap at 179 kB; its 35.8 kB unique-route estimate is an existing advisory warning.

Final integrated local Chromium passed 24/24 tests in 2.9 minutes with retries disabled: 15 concise-review cases plus existing prescribing, keyboard and note-save regressions. Both synthetic-data teardowns succeeded. The later profile delta added a sixteenth committed concise-review case; it passed separately, proving a failed chunk stays local, Retry succeeds and exact note bytes survive. The profile cancel/reopen matrix passed 3/3 and the explicit `html.dark` mobile rerun passed. Its final six-file focused suite passed 91 tests. The subsequent CI synchronization correction passed 10 affected/recovery cases locally. Holding real successful responses beyond the old assertion waits reproduced three failures; all three passed with bounded response/body synchronization. The durable message-count and profile/history assertions remain. These local results are distinct from the required CI run below.

Seeded browser proof covers 1366×768 and 390×844, light/dark, reduced motion, long/multiple medicines, source negatives/missing/conflicting answers, exact directions copy, clarification failure/reopen, ownership, delayed script evidence, long notes, real whitespace/marker typing, cleared notes, failed saves/retry and held-save/decision races. The same full-record facts were checked for admin and ordinary-doctor routes. Existing synthetic prescribing tests retain actual application lifecycle mutations with external delivery suppressed.

One diagnostic observed an existing queue wait-time hydration warning at a minute boundary. `QueuePressureSignal` and its dashboard caller are unchanged from the starting main; the warning was neither suppressed nor fixed in this plan and did not recur in the final 24-test run. Earlier scratch selector/caret setup failures and the rejected first profile-loader retry approach are recorded in the local reports; only the final passing evidence is acceptance proof.

Only admin dashboard sessions with both `showTestData=1` and `onlyTestData=1` are seed-scoped. Ordinary-doctor proof uses exact owned synthetic full-record/API routes. Early scratch captures with an incorrect dashboard boundary were removed; retained visual comparisons are synthetic-only. Ledger shares the same review consumer and packet, but direct Ledger browser parity remains unverified because initial rendering has no safe seed-only boundary on the shared database. No production isolation bypass was added.

The preserved comparison set is `output/plan3-clinical-review/index.html` in the primary checkout, with final review, profile loading/recovery captures and safe reports in its `evidence/` directory. Screenshots establish layout at the captured state; interaction and persisted-record assertions establish behavior. Agent visual inspection does not establish operator eye acceptance, physical-device input or live Parchment execution. Configuration validation is not provider execution, and unauthenticated production smoke does not prove a live clinician outcome.

### Implementation decisions and costs

| Decision | Reason and cost |
|---|---|
| Label frequency as uncaptured when there is no separate source field | Avoid narrowing qualified free-text regimens. The clinician reads the original directions instead of a frequency shortcut. |
| Add an optional source-preserving medicine display mode | Existing normalization dropped form/per-actuation wording. Internal labels may be more literal or redundant; defaults remain protected. |
| Compact the shared identity strip | Keep identity and actions accessible in the bounded review. Density may need a small operator adjustment. |
| Preserve an explicitly saved empty note as an empty string | Prevent regenerated boilerplate after a deliberate clear. Existing nulls remain indistinguishable; a consumer relying on empty-as-null may need a bounded correction. No backfill or schema change. |
| Load the optional profile/timeline on explicit open | Restore the existing initial-load budget. The first open may briefly show a closeable loading state; failures offer local Retry. Only component code is cached, and cancellation cannot reopen a closed profile. |
| Allow 50 minutes for the required serialized E2E job | Two recent successful main runs already took about 35.5 minutes; this plan adds 16 cases. Preserve one worker, fixture serialization, every test and assertion while retrying cases individually. A stalled job can consume ten more minutes. |
| Apply the exact v4-scoped provider-utils 4.0.33 security patch | The refreshed GHSA-866g-f22w-33x8 advisory blocked the unchanged release audit. Offline public SDK regressions protect compatibility, but a transitive regression could disrupt drafting; oversized responses now fail explicitly. |

### Release gate and production receipt

| Boundary | Evidence |
|---|---|
| Starting remote main | `c088a64f812b2c0e4ee00fb8fec9e214f1417a26` |
| Tested branch head | `04fc8cd669bbdc3b7ac58181fdea0d0f0d14c365` |
| Independent review | Complete range `c088a64f8..04fc8cd66` approved, including QA, cleanup, profile loading, CI synchronization and the security delta; no Critical or Important findings |
| Required PR CI | [Run 34257752386](https://github.com/reabal-n/instantmed/actions/runs/34257752386): build, Lighthouse and required E2E passed on the final head; E2E took 39m19s. Ops 8 passed/1 skipped; certificate readiness 79 passed; paid clinical flows 99 passed/3 flaky; mobile follow-on 1 passed; signed guest resume 5 passed. Three cases passed on retry: two timed out during test login/setup, and the note test exceeded a response wait plus a later 5-second persistence poll while serialized follow-up saves were in progress. The final attempt passed exact final-text persistence, two-save and reopening checks. Failed-attempt traces were unavailable; their final durability is unconfirmed. Source review and prior held-save regressions found no demonstrated product defect, so these are recorded as timing-supported flakes, not a pristine first-attempt run. |
| Runtime merge | [PR #541](https://github.com/reabal-n/instantmed/pull/541), merge `19ac621bb899af6fec12ed3d50ca81825f0c1176`, 2026-09-08T18:26:42Z |
| READY production | `dpl_DViejYK5qyTwheCoD3g7C7VLiR3v`, source `19ac621bb899af6fec12ed3d50ca81825f0c1176`, ready 2026-09-08T18:30:19.646Z, alias `instantmed.com.au` |
| Post-deploy public smoke | [Run 34263428455](https://github.com/reabal-n/instantmed/actions/runs/34263428455) passed against runtime merge `19ac621bb`; the critical public-surface smoke completed 2026-09-08T18:30:34Z. Only workflow metadata was inspected; no canary payload is retained here. |
| Dashboard authentication smoke | `corepack pnpm smoke:prod-dashboard` exited 0: unauthenticated `/dashboard` redirects without global error text. This proves the authentication boundary, not a clinician outcome. |
| Automatic video review | [Run 34263428345](https://github.com/reabal-n/instantmed/actions/runs/34263428345) completed successfully against `19ac621bb`. Capture `2026-09-08-paid-funnel-t9wv`: Gemini 6/10, Claude 7/10, synthesized 7/10; the >=8 acceptance checkbox is unchecked. Product-quality acceptance remains pending an explicit operator exception. Capture reaches Review & pay with consent selected and Pay visible; it does not click Pay or establish hosted-checkout/payment success. |
| Main CI | [Run 34263074435](https://github.com/reabal-n/instantmed/actions/runs/34263074435) repeats the runtime merge: build and Lighthouse passed; E2E was still running when this receipt was prepared. The already completed required PR run above owns runtime acceptance. A documentation-only merge may supersede this repeated main run under the existing concurrency policy. |

The automatic review's low score is a release-quality gate under [OPERATIONS](../../OPERATIONS.md#current-release-gate-updated-2026-06-12), even though its workflow succeeded. Independent inspection found cosmetic concerns in the unchanged public homepage/intake: generous hero spacing, overlapping decorative mockups, wrapped summary values and existing copy punctuation. The selected public source paths are unchanged between prior production `8bd1d6ace` and runtime merge `19ac621bb`; no broken flow or Plan 3 regression was established. The capture ends before Pay, so it cannot establish payment behavior. Unsupported suggestions for invented wait times, legal claims or removal of consent were rejected. No public redesign, repeated scoring run or gate relaxation was undertaken. The operator has been asked for a narrow exception for this 7/10 result; release sign-off stays pending until that decision is recorded. This does not authorize a paid-traffic change or begin Plan 4.

Earlier run 34248097217 passed build/Lighthouse but exceeded the former 40-minute E2E job limit; its delayed-response assertion failures were reproduced and corrected. The later run 34255902221 stopped at the refreshed `@ai-sdk/provider-utils` advisory (GHSA-866g-f22w-33x8); its security gate was preserved and the transitive dependency patched. Neither earlier run is used as the final acceptance result.

Branch protection was verified before merge: PR-only main, strict required `build` and `e2e`, with no bypass. The merge commit preserves original local skill commits `eed034d39` and `17aa2827f` as ancestors. Preview checks were skipped by the repository's preview policy and do not constitute preview browser proof.

Prior production was READY deployment `dpl_5C2SyJYztksVgur5S6kQBcLTgRav`, source `8bd1d6ace476943bc644fb1d7716b8ad7e4be240`, ready `2026-09-07T18:04:14.472Z`. Roll back the Plan 3 runtime commits through a governed PR if required; the earlier skill consolidation is separable. A code rollback does not undo notes, clarification messages or clinical outcomes already saved. No environment or schema migration or backfill is included. The transitive security patch is separable, but reverting it restores the audited vulnerability and fails the unchanged security gate.

The primary `main` checkout was fast-forwarded to runtime merge `19ac621bb`, and a frozen install passed. The merged runtime feature branch and the temporary bundle-baseline worktree were removed. Visuals, safe reviews and release logs are preserved outside the disposable worktree at `output/plan3-clinical-review/` in the primary checkout. The documentation handoff uses a separate protected PR. Its final main synchronization and merged-branch/worktree cleanup will be recorded in `output/plan3-clinical-review/evidence/release-state.json` after that PR merges; only merged work is eligible for removal.

### Next-session handoff

Session 4 must consume this source hierarchy, separate search-name/directions copy, draft/save distinctions, guarded note transitions and durable prescription evidence. It owns larger usable Parchment space and return-state/mobile geometry; this session does not implement that work. Use the next-session prompt above after the release gate is complete.

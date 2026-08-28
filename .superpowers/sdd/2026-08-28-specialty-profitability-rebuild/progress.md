# SDD ledger — plan: docs/superpowers/plans/2026-08-28-specialty-profitability-rebuild.md

## Setup

- Branch: `codex/specialty-profitability-rebuild`
- Plan draft commit: `9bb139866`
- Fable revision commit: `37f06e859`
- Implementation base: `37f06e859`
- Final review base: `5ec9d6490` (branch point; excludes inherited `codex/serp-sitelinks` work)
- User-owned untracked path preserved: `output/`
- Task 0: complete (commits 9bb139866..37f06e859, Fable REVISE findings resolved)
- Task 3: complete (commits 37f06e859..d8a836af0; fix round 1 corrected future-version lifecycle semantics; independent re-review spec compliant and approved)
- Task 4: complete (commits d8a836af0..c308aa767; fix round 1 repaired guest PaymentIntent parity, persisted-truth precedence, and runtime coverage; independent re-review spec compliant and approved; local-only PostgreSQL harness plus local DB lint remain pre-apply gates because Docker/Supabase is stopped)
- Task 5: complete (commits c308aa767..f7e833ea9; fix round 1 repaired lazy-analytics readiness and strict relative-CTA handling; independent re-review spec compliant and approved)
- Task 6: complete (commits f7e833ea9..8ebff62b5; Hair H1 shipped; fix round 1 strengthened shared validation and semantic Hero browser proof; independent re-review spec compliant and approved)
- Task 7: complete (commits 8ebff62b5..e0109637e; ED E1 shipped; fix round 1 exposed the rendered 24/7 FAQ, restored stress reflow, and proved direct Hero adjacency; independent re-review spec compliant and approved)
- Task 8: complete (commits e0109637e..2272d66df; prescribing identity canon and public mirrors aligned; fix rounds repaired missed public/imported mirrors, stale money-page and consult contracts, awkward shared wording, a contradictory project-brain paragraph, and an invalid evidence path; independent final re-review spec compliant and approved; 104 focused tests passed)
- Task 9: complete (commits 2272d66df..a3ee37b87; Hair reproductive safety now has shared server, completeness, recovered-guest, retry, and duplicate-guest payment parity; fix round closed the authoritative-answer duplicate recovery bypass before every Stripe branch; independent re-review spec compliant and approved; 193 focused review tests and 374 implementer matrix tests passed)
- Task 10: complete (commits a3ee37b87..03f706d5f; deterministic zero-order click investigation/pause gates now execute without mutation; Hair uses 10/20 and ED/Women 10/30 boundaries while generic A$150 loss precedence remains and A$60 relaunch loss stays inactive pending campaign-scoped evidence; fix round restored already-paused HOLD precedence across the mid-band; independent re-review spec compliant and approved)
- Task 11: complete (commits 03f706d5f..c5bdca160; real-browser proof exposed and repaired 200%-zoom header/H1 reflow, fresh-entry and hydrated cohort-ownership races, a stale ED CTA contract, and an unavailable-banner occlusion; independent final re-review PASS with no P0/P1/P2 findings; Hair remained six screens and ED five, both safe flows reached Review/Pay without payment, terminal correction and IHI/address gates passed; the originally unavailable exact local Chromium revision was resolved during Task 12 and the final relevant slice passed)
- Task 12: complete (commits c5bdca160..f70dde20e; final fix rounds closed inactive/future ingress, availability analytics/contact semantics, the Weight hydration skip, authoritative-null/query-error ownership, and pending-click attribution; independent broad and marketing re-reviews returned KEEP with no P0-P2 findings; 334 focused tests, lint, typecheck, build, both audits, the 488-page build, and the final 7/7 Playwright slice passed; the full repository remains held only by one inherited portfolio assertion, and the local SQL harness remains a pre-apply gate because Docker is stopped)
- Baseline: `corepack pnpm test` = 6,345 passed / 1 inherited failure in `portfolio-art-direction-contract.test.ts`; `codex/serp-sitelinks` moved homepage links to `BRANDED_SEARCH_LINKS` without updating that source-shape assertion. Specialty work must not add failures; this parent-branch failure remains outside scope.

## Pre-flight rulings

- Ruling: use the existing dedicated `codex/specialty-profitability-rebuild` branch in the shared checkout instead of creating a second linked worktree — the user explicitly authorised implementation in this task, the branch is not main, and a second worktree would hide the user-owned untracked `output/` context from the shared workspace — cost if wrong: implementation shares the current checkout, though all scoped changes remain isolated in commits.
- Ruling: Task 1 invariant tests and Task 2 prescribing-identity tests execute inside the implementation task that makes each test green, rather than leaving the branch intentionally failing across several commits — strict RED evidence still precedes production code and is recorded in each report — cost if wrong: there is no standalone red-only commit, but every behavior still has witnessed RED/GREEN proof.
- Ruling: product-version profitability is a sequential-window inference, not a randomized causal claim — opening/closing receipts and contamination rules are mandatory — cost if wrong: residual time effects may remain even when controls are unchanged.

## Pre-flight task/interface scan

| Task(s) | Producer -> consumer / self-check | Finding or ruling |
|---|---|---|
| 0 | Spec/plan -> all tasks | Complete after Fable review; spec is binding. |
| 1 -> 3,6,7,9,10 | Invariants -> registry, pages, safety, Ads | Execute the relevant RED contract with the consuming task; do not leave long-lived red HEAD. |
| 2 -> 8 | Identity truth contract -> canonical copy repair | Execute together in Task 8. |
| 3 -> 4,5 | Registry normalizer -> persistence and landing token | Exact interface is one nullable `growthExperienceVersion`; unknown/mismatched values normalize to null. |
| 4 -> 5 | Stored cohort -> landing/request token claim | DB value is set-once; restored flow beats incoming token; direct untagged start stays null. |
| 4 -> 12 | Migration/payment propagation -> regression suite | Additive nullable DB change; never enters clinical answers or blocks payment. |
| 5 -> 6,7 | Landing shell analytics/token -> Hair/ED pages | Both pages reuse shared interface; one active landing version per service. |
| 6 | Hair H1 self-check | Landing-only; intake steps and required answers unchanged. |
| 7 | ED E1 self-check | Landing-only; five-step intake unchanged. |
| 6,7 -> 8 | Page copy -> prescribing identity claim | Task 8 centralizes repeated identity truth after pages establish placement. |
| 4,8 -> 9 | Checkout metadata and identity -> Hair retry safety | Safety rule is independent of cohort marker and does not alter identity. |
| 10 -> 14 | Policy recommendation -> future exact Ads packet | Evaluation never mutates; Hair 19/20, ED/Women 29/30. |
| 11 -> 12 | Browser receipt -> release verification | No real payment, deploy, or external mutation. |
| 13,14 | Later live evidence tasks | Not active in this implementation; require deployment/time/fresh approval. |

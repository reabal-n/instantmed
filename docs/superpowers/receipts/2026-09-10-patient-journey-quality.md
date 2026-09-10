# Patient journey quality pass — September 10, 2026

This is the operator-approved follow-up to the public funnel's 7/10 review. It does not reopen Plan 3 or Plan 4 implementation, start Plan 5, establish conversion uplift, or supply clinician/provider acceptance.

Started from `origin/main` at `a07fdb0a696ae15e6eda2294abab3dfad8f78eda`. Runtime implementation is committed through `dc589cdaf77423c85a92fc437a2b3ea7c989aae2` on `codex/patient-journey-quality`.

## Changes

- Homepage: concise scope and pricing, a clearly labelled static review example, non-overlapping outcome cards, and space for the fixed navigation. The availability line and draft-resume action remain visible on a fresh mobile visit.
- Patient request: normal-length symptom paragraphs remain fully readable; long answers stack under labels and long email addresses stay within the card. Identity/symptom input examples and the optional priority-switch state have verified contrast. Resume actions have reachable 44px targets.
- Verification: the recording follows the actual homepage CTA and service choice, captures every step and entered identity, and ends at Review & pay. Unobserved categories use null; still frames cannot receive a motion score. Missing scores are not invented, and DOM presence cannot automatically raise a score or dismiss clipping.

The price, eligibility, clinical screening, consent, priority-offer hours, payment actions, draft ordering and prescribing completion rules are unchanged.

## Evidence boundaries

| Boundary | Evidence |
|---|---|
| Local release check | `corepack pnpm release:check` passed on runtime head `dc589cdaf`: 7,711 tests passed, 122 skipped; lint, typecheck, strict integration checks, zero-known-vulnerability audit, production build and bundle budgets passed. Node 24 and pnpm 10.23.0 are retained. |
| Patient browser | Both light/dark cases pass with retries disabled: actual CTA/service navigation, exact edited answers, long email, reload recovery, consent focus, blocked duplicate checkout and support recovery. Text contrast is at least 4.5:1; the priority track and thumb are at least 3:1. The browser clock advances from Sydney noon to exercise the scheduled offer without freezing draft timestamps. |
| Resume and first paint | Seven resume cases pass, including real clicks on homepage/certificate landing at 375/1440px and a fresh mobile homepage header check. The separate first-paint case passes with JavaScript disabled under both motion preferences. The hidden-header assertions were observed failing before the spacing correction. |
| Clinician application | Existing concise-review suite: 20 cases passed on the full run; one development-module error passed its focused rerun. Source facts, missing/negative/positive distinctions, note saves, disclosure, profile/record return, clarification and held/failed actions were exercised with owned synthetic records. This is not a clean first-attempt result for every case. |
| Prescribing component | All 30 loopback-provider scenarios passed across laptop/tablet/mobile widths, light/dark, short/long context, copy/focus, errors/retries and return state. No prescription was issued. |
| Independent code review | Scoped reviews found and closed score-handling defects, a transparent-background measurement error and an overnight test-clock dependency. No unresolved actionable code findings remain. |
| Required CI and production | PR #549's exact-head build, E2E and Lighthouse checks passed. Its tested and merged trees match; the corresponding production deployment reached READY with the canonical alias, and public/dashboard-authentication smoke passed. Three existing E2E cases needed retries; their limits are recorded below. The homepage follow-up requires its own checks and production receipts. |

Earlier release attempts exposed ignored generated proof scripts being linted, an unsuitable local Sentry environment for existing unit mocks, brittle source-string assertions, and a programmatic-SEO import timeout. Generated runners were moved outside the lint tree; production Sentry configuration was not changed. Assertions still require the intended compact layout and clinical copy. The timeout passed its focused rerun without a higher deadline; the final local run caps Vitest at four workers using its supported environment setting.

## Visual review and acceptance

Original local reports are retained in order: combined scores **7, 8, 8, 8**. The latest complete recording, source `877210b08c20d61b54de9acb55a1551c1a4f88a5`, received Gemini **9/10**, Claude **7/10**, combined **8/10**. The subsequent priority-switch contrast correction has separate current light/dark browser evidence. These are public-funnel scores, not ratings of Plan 3/4 or a claimed 10/10.

The automatic production recording after PR #549 scored Gemini **6/10**, Claude **7/10**, combined **7/10** on source `5d5c0582b1306489813366d4e4fe39f36d05b68f`. The successful recording workflow does not turn that below-target result into visual acceptance. Its original video, frames and reports are preserved.

The bounded homepage follow-up demotes the secondary headline and removes the duplicate Google-star group below the CTA, keeping both existing certification marks in one mobile row. It preserves the canonical headline, wording, typography tokens and intake behavior. Production computed styles show loaded configured fonts and normal body letter/word spacing; the review's loose-spacing observation did not establish a font-loading or tracking defect. Phone and desktop screenshots in light/dark passed independent review. Forty focused contract checks passed. Seven of eight first-paint/resume browser cases passed initially; the remaining mobile resume case exceeded its five-second navigation assertion while the first development response took 5.266 seconds, then passed its focused rerun in 1.9 seconds. No deadline was increased. Fresh release and production review results belong to the release ledger below.

The full local release check also passed on follow-up runtime source `3452ae069`: 7,711 tests passed, 122 skipped; lint, typecheck, strict integrations, security audit, production build and bundle budgets passed. The subsequent documentation-only update does not change that runtime. Exact final-head CI and deployment evidence remain separate.

The review findings were checked against source, frames and browser behavior. Input examples are not submitted values; the entered identity and symptoms match Review. September 10 was the capture date. Disabled CTAs correctly reflect incomplete input/consent, and certificate wording is reachable by scrolling. Work and Work/Sick Leave map to the same existing certificate value. Suggestions to invent review times, promise no call for prescribing or add decorative reassurance were not adopted. The low-contrast priority switch was corrected.

The primary checkout preserves the comparison gallery, original reports, adjudication and logs under `output/patient-journey-quality/`. Its `release-state.json` owns the final PR/CI/merge/deployment identifiers and completion timestamps, avoiding a documentation-only deployment merely to restate generated release metadata. The PR also records immutable CI and deployment links. `review.html` is the visual handoff.

PR #549's three retry-dependent CI cases were independently inspected. The certificate preview was still loading during a 21-second server response; the concise-review request reached the application's 12-second timeout; and the prescribing case first timed out in test login, then on a full-record load taking 29.9 seconds. The later attempts passed, with no confirmed wrong-data or completion-state regression. They remain reliability/evidence limits: a whole-test retry does not prove the displayed in-place Retry action recovered the observed timeout.

## Remaining external acceptance

- Dedicated hosted Stripe test credentials and a real hosted payment/webhook run. Existing browser tests deliberately stop or block before submission.
- Authorized live Parchment confirmation and physical iPhone/Android keyboard/viewport checks. A responsive Chromium run is not physical-device or provider proof.
- Operator acceptance of the public flow and clinician workspace. No agent or automatic score supplies this decision.

## Privacy and rollback

No schema, dependency, credential or patient-record migration is required. Revert this quality-pass PR through the protected main workflow to roll back the runtime changes; a code revert does not undo previously saved clinical outcomes. The prior production deployment was `dpl_3k9pBGGzKCFsZ7WnA3H4ekhDbb4V`, source `a07fdb0a696ae15e6eda2294abab3dfad8f78eda`.

Regression specs intercept draft writes, including unload beacons, and block checkout submission. Each complete visual capture removed its exact synthetic draft and verified HTTP 404. Clinical fixtures own their exact teardown. Early anonymous manual/resume checks lacked full isolation and did not retain draft identifiers, so cleanup of any anonymous rows from those checks is unverified. No identity was entered in those checks, and unrelated records were not queried or deleted to guess ownership.

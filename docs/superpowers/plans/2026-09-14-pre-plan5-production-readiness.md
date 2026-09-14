# Pre-Plan 5 Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Close the demonstrated CI reliability gap and verify existing production monitoring, while retaining the owner's physical-phone acceptance before Plan 5.

**Architecture:** Reuse the existing compiled Playwright group and production browser observer. Diagnose the three failed first attempts before choosing any fix; preserve application behavior and provider guards. Record automatic execution, alert ingestion, downstream delivery and human acceptance separately in this plan's receipt and ROADMAP.

**Tech Stack:** Node 24, pnpm 10.23.0, Next.js 15.5.24, React 18.3.1, Playwright, GitHub Actions, existing Vercel cron, Supabase operational metrics, Sentry.

**Spec:** User-approved three-action scope of September 14; `docs/ROADMAP.md`, the September 14 monitoring handoff in `2026-09-06-01-checkout-data-reliability.md`, and `../receipts/2026-09-10-patient-journey-quality.md` own the existing release and acceptance boundaries.

## Global Constraints

- Work only this readiness follow-up. Plan 5 remains unstarted.
- Preserve stack pins, clinical outcomes, provider authentication, assertions and individual test deadlines. Do not introduce a service, dashboard, migration or patient-facing feature.
- Never run synthetic webhook calls against production or create live payments, prescriptions, refunds or patient notifications for evidence.
- Use existing owned local/CI fixtures and their cleanup; keep credentials, patient data and raw provider payloads out of logs and committed receipts.
- Keep implementation, CI, deployment, scheduled completion, Sentry ingestion, downstream notification delivery and physical-device acceptance separate.
- Credentials and deployment for PR #559 are already complete. The repository-only Actions token has no expiry by explicit owner approval; do not replace it.
- Review every task and the final diff. Commit changes, use required PR checks, and merge through normal main rules under the existing merge authorization.

## Task 1: Remove retry dependence from the three demonstrated CI cases

**Files:**
- Inspect: `e2e/medcert.auto-approval.spec.ts`, `e2e/doctor.prescription-ui.spec.ts`, `e2e/parchment-webhook.spec.ts`, `playwright.config.ts`, `scripts/check-medcert-readiness.sh`.
- Inspect before any runtime edit: `app/api/test/medcert-immediate-auto-approve/route.ts`, `app/api/webhooks/parchment/route.ts`, `lib/dev-only-routes.ts`, the profile-summary route and its caller.
- Modify only if evidence supports compiled selection: `.github/workflows/ci.yml`, `lib/__tests__/ci-workflow-contract.test.ts`, `docs/TESTING.md`; adjust the existing med-cert runner only if necessary to keep selection owned once.
- Evidence: local ignored `output/pre-plan5-readiness/`; prior traces are in the primary checkout's `output/dependable-monitoring-release/ci-traces/`.

**Interfaces:** Consume the existing `PLAYWRIGHT_PRODUCTION_CASES` selector and `PLAYWRIGHT_SERVER_MODE=production`. Produce passing first-attempt results for all three cases and a minimal, guarded CI change when justified.

- [x] Read the prior failed traces and record the strongest hypothesis. The empty-profile trace had unrelated responses taking 24–28 seconds; the other two captured no response. Do not label this a proven product defect.
- [x] Verify local/CI environment and fixture safety, inspect each selected test's build-mode dependencies, and check no shared-fixture CI run is active before a local run.
- [x] Build the local test app with `PLAYWRIGHT=1 NEXT_PUBLIC_PLAYWRIGHT=1`, matching public app/Supabase build settings and existing protected local E2E environment loading. Never print secret values. Run the following selection with existing secrets available only in process environment:

```bash
PLAYWRIGHT_SERVER_MODE=production PLAYWRIGHT_WORKERS=1 \
  corepack pnpm exec playwright test --project=chromium --retries=0 \
  --grep='post-payment worker ignores a duplicate profile already merged into the current patient|shows an explicit empty saved-profile state without inventing differences|rejects request with missing signature header' \
  e2e/medcert.auto-approval.spec.ts e2e/doctor.prescription-ui.spec.ts e2e/parchment-webhook.spec.ts
```

- [x] If a case fails, isolate its cause and add the smallest reproducer before changing runtime code. Load the matching clinical/security workflow before such an edit. A missing test-only environment variable is an environment fix, not permission to weaken the production guard.
- [x] If all cases pass compiled and evidence supports the existing development compilation failure pattern, extend the existing no-retry compiled group. Add them to its selector/files and required signing environment; exclude only the moved cases from their former development groups. Keep all other webhook cases in their current mode. First add a contract that fails on the current selection/environment, then implement the smallest workflow adjustment. Verify actual test discovery counts so a selector cannot silently omit a case.
- [x] Run the existing four plus the three new compiled cases, serially and without retries; require seven executed passes and zero skips. Use one bounded repeat of the three newly moved cases only to check the observed intermittency.
- [ ] Run focused workflow/config contracts, lint, typecheck and doc audit. Review the exact diff, commit and send it for independent task review. Full required CI owns the release boundary.

## Task 2: Verify automatic monitoring and downstream delivery

**Files:** Read `lib/monitoring/browser-observer.ts`, `app/api/cron/browser-check/route.ts`, `docs/OPERATIONS.md`; update only this plan's execution receipt and ROADMAP with bounded facts.

**Interfaces:** Consume `browser_scheduled_dispatch` receipts, existing `browser_observer_state`, public GitHub run/step evidence and Sentry `source:browser-monitor` events. Produce timestamped pass/fail observations, not manufactured health markers.

- [ ] Read current deployment and numeric monitor state. The first eligible post-release Vercel slot is September 14 06:17 UTC (16:17 Sydney), with native GitHub backup at minute 47.
- [ ] After the natural slot, correlate the stored dispatch run ID with the exact GitHub workflow run and successful browser step, then confirm a later observer poll accepts it and records stale recovery. Manual dispatches and reruns do not establish cadence.
- [ ] Inspect the existing Sentry notification configuration and provider delivery evidence for the real stale/recovery event. Record ingestion separately from recipient delivery; if only the operator can confirm receipt, leave that explicit human/evidence gate. Do not send a test message or add an alert route merely to obtain evidence.
- [ ] Measure a full 24-hour window from the first accepted scheduled completion: list eligible completions, maximum internal gap and trailing age against the 150-minute requirement. A shorter window is partial evidence. Arrange one bounded follow-up if the observation window outlasts implementation; it must inspect existing evidence and stay quiet unless completion, failure or human input is meaningful.
- [ ] Review the evidence against each acceptance rule; record any real runtime failure for diagnosis under the incident workflow, without expanding product scope.

## Task 3: Release the engineering fix and preserve owner acceptance

**Files:** Update `docs/TESTING.md` for changed CI behavior, `docs/ROADMAP.md` for current priority/status and this plan's execution receipt. The existing patient-journey receipt owns prior visual proof.

**Interfaces:** Consume Task 1 test/review results and Task 2 provider observations. Produce a merged release receipt and an honest list of remaining time/owner gates.

- [ ] Run the appropriate release checks, independent whole-branch review and required GitHub `build`/`e2e` checks. Inspect failed attempts as well as the final CI status. Merge through normal PR rules only after required checks pass.
- [ ] For any runtime change, verify the deployed source and targeted production smoke. For test/docs-only changes, identify the existing production application as unchanged and avoid an unnecessary redeployment.
- [ ] Retain the deferred owner phone check: Dashboard → existing request → open Prescribe → close; verify readable compact context, usable keyboard/viewport, sufficient iframe space and return to the same request, without issuing a prescription. Machine viewport checks cannot mark this accepted.
- [ ] Update ROADMAP and the receipt with completed work, precise pending evidence and the next allowed action. Leave Plan 5 unstarted; delete only merged owned branches/worktrees after retaining local evidence.

## Execution Receipt

Planned September 14 from `origin/main` at `79e1d8b837dac0d54a1944227608b3807a5351da`. Implementation is in progress; Task 1 has passed local compiled verification and is awaiting independent review and required CI. Existing production deployment is READY at application commit `1215e8e1a58be571e0884abeffd71893241748b7`; the three flaky cases and downstream evidence remain open at plan creation.


### Local engineering evidence

The initial compiled run executed all three cases successfully without retries: empty profile 4.2s, merged duplicate certificate worker 2.7s, missing-signature rejection 9ms. The full group executed seven passes without retries or skips in 40.6s; a bounded repeat executed the three new cases successfully in 17.9s. The workflow contract failed before the selector change and passed afterward. These observations support moving the cases out of the development compilation path; they do not establish a production application defect or the exact cause of the historical connection reset.

### Provider routing finding

Sentry received the real `browser_stale active` event at **September 14 05:10:08.805 UTC**, under [INSTANTMED-BY](https://reys-projects.sentry.io/issues/INSTANTMED-BY). The issue remained ongoing with High priority. The existing new-issue and high-priority notification rules last triggered September 13; the payment/email rules have unrelated message filters. Their history contains no trigger for this September 14 recurrence. This is a provider routing gap, beyond the previously unverified inbox receipt.

A narrowly scoped rule is prepared but **not saved**: InstantMed production; event/activity captured; exact tags `source=browser-monitor` and `incident_status=active`; notify the existing owner member; 30-minute per-issue throttle. The new notification subscription is awaiting explicit owner approval under the browser confirmation policy. No test notification was sent. The owner phone review and full 24-hour cadence window remain open.

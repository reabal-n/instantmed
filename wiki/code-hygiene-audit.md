# Code Hygiene Audit

Audit date: 2026-06-12. Scope: read-only scan plus documentation bookkeeping fixes planned in this branch.

## Current Status

| Check | Result |
|-------|--------|
| `git status --short --branch` before edits | Clean `main` |
| `bash scripts/check-orphaned-files.sh` | Passed |
| `bash scripts/check-route-conflicts.sh` | Passed |
| `pnpm lint` | Passed |
| `pnpm doc:audit` | Passed: 8 files, 66 tests, markdown count 89 |

## Findings

| Finding | Risk | Plan |
|---------|------|------|
| No `/wiki` folder existed | Future sessions over-read broad code folders | Add wiki as a first routing layer |
| `docs/bookkeeping/file-map.md` text said 79 docs while `expected-md-count` and `doc:audit` said 89 | Confusing documentation surface for future agents | Update file-map text and add wiki section |
| `docs/ARCHITECTURE.md` had stale counts for `components`, `lib`, migrations, and blog MDX | Misleading repo inventory | Refresh counts from current checkout |
| `docs/ARCHITECTURE.md` listed 23 cron routes, current count is 24 | Minor ops inventory drift | Refresh count |
| Large request, staff, data, SEO, and email files remain | Maintenance risk, but not a safe first-pass docs refactor | Capture as deferred refactor candidates |
| Production code has a few intentional escape hatches (`eslint-disable`, dev console fallbacks, `any` in analytics typing) | Low to moderate type-safety/locality risk | Review one bounded target at a time |

## Largest Hotspots

These are not automatically bad. They are places future refactors should inspect for seams and locality before editing.

| Path | Approx lines | Why it matters |
|------|--------------|----------------|
| `lib/blog/visuals.ts` | 4,428 | Large registry; may be acceptable data shape but hard to scan |
| `app/doctor/queue/actions.ts` | 1,484 | Clinical/staff mutation surface; high blast radius |
| `app/doctor/queue/queue-client.tsx` | 1,237 | Staff UI state and interactions |
| `app/doctor/queue/queue-table.tsx` | 1,236 | Staff table UI and review affordances |
| `lib/data/intakes/queries.ts` | 1,199 | Central queue/ledger read model |
| `components/request/steps/patient-details-step.tsx` | 1,055 | Identity, address, prescribing fields |
| `app/patient/settings/settings-client.tsx` | 1,039 | Patient account and identity UI |
| `components/request/request-flow.tsx` | 919 | Intake orchestration and draft behavior |
| `app/admin/features/feature-flag-detail.tsx` | 869 | Operational controls UI |
| `lib/email/send/reconstruct.ts` | 866 | Email reconstruction logic |

## Doctor Queue Action Map

Mapped on 2026-06-12 as Batch 4 of the hygiene plan. `app/doctor/queue/actions.ts` is a high-risk server-action module; keep clinical ownership and capability enforcement in the mutation path unless stronger behavioral tests are added first.

| Action/helper | Outcome | Required guard points |
|---------------|---------|-----------------------|
| `ensureDoctorCaseActionAllowed()` | Shared doctor case ownership check | Admin bypass only; doctors must pass `getDoctorCaseActionError()` against `claimed_by`, `reviewing_doctor_id`, and `reviewed_by` |
| `ensureClinicalDecisionNoteForApproval()` | Ensures approval has a clinical note, falling back to generated case summary | Reads encrypted answers safely; saves resolved note before approval when needed |
| `updateStatusAction()` | Moves intake status, including review and prescribing handoff states | UUID; doctor/admin auth; ownership; clinical note for `approved`/`awaiting_script`; med-cert document-builder block; prescribing-service script-evidence block; doctor capability; prescribing identity for `awaiting_script`; lifecycle errors |
| `saveDoctorNotesAction()` | Persists doctor notes | UUID; doctor/admin auth; ownership |
| `declineIntakeAction()` | Declines intake through canonical decline/refund/email path | UUID; doctor/admin auth; ownership; doctor capability before `declineIntakeCanonical()`; staff/patient revalidation; Telegram edit |
| `flagForFollowupAction()` | Flags case for follow-up | UUID; doctor/admin auth; ownership |
| `markScriptSentAction()` | Records manual/external script completion | doctor/admin auth; intake exists; admin or Parchment claim satisfied; doctor capability; explicit external evidence; prescribing identity; prescribing-step transition; script completion eligibility; audit log |
| `approvePrescribedScriptAction()` | Final prescription approval and patient email | doctor/admin auth; admin or Parchment claim satisfied; doctor capability; `script_sent` evidence; script completion eligibility; clinical note; patient email fail-soft logging |
| `claimIntakeAction()` | Acquires review claim | doctor/admin auth; doctor availability; UUID; atomic `claim_intake_for_review` RPC; no fail-open fallback; review-start analytics |
| `releaseIntakeClaimAction()` | Releases review claim | doctor/admin auth; UUID; atomic `release_intake_claim` RPC |
| `getDeclineReasonTemplatesAction()` | Loads active decline templates | doctor/admin auth; active templates only |
| `issueRefundAction()` | Standalone Stripe refund/top-up | UUID; doctor/admin/support auth; refundable payment status; support cap and rate limit; Stripe payment intent; idempotency key; intake refund state update; patient email fail-soft |
| `quickPrescribeRenewalAction()` | One-tap renewal handoff to prescribing | UUID; doctor/admin auth; prescribing service only; paid status; doctor capability; claim ownership; non-controlled medication; matching prior prescription; prescribing identity; claim attempt; note write; mark reviewed; lifecycle transition to `awaiting_script` |

Current extraction candidate: the renewal-note formatting inside `quickPrescribeRenewalAction()` is pure. Do not move it until a focused test pins date/timezone and medication-strength formatting.

## Guardrail Health

The repo already has useful hygiene gates. Do not duplicate them in new scripts unless a concrete gap appears.

- Doc surface: `pnpm doc:audit`
- Route conflicts: `scripts/check-route-conflicts.sh`
- Retired/dead files: `scripts/check-orphaned-files.sh`
- Stack pins: `scripts/check-stack-pins.sh`
- Design tokens: `scripts/verify-tokens.sh`
- Portal legacy classes: `scripts/check-portal-no-legacy-classes.sh`
- CI coverage: `.github/workflows/ci.yml`

## First Pass Boundary

This branch should only add the wiki and tiny mechanical docs fixes. It must not change product direction, clinical policy, pricing, routes, database schema, runtime behavior, or stack versions.

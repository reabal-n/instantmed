# Lifecycle + Dashboard Execution Plan (2026-07-19)

> **For Claude (Opus executor):** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement this plan task-by-task. Load the repo skill named in each task before touching its files. This plan was authored by Fable 5 after a verified review of PRs #364–#374 and live-DB investigation; do not re-derive the findings — they are settled. `docs/ROADMAP.md` remains the sole active queue; this plan executes the 2026-07-19 fix train it activates.

**Authority:** Reference only. `docs/ROADMAP.md` remains the sole active priority queue.

**Execution status (2026-07-19):** Schema PR #374 is merged, applied, and verified. PR #372 is not being merged wholesale; its enforcement is landing as separately verified review-request and partial-recovery tranches so the encrypted frozen-payload and outbox-disposition invariants already on `main` are preserved.

**Goal:** Merge the review-lifecycle draft pair safely (with three pre-merge tweaks), recover the two stranded Jul-14 customers, kill the remaining compliance copy gap, and rebuild the staff-dashboard truth layer so health signals stop lying — in revenue order, with no feature bloat.

**Architecture:** Three independent workstreams. (A) Email-lifecycle: land schema PR #374 → apply migration → land enforcement PR #372 with tweaks. (B) Ops truth: one `getOpsSignals()` module consumed by the pill, `/admin/ops`, and the ledger, then recompose those surfaces on existing primitives. (C) Two one-off tasks: stranded-customer recovery and the hours-copy sweep.

**Tech stack:** Existing stack only (Next 15.5 / React 18.3 pinned — see Stack Pin Policy). No new dependencies anywhere in this plan.

---

## Standing context (read before Task 1)

- **Decisions already made by the operator via Fable — do not re-ask:** e2e is now a REQUIRED check on `main` (`["build","e2e"]`, flipped 2026-07-19; every merge waits on the ~20-min e2e job — merge serially). The two stranded customers get recovery emails (Task 3), not write-offs. The draft pair merges after the Task-1 tweaks.
- **Shared working tree hazard:** other agent sessions run in `/Users/rey/Developer/instantmed`. NEVER `git stash`/`checkout` there. Do all work in sibling worktrees (`/Users/rey/Developer/instantmed-worktrees/<slug>`), check `git branch --show-current` before every commit, stage explicit paths (never `-a`), and remove worktrees when merged.
- **CI quirk:** the required checks sometimes don't re-fire on branch update — close + reopen the PR to force a run, then re-enable auto-merge. Never `--admin` bypass.
- **PR workflow:** create PR → enable auto-merge immediately → fix CI if red → delete worktree after merge.
- **Kill list (do NOT build):** no live-monitor widget resurrection, no second alerting channel, no new analytics widgets, no per-role dashboard variants, no changes to the split-pane review queue, no subscriptions/referral anything.
- **Operator-only items (mention in the final report, do not do):** JDM agency non-renewal decision due Jul 21; ProductReview FAQ still says "8am–10pm" (external site); Vercel build-tier downgrade.

---

## Task 1 — Pre-merge tweaks on the draft pair

**Skill:** `instantmed-production-incident-review` (email lifecycle is live-ops surface).
**Branch:** work directly on `codex/communications-lifecycle-truth` (PR #372) in a fresh worktree. PR #374 (`codex/communication-lifecycle-schema`) needs no code changes.

Fable's review verdict on the pair: **approved with three tweaks**. The design (three-valued `allowed | policy_suppressed | transiently_blocked` decisions, CAS one-shot markers, deterministic earliest-reservation cooldown, Sydney-hour deferral, `recovery_tracking_id` bearer confinement) is correct and fixes all six confirmed lifecycle bugs plus the Spam Act patientId-branch gap. The tweaks close three residual holes found in review:

### 1a. Revoked-cert reopen must not terminally suppress

**File:** `lib/email/review-request-policy.ts` — `classifyReviewRequestPolicy`.
**Problem:** `!["approved","completed"].includes(intake.status)` → `policy_suppressed: "invalid_request_state"`. An `approved → in_review` reopen (revoked-cert path, DB-trigger-guarded, see CLAUDE.md migration `20260711193000`) is *transient*: the intake gets re-approved with a fresh cert and then deserves its ask. A terminal stamp during the reopen window kills the ask forever.
**Change:** treat `in_review` as transient, keep everything else terminal:

```ts
if (!["approved", "completed"].includes(intake.status)) {
  // approved → in_review is the guarded revoked-cert reopen: reversible,
  // so defer rather than burn the one-shot suppression marker.
  if (intake.status === "in_review") {
    return transientRetry(facts.now, "request_reopened")
  }
  return { kind: "policy_suppressed", reason: "invalid_request_state" }
}
```

**Test first:** add to `lib/__tests__/review-request-policy.test.ts`: an intake with `status: "in_review"` yields `kind: "transiently_blocked"`, `reason: "request_reopened"`, with a `retryAt`; `declined` still yields `policy_suppressed`. Run `pnpm test -- review-request-policy` → fails → apply change → passes.

### 1b. Sentry alert on dispatcher-side terminal provider exhaustion

**File:** `lib/email/send-email.ts` — `sendFromOutboxRow`, the terminal provider-failure branch (the one that writes `updateOutboxStatus(row.id, "failed", { ..., attempts: EMAIL_DISPATCHER_MAX_RETRIES })`).
**Problem:** the synchronous `sendEmail` path alerts Sentry on provider failure; the dispatcher path only `logger.error`s. A permanently undeliverable review/recovery email dies silently in the failed list.
**Change:** in the branch where `retryable === false` OR `row.retry_count + 1 >= EMAIL_DISPATCHER_MAX_RETRIES`, add one fingerprinted capture (counts only, no PHI):

```ts
Sentry.captureMessage("Email exhausted provider retries in dispatcher", {
  level: "error",
  tags: { subsystem: "email-dispatcher", email_type: row.email_type },
  fingerprint: ["email-dispatcher-provider-exhausted", row.email_type],
  extra: { outboxId: row.id, retryCount: row.retry_count },
})
```

Check first whether `email-dispatcher.ts` already fires its `Email exhausted all ${MAX_RETRIES} retries` capture on this same event for outcome-bearing rows — if it demonstrably covers lifecycle types too, tighten that one instead of double-alerting. One alert per exhaustion, not two.
**Test:** extend `lib/__tests__/review-request-provider-gate.test.ts` (or the dispatcher test) asserting the capture fires exactly once on terminal exhaustion.

### 1c. Recovery payload-mismatch must defer, not terminally suppress

**File:** `lib/email/partial-intake-recovery.ts` (and `partial-intake-recovery-policy.ts` if the mismatch reason routes through it) — the `partialRecoveryPayloadMismatch` pre-provider guard.
**Problem:** the guard requires the frozen plain-text body to contain the resume URL as an exact substring; on mismatch it routes to `finalizePartialRecoverySuppression` → terminal `recovery_email_suppressed_at`. A future template/renderer change that wraps or encodes the URL would permanently suppress **every** recovery draft — the channel dies silently. A body/URL mismatch is a code anomaly, not a policy truth about the recipient.
**Change:** keep the *recipient* mismatch terminal (address genuinely changed → frozen body is stale), but route the *resume-URL substring* mismatch to the transient path: defer the row (`deferOutboxRow`) with reason `"frozen_payload_url_mismatch"` and fire a fingerprinted Sentry error (`["partial-recovery-payload-mismatch"]`) so a renderer regression pages once instead of mass-suppressing.
**Test first:** in `lib/__tests__/partial-intake-recovery-provider-gate.test.ts`, a URL-substring mismatch → row deferred, `recovery_email_suppressed_at` NOT written, Sentry called; a recipient mismatch → still terminal suppression.

### 1d. Commit and verify

```bash
pnpm test          # full unit suite — the PR's own 20 test files must stay green
pnpm typecheck
git add <explicit changed files>
git commit -m "fix(email): transient reopen + payload-mismatch dispositions, alert on provider exhaustion"
git push
```

---

## Task 2 — Merge sequence for the pair (order is load-bearing)

**Skill:** `instantmed-production-incident-review`. The docs in both PRs already state: *application code must not read the new columns before the migration is applied*.

1. **Pre-flight the migration assertion read-only** against prod (Supabase MCP `execute_sql`): run the `EXISTS` query from the `do $$` block in `supabase/migrations/20260719090000_communication_lifecycle_truth.sql` (active `partial_intake_recovery` outbox rows with no mappable `recovery_tracking_id`). Expect zero rows; if any exist, STOP and reconcile before merging anything.
2. Mark **#374** ready (`gh pr ready 374`), confirm `build` + `e2e` green (both now required), merge. Docs + migration file only — no runtime reads.
3. **Apply the migration to prod** with `supabase db push` (linked project `witzcrovsoumktyndqgz`). Do NOT use MCP `apply_migration` — it records a generated version that desyncs `schema_migrations` from the file timestamp (known gotcha, bitten twice). Verify: `select column_name from information_schema.columns where table_name='partial_intakes' and column_name in ('recovery_tracking_id','recovery_email_suppressed_at');` returns 2 rows; `intakes.review_email_suppressed_at` exists; `get_unmarked_sent_partial_recoveries` is executable by service_role only.
4. Update the **#372** branch with main (`gh pr update-branch 372` or merge main in the worktree), mark ready, wait for green (close+reopen if checks don't re-fire), merge.
5. **Post-merge proof of the anti-join** (the one high-risk construct — the candidate finder's `active_review_outbox` embedded anti-join could silently select zero candidates if PostgREST filter semantics differ from expectation): call the backfill route in dry-run against prod: `curl -H "Authorization: Bearer $CRON_SECRET" "https://instantmed.com.au/api/cron/review-request-backfill?dryRun=true&limit=50"`. Expect a non-zero candidate count (catch-up backlog exists). Zero candidates = the anti-join regressed → revert #372, do not debug live.
6. Watch Sentry for 24h for `Review request marker invariant conflict` / reconciliation alerts (expected: none). The review-ask volume on `/admin/emails/hub` should rise as the starved catch-up queue drains.
7. Update CLAUDE.md: migration count 97→98 gotcha is already in #374's diff; after merge run `scripts/sync-agent-doc.sh` if CI flags drift. Mark the migration paragraph "APPLIED to prod + verified <date>" in the same commit as any other doc touch.

---

## Task 3 — Recover the two stranded Jul-14 customers

**Skill:** `instantmed-checkout-payment-review` (mandatory — payment state). **Sequencing:** after Task 2, so the Spam Act suppression AND-check is live before any marketing-classified send.

Rows (verified live 2026-07-19, both `status=checkout_failed`, `payment_status=pending`, `checkout_error` = "No Stripe session was ever created", no stored session):
- `b32e7263-968d-425b-aac0-8f1718f752ef` — prescription/repeat, created 2026-07-14
- `4b84acb1-0578-413f-9555-7984bb0fdb20` — medical_certificate/work, created 2026-07-15

Operator decision (already made): **recover both** — one email each, no repeats.

1. Read `app/admin/ops` recovery affordances and `lib/stripe/checkout/retry-payment.ts` first: if an operator-triggered "resend payment link / recovery email" action already exists for `checkout_failed` intakes, use it verbatim. Do not build a new mechanism if one exists.
2. If none exists, send via the existing `abandoned_checkout` email template through the durable outbox (idempotency key `stranded_recovery_<intakeId>`), addressed from the intake's patient record. Consent gates: `getMarketingDeliveryDecision` must return `allowed` (post-Task-2 it enforces suppressions + preferences); if suppressed, do not send and record that.
3. Audit-log both actions (`audit_logs`, action `stranded_checkout_recovery_email`, metadata: intake id + outcome only — no PHI).
4. **Do not** mutate payment state. If unpaid after 7 days (2026-07-26), transition both `checkout_failed → cancelled` — verify the transition is legal in BOTH `VALID_STATUS_TRANSITIONS` (`lib/data/intake-lifecycle.ts`) and the `validate_intake_status_transition` DB trigger before executing (both layers, same commit if either needs a change — see the two-place state-machine gotcha). Audit-log the closure.

---

## Task 4 — Hours-copy sweep (small, ships same day)

**Skill:** `instantmed-marketing-compliance-review` (mandatory before sign-off) + `/clarify` (copy-only PR rule).

1. `rg -n "during review hours|review hours" app components lib content --type ts --type tsx --type mdx` — expect `app/for/page.tsx` (~line 65) plus the vic/nsw/qld deep-city `/for/*` surfaces (~13 instances total per the 2026-07-18 review).
2. Replace with the calm 24/7 framing per CLAUDE.md Hours policy: no review-hours window, no SLA promise, no "8am–10pm". Model the phrasing on the existing compliant surfaces (grep `24/7` in `components/marketing/`).
3. **Strengthen the contract** in `lib/__tests__/hours-copy-contract.test.ts`: the current regex only catches clock-shaped windows ("8am–10pm"), which is why "during review hours" survived as false-green. Add a pattern matching bare `review hours` (case-insensitive) across the pinned public surfaces. Test must FAIL against the current tree before the copy fix, PASS after.
4. Run `/clarify` on the changed copy. PR: `fix(marketing): retire review-hours framing on /for surfaces + strengthen hours contract`.

---

## Task 5 — Dashboard Phase 1: one truth module (`getOpsSignals`)

**Skill:** `instantmed-production-incident-review` for definitions; unit-test heavy, no UI yet.

**Problem being fixed (all verified live):** the pill (`lib/data/system-health.ts`) counts 24h `status=failed` only and includes suppressed-race rows; `/admin/ops` (`app/admin/ops/page.tsx`) counts 7d `failed+bounced+complained`; synthetic e2e rows counted as real until they age out; `checkout_failed` recoveries **age off the card by time instead of clearing on resolution** (the Jul-14 pair vanishes ~Jul 21 whether or not recovered).

**Files:**
- Create: `lib/admin/ops-signals.ts` + `lib/__tests__/ops-signals.test.ts` + `lib/__tests__/ops-signals-single-source-contract.test.ts`
- Modify: `lib/data/system-health.ts`, `app/admin/ops/page.tsx`, `components/operator/system-health-pill.tsx`

**Interface (the definitions ARE the deliverable):**

```ts
export interface OpsSignals {
  incidents: {            // systemic, CURRENT — 24h window is correct here
    emailFailures24h: number      // status=failed, MINUS synthetic + suppressed-race rows
    webhookDlqUnresolved: number  // resolved_at IS NULL — no window; unresolved is unresolved
    parchmentFailures24h: number
  }
  recoveries: {           // per-customer, clears on RESOLUTION, never by age
    checkoutFailed: number        // status=checkout_failed AND payment_status IN (pending,failed) — all-time
    refundFailed: number          // refund_status=failed — all-time
    certDeliveryFailed: number    // email_failed_at set AND not since resent/delivered
  }
  severity: "incident" | "recovery_pending" | "healthy"  // class-based, never raw-count
}
```

Rules, each pinned by a unit test:
1. **Synthetic exclusion:** every email count filters through `isLikelyTestPatientIdentity` (`lib/data/seeded-e2e-data.ts` — already used by the recovery cron since #371) and excludes reserved domains (`@example.com/.org/.net`). One shared predicate, exported, reused.
2. **Suppressed-race parity:** subtract `Suppressed before delivery` rows exactly as the dispatcher stats do (`lib/email/quiet-failures.ts` constants — reuse, don't re-derive strings).
3. **Recovery ≠ incident:** recoveries have NO time window; they leave the count only when resolved (paid, cancelled, refunded, resent). Add `oldestRecoveryAgeDays` so the UI can escalate genuinely stale items instead of hiding them.
4. **Severity:** `incident` iff any incident count > 0 sustained; `recovery_pending` iff only recoveries outstanding; never derive severity from a summed total (the current pill bug at `system-health-pill.tsx:146`).

**Single-source contract test:** grep-based (same pattern as `admin-ops-calm-chrome.test.ts`): `lib/data/system-health.ts`, `app/admin/ops/page.tsx`, and `system-health-pill.tsx` must import from `@/lib/admin/ops-signals`, and no other staff-surface file may query `email_outbox` failure counts directly.

Wire the three consumers to the module (pill popover copy: "2 payment recoveries pending" ≠ red; red is reserved for `incident`). TDD per rule; commit per consumer; PR: `feat(ops): single ops-signals truth module — class-based severity, synthetic-free counts, resolution-cleared recoveries`.

---

## Task 6 — Dashboard Phase 2: exceptions-first `/admin/ops`

**Skill:** `instantmed-ui-browser-verification` (mandatory before sign-off). Recompose only — reuse `CounterCard` / `RecoveryRow` / calm-chrome; no new primitives.

**File:** `app/admin/ops/ops-client.tsx` (+ `page.tsx` data threading).

1. **Exceptions list first:** one "Needs a human" list at the top — every unresolved recovery + active incident row, ordered oldest-first, each with its existing deep-link/action. The five counter cards move below it.
2. **Zero-hide:** counter cards with value 0 collapse into a single "All clear: DLQ, refunds, Parchment, identity" line.
3. **Healthy-collapse:** the 14-day certificate strip and the weekly-invariants cards render inside one `<details>` ("Checks — all passing") when green; expanded automatically only when a check fails.
4. **Ads panel conditional:** render the Google Ads card only when `getGoogleAdsConversionUploadHealth()` reports failures; otherwise a one-line "Ads uploads healthy — details in Overview" link to `/admin/analytics`. (Keep the DB-only read — the no-live-preflight rule on this hot page stands.)
5. Keep `lib/__tests__/admin-ops-calm-chrome.test.ts` and `ops-dashboard-contract` green; update pins where the recompose legitimately moves things.
6. **Browser proof:** dev server on :3060, verify desktop + mobile (375px) + dark mode, screenshot each. Empty-state and one-exception-state both exercised (seed with `showTestData=1` if needed).

PR: `refactor(ops): exceptions-first cockpit — zero-hide counters, healthy-collapse, conditional Ads panel`.

---

## Task 7 — Dashboard Phase 3: ledger + shell polish

**Skill:** `instantmed-ui-browser-verification`.

**File:** `app/admin/intakes/intakes-ledger-client.tsx`, `app/dashboard/layout.tsx` (or wherever the shell titles live).

1. **Fix `isStale` (line ~247):** stale = `updated_at > 4h` **AND** status in the needs-action set `{paid, in_review, needs_doctor, awaiting_script, checkout_failed}`. Completed/approved/declined/cancelled/refunded rows are never stale. Unit-test the predicate (extract it next to the other ledger helpers if it isn't already exported).
2. **Remove the "Mine" chip** (line ~132 + its `case "mine"` branch): its own comment admits it's `Boolean(reviewed_by)` = always-true with one admin. YAGNI — reintroduce as `claimed_by === currentStaffId` only when a second reviewer actually exists. Note the removal in the PR body so it isn't read as a regression.
3. **Rename** the `failed_payment` chip label to `Payment recovery` (it lists historical recovery cases, not live failures). Keep Express/Priority, Refunded, Refund failed chips as-is — do not over-delete.
4. **One shell vocabulary:** `/dashboard` header and admin routes currently disagree ("Doctor console" vs "Admin + Doctor"). Pick one term for the shared staff surface (recommend: "Staff console"), apply everywhere `getStaffNav`/`OperatorShell` renders a title. Contract tests `admin-navigation-contract` / `doctor-navigation-contract` may pin strings — update them in the same commit.
5. Browser-verify ledger chips + empty states, desktop + mobile + dark. PR: `polish(staff): truthful stale flag, drop dead Mine filter, one shell vocabulary`.

---

## Task 8 — Close the loop

1. `pnpm ci` green on final main.
2. Doc maintenance per CLAUDE.md policy: ops-signals module → `docs/ARCHITECTURE.md` (component patterns) + `docs/OPERATIONS.md` (counter definitions); the branch-protection gotcha ("Required check: `build`") → update to `build` + `e2e` (flipped 2026-07-19); run `scripts/sync-agent-doc.sh` + `--check`, commit CLAUDE.md + AGENTS.md together.
3. Verify the synthetic email generator stayed dead: `select count(*) from email_outbox where status='failed' and created_at > now() - interval '24 hours' and to_email ilike '%example.%';` → expect 0 after the next CI run.
4. Report to operator: merged PRs, stranded-recovery outcomes, before/after pill+ops screenshots, the two operator-only reminders (JDM Jul 21, ProductReview FAQ).

## Execution order and why

| Order | Task | Why this rank |
|---|---|---|
| 1 | Tasks 1–2 (lifecycle pair) | Reviews are the #1 GEO/acquisition lever and repeat patients are currently locked out; every day unmerged starves the catch-up queue further. |
| 2 | Task 3 (stranded recovery) | Direct revenue + the customers age off all radar ~Jul 21. Requires Task 2's Spam Act gate first. |
| 3 | Task 4 (hours copy) | Compliance exposure on indexed pages; 30-minute PR. |
| 4 | Task 5 (truth module) | Every later surface builds on honest numbers; kills the false-red pill. |
| 5 | Tasks 6–7 (recompose + polish) | Operator time saved daily, but nothing burns while it waits. |
| 6 | Task 8 (docs/verify) | Same-commit doc rule enforced throughout; this is the sweep. |

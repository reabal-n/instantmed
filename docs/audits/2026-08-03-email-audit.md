# Email System Audit — 2026-08-03

> Full lifecycle audit of every patient-facing email: trigger, timing, frequency, dedup, consent, retry.
> Trigger: an overnight priority patient (paid 00:59, script 10:41 — 9.7h) received one false
> "nearly done" email at 01:45 and then silence, and emailed support twice. The last full email
> audit was 2026-07-06; roughly a third of today's send surfaces postdate it.
>
> **Status: FINDINGS FOR OPERATOR SIGN-OFF.** Nothing in §4/§5 changes send behavior until approved.
> Items marked ✅ shipped same-day (PRs #424 breach auto-refund, toggle quiet hours, overnight copy).

## 1. Shape of the system

Two parallel systems (confirmed, unchanged since 07-06):

1. **React templates** — `lib/email/components/templates/*.tsx` via `sendEmail()`. Outbox rows carry an
   **encrypted frozen provider payload**, so dispatcher retries replay the exact body.
2. **DB templates** — `email_templates` table via `sendTemplateEmail()`. Only **2 of 7 seeded slugs are
   live** (`payment-received`, `refund-processed`). DB-template outbox rows have **no frozen payload** —
   a retry re-renders whatever the admin has since edited (different body than the original send).

Dispatcher: `*/5 min`, max 10 retries, backoff `[0,1,2,5,10,30,60,60,60,60]` min. Reconstruct-parity is
contract-pinned with a known gap: `refund_issued`, `request_approved` (supported but not reconstructable).

38 distinct send surfaces inventoried. Full per-email table in the appendix of the agent sweep; the
findings below reference file:line for everything actionable.

## 2. What a patient actually experiences (journey timelines)

### A. Med cert, auto-approved (the good path)
`T+0` request_received → `T+~15m` certificate email. Clean. (Manual doctor approvals: the "30s undo
delay" is really **30s–5.5min** — the deferred email waits for the next dispatcher tick.)

### B/D. Any request that crosses the night (the complaint path)
```
01:00  request_received
01:45  still_reviewing — "Still on it… nearly done… will have your review done shortly"
       (sent by retry-auto-approval at 45min for ALL categories, despite its med-cert docblock)
       —— SILENCE for 7–8 hours ——
09:00+ outcome email
```
- The 2h `stale-queue` "delay" email **can essentially never fire**: the 45-min cron (every 3 min)
  always wins the race and stamps `follow_up_sent_at`, which suppresses the 2h path. It survives only
  as a backstop for intakes the 45-min path missed (outage, >4h-old backlog, per-run limit).
- The two senders use **different dedup columns** (`follow_up_sent_at` vs `delay_notification_sent_at`)
  with mutual read-guards; no idempotency key; `retry-auto-approval` stamps **even when the send fails**
  (`route.ts:105-108` doesn't check the result — `stale-queue` does).
- ✅ Shipped today: overnight-honest copy variant (no "nearly done"), and for **priority** orders the 3h
  breach auto-refund email breaks the silence with real information.

### E. Declined request (contradictory money promises)
```
T+0        request_declined  — "Full refund guaranteed … within 5–7 business days"
T+seconds  refund-processed  — DB template, "5-10 business days"
```
- **Two refund emails minutes apart with different day-ranges** (5–7 vs 5–10).
- `request-declined.tsx` renders "Full refund guaranteed" **unconditionally** — even for never-paid
  intakes and non-eligible categories (`refund_status = not_eligible`).
- Doctor-issued standalone refunds double-send too: `refund_issued` + `refund-processed`.
- ✅ Shipped today: the breach fee partial no longer triggers the generic `refund-processed` duplicate.

### F. Abandoned / failed checkout
Card-declined: `payment_failed` at T+0 stamps `abandoned_email_sent_at` → suppresses the 20-min nudge →
patient becomes eligible for the 24–72h follow-up. Coherent, but **two webhook events**
(`payment_intent.payment_failed` + `checkout.session.async_payment_failed`) build **different
idempotency keys** for the same failed order → possible double `payment_failed` email.

### G. Post-fulfilment lifecycle
- `review_request`: well-guarded (48h anchor on fulfilment, 120d catch-up, 30d patient cooldown,
  10:00 Sydney send, idempotency key + one-shot marker). The healthy reference implementation.
- `cert_reactivation` + `refill_reminder`: **cron-scheduled daily but ship disabled** behind env flags —
  both no-op every day. Decide: enable or unschedule.
- `review-request-backfill`: **scheduled monthly (`0 3 1 * *`) but defaults to dry-run** — the
  scheduled invocation can never send anything (its own docblock says "NOT on a Vercel schedule").

## 3. Ranked findings

### P0 — a patient sees something false or contradictory
| # | Finding | Where | Status |
|---|---|---|---|
| 1 | "Nearly done / done shortly" at 01:45 before an 8h wait | `still-reviewing.tsx` (one template, both crons) | ✅ fixed today (overnight variant) |
| 2 | Priority buys nothing overnight; angriest-customer generator | queue-sort only; no comms/SLA wiring | ✅ fixed today (3h auto-refund + email + quiet hours) |
| 3 | Decline sends two refund emails with conflicting day-ranges (5–7 vs 5–10) | `request-declined.tsx:256-262` vs `refund-processed` DB body | Proposal §4.1 |
| 4 | "Full refund guaranteed" renders even when nothing is refundable | `request-declined.tsx` unconditional block | Proposal §4.1 |
| 5 | `request_received` says "we'll email you once … approved" — framing breaks on the decline path | `request-received.tsx:75-77` | Proposal §4.1 |

### P1 — reliability / duplicate-send mechanics
| # | Finding | Where |
|---|---|---|
| 6 | `still_reviewing`: two senders, two dedup columns, no idempotency key, non-atomic read→send→stamp, both crons can fire at :00 | `retry-auto-approval/route.ts:41-113`, `stale-queue/route.ts:144-208` |
| 7 | `retry-auto-approval` stamps `follow_up_sent_at` even when the send failed (patient never gets a retry) | `route.ts:105-108` |
| 8 | `request_declined` has **three** senders, zero shared dedup, none keyed; one (`notifyRequestStatusChange`) has zero callers | `decline-intake.ts:258`, `send-status.ts:139`, `notifications/service.ts:127` |
| 9 | `script_sent` dedup is a read-then-write outbox SELECT — two concurrent clicks double-send | `app/doctor/queue/actions.ts:196-207` |
| 10 | `payment_failed` can double-fire across the two Stripe failure events | both handlers, different `checkoutSessionId` sources |
| 11 | Reconstruct gaps: `refund_issued`, `request_approved` supported-but-unreconstructable (pinned debt); payload-less rows burn all 10 retries | `KNOWN_RECONSTRUCT_GAP` |
| 12 | DB-template retries re-render post-edit content (no frozen payload) | `template-sender.ts:255/279` |
| 13 | `?testEmail=` bypasses send marketing-classified email with **no List-Unsubscribe header** and skip the enable flags | `cert-reactivation.ts:201`, `refill-reminder.ts:202` |
| 14 | Marketing opt-out **consumes the one-shot marker** — an opted-out patient who later opts back in has permanently lost that nudge | `cert-reactivation.ts:159`, `refill-reminder.ts:149` |

### P2 — hygiene / dead surface
| # | Finding |
|---|---|
| 15 | Dead types with full plumbing: `payment_confirmed`, `guest_complete_account`, `consult_approved` (template only reachable via an internal route nothing calls), `generic` |
| 16 | 4 seeded DB-template slugs editable in the admin UI but sent by nothing (`certificate-issued`, `request-approved`, `request-declined`, `prescription-ready`) |
| 17 | `sequence-registry.ts` describes a "20-40m nudge" cadence and statuses that don't match the code — the registry that documents sequences is itself drifted |
| 18 | Docblock contradictions: retry-auto-approval claims med-cert-only; backfill route claims "NOT on a Vercel schedule"; still-reviewing header claims 45min-only |
| 19 | `heard_about_us_backfill` dedup is an unbounded outbox scan; only marketing type without a DB-idempotent key |
| 20 | Senders with no dedup at all: reissue-cert, employer email, needs-more-info, request-declined, refund-issued, refund-processed, payment-received resend |
| 21 | Auth/magic-link family bypasses the outbox entirely (no dispatcher retry, no suppression check) — by design, but invisible in outbox stats |

## 4. Proposed target state (needs sign-off — nothing applied)

### 4.1 One honest voice about money and outcomes (P0 batch, ~half day)
- Unify refund timing copy to **5–10 business days** everywhere (matches Stripe reality; the breach
  email already says it).
- `request_declined`: render the refund block **conditionally** (paid + eligible → "full refund, 5–10
  days"; else no refund promise), and suppress the generic `refund-processed` duplicate when a tailored
  decline/refund email exists — same pattern shipped for the breach fee today.
- Same suppression for `refund_issued` + `refund-processed` double.
- Soften `request_received` to "we'll email you the moment the review is complete" (outcome-neutral).

### 4.2 One owner for "still reviewing" (P1 batch, ~half day)
- Single sender (keep the 45-min retry-auto-approval path since it always wins), **one** dedup column,
  idempotency key `still-reviewing:<intakeId>`, stamp only on send success/outbox receipt; stale-queue
  keeps only the >4h backstop with the same key. Fix the three lying docblocks in the same commit.

### 4.3 Overnight cadence decision (operator call)
Today a non-priority overnight patient gets: receipt → honest 45-min wait note → outcome. Optional
addition: one **morning update** (~9–10am Sydney) for any intake still undecided that was submitted
overnight — "you're near the front of this morning's queue." One email, honest, kills the 8h dead air
for the ~4/month overnight non-priority orders. Cheap to build on the stale-queue scan. Yes/no?

### 4.4 Mechanical dedup keys (P1, ~1 day across a few PRs)
`script_sent` (atomic claim or key), `payment_failed` (session-id-stable key across both events),
decline/needs-info/reissue/employer sends (per-intake keys), delete the zero-caller decline sender.

### 4.5 Hygiene sweep (P2, when convenient)
Delete dead email types + dead DB slugs (separately scoped, per CLAUDE.md remove-only-in-scoped-cleanup
rule), fix `sequence-registry.ts` or delete it, bound the heard-about-us dedup scan, add unsubscribe
headers to test bypasses (or gate them out of marketing types), decide enable-or-unschedule for
`cert_reactivation` / `refill_reminder` / `review-request-backfill`.

## 5. Decisions needed from the operator

1. §4.1 copy unification + duplicate-refund-email suppression — approve?
2. §4.2 still-reviewing single-owner refactor — approve?
3. §4.3 morning-update email for overnight submissions — build or skip?
4. §4.5: `cert_reactivation` + `refill_reminder` — enable (they've shipped disabled for ~6 weeks) or
   remove their schedules? `review-request-backfill` — flip the scheduled run to real sends or delete
   the schedule?
5. Opt-out marker semantics (#14): keep "opt-out consumes the nudge" or defer evaluation?

## 6. Same-day context (already shipped, separate PRs)

- **Breach auto-refund**: priority intakes undecided 3h+ → $9.95 auto-refund + honest email + approval-email
  acknowledgment + decline top-up interaction fixed (`partially_refunded` now refundable; accumulation bug fixed).
- **Priority quiet hours**: toggle hidden 00:00–08:59 Sydney (silent, no public copy).
- **Overnight still-reviewing variant**: "nearly done" retired; overnight sends set honest expectations.

Method note: two parallel read-only sweeps (full inventory + journey reconstruction) over the working
tree at `85a0004fb`, plus 60-day production timing data (overnight reviews average 5.8× daytime;
priority P95 11.45h vs standard 5.25h — n=59, non-med-cert).

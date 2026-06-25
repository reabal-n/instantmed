# InstantMed Scale Re-Audit — 2026-06-08

11-lens workflow (finders → adversarial verifiers → synthesis), run against current code **after** PRs #94–#110 shipped most of the 2026-06-07 audit. 50 raw findings, 28 confirmed-live after verification. This file records the findings, what was auto-fixed this session, and the strategic decisions still open.

## The headline

Three months stuck is not a bug list. It is two structural ceilings:
1. **LTV = 1 order.** No reactivation/refill email exists, so every order is CAC-bound forever against ROAS-0.18 ads.
2. **Only med-certs auto-approve.** Every higher-AOV path (Rx, ED, hair loss) is 100% owner-in-the-loop, so revenue scales only with the owner's clinical hours.

Fix those two and the plateau breaks without spending a dollar more on ads. Everything else is leak-plugging.

---

## Shipped this session (Bucket A — safe, file-scoped)

| Commit | What | Finding |
|--------|------|---------|
| `fix(parchment): repair build-breakers` | `cn()` import missing (would fail Vercel build) + webhook test mocked `getParchmentEnvironment` undefined (5 failing tests). Both from the prior two parchment commits that bypassed branch protection. | regression |
| `fix(money): finance refunds + Express on retry` | Finance dashboard summed `amount_cents` for refunds (over-reports, wrong on partials) → sum `refund_amount_cents`. Payment retry dropped the $9.95 Express line item → re-append on `is_priority`. | #13, #14 |
| `perf(staff): script_tasks scope + parallelize count/data` | `script_tasks` global newest-1000 scan silently dropped a patient's last script past 1k rows → patient-scoped `.in("intake_id")`. Queue + ledger ran COUNT then data serially → `Promise.all`. | #11, #24 |
| `fix(phi): camelCase scrub + encryption flags preflight` | PHI scrubber compared `key.toLowerCase()` against a camelCase list → camelCase PHI (firstName, fullName, etc.) shipped to Sentry in cleartext. Normalized to lowercase Sets + first test coverage. Pinned `PHI_ENCRYPTION_WRITE/READ_ENABLED` as prod-required. | #18, #9 |
| `chore(dead-code): delete 9 orphans + sync docs` | Deleted Twilio SMS, `document-retry-queue` (phantom table), 3 monitoring orphans, AHPRA `registry-client`, `consult-faq`, `create-profile` (SEC-2 footgun). Added `support` to UserRole union (SEC-3). Net −924 lines. | #28, SEC-2/3 |
| `fix(regression+analytics): checkout_failed pin + consult double-fire` | DB-trigger test now pins `checkout_failed→paid` (the 10-day incident surface). Stopped consult double-counting `checkout_viewed`. | #10, #19 (half) |

### PHI encryption preflight — operator note
`PHI_ENCRYPTION_WRITE_ENABLED` and `PHI_ENCRYPTION_READ_ENABLED` are now prod-required. **If the next production deploy fails this gate, it means those two vars are unset in Vercel — set them to `true`.** That is the gate working (refusing to ship with PHI half-encrypted), not a false alarm.

---

## Held for an explicit decision (did NOT touch)

- **`lib/env.ts`** + its 2 `vi.mock` blocks — global test-setup entanglement, near-zero value. Skip or delete-with-care.
- **`lib/clinical/approval-invariants.ts`** — has a readiness-gate test; the live path already fails-closed on PDF-gen failure, so wiring it would be redundant. Decide: delete (remove false confidence) vs keep.
- **`lib/clinical/decision-support.ts`** — unwired drug-interaction checker. Wire vs delete.
- **`lib/monitoring/intake-abandonment.ts`** (`trackEnhancedAbandon`, zero callers) — needed to *size* recovery gaps. Wire vs delete.
- **`lib/data/cache.ts`** — 176-line SWR toolkit, dead. Adopt on one hot read or delete.

---

## Bucket B — strategic decisions (your call)

**B1 — Reactivation/refill email. THE lever. Recommend SHIP.** Repeat-Rx refill reminder timed to supply window (25/55/85d) first, then med-cert winback. One cron + one template + one `*_email_sent_at` guard, gated by `canSendMarketingEmail`. Only mechanism that makes LTV > 1. ~$0 CAC.

**B2 — Widen auto-approval past med certs. Recommend one-tap Rx confirm lane, NOT auto-issue.** Start with repeat scripts of a non-S4/S8 med the patient already holds an active script for (`renewal-detection.ts` flags these) → doctor confirms in one tap. Cuts per-case minutes, keeps the doctor in the loop (medico-legal). Effort L; own workstream after B1.

**B3 — Guest checkout triad (do together).** (1) guest calls shared `runClinicalValidation` (closes the forked safety gate), (2) rebuild a fresh Stripe session on retryable guest `checkout_failed`, (3) unauthenticated signed-token `/resume/[token]` + broaden abandoned-checkout finders to include `checkout_failed`. ~30–70 recovered purchases/90d on the 73%-volume path + de-risks a clinical gate.

**B4 — Server-side high-stakes med-cert block. Recommend wire `validateIntake`.** Today court/exam/fitness certs are charged then auto-declined for a 100% refund (pure toil + double Stripe fees). Wiring the dead `validateIntake()` into the server med-cert branch closes it AND removes a dead "hard block" that looks live.

**B5 — S8 net on ED/hair-loss free-text. NUANCE FLAGGED.** The audit recommended adding `current_medications`/`hairAdditionalInfo` to the controlled-substance blocklist. **Caution: `current_medications` is disclosure (what the patient already takes), not a request.** Blocking checkout because someone honestly discloses a benzo would falsely block legitimate ED patients and cost the $49.95 conversion. Decide which fields are *request* fields (block) vs *disclosure* fields (don't) before shipping. ED meds are S4, not S8 — the real S8 risk surface here is narrow.

**B6 — ED + hair-loss dead-CTA fix + shared validation hook.** #106 fixed the silent-disabled-CTA pattern for med-cert/Rx but never reached ED (4 steps) or hair-loss (4 steps), the 2nd/3rd revenue paths, mobile-concentrated. Extract `useStepValidationSummary` then roll all 8 steps. Keep the nitrate hard-block screen unchanged.

**B7 — AOV reframes.** Historical state at audit time: Express needed a 2-option choice card (no SLA promise); med-cert tier anchoring at the selector. Cheapest revenue-per-order lifts; compound with ad spend. Run `/clarify` on copy. Terminology/status note added 2026-06-25: Express is now labelled Priority review, and the full-width choice row shipped in `79b8ab286`.

**B8 — In-app doctor provisioning.** `inviteDoctorAction` (Supabase invite + profiles row + capability defaults + Parchment linking). Build before onboarding doctor #2 — gates B2's capacity track.

**B9 — Low-priority:** referral-credit restore on refund (do next time you touch refund code); `cache.ts` adopt-or-delete; god-file splits (`queue/actions.ts`, `queue-client.tsx`) — fold into the next feature that touches them, never schedule standalone.

---

## Footnote — verified NOT problems
- #94–110 shipped most of the 2026-06-07 audit (refund money bug, `/api/search` scope, S8 consult block, PostHog pixel, symptoms chips, PAY-button rollout, price alarm, Google Ads CAPI fix, multi-channel attribution).
- `validateIntake` dead is real, but the live path fails-closed on PDF-gen failure — `approval-invariants` wiring would be redundant.
- `refund_status` enum genuinely lacks `'refunded'` (modeled via `payment_status`); `escalated` status is dead (zero writers, latent only).

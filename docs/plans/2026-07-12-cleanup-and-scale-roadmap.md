# Cleanup & Scale Roadmap — 2026-07-12

> **Status:** Proposed. Awaiting first-session kickoff.
> **Operator intent (2026-07-12):** mostly break the demand ceiling, a bit of reliability, all of the cleanup. Keep it simple. Each demand lever runs as its own focused session. Ask before decisions.

## Context (why this shape)

InstantMed is **demand-capped**, not system-capped: ~$1.3k/mo, ~44 orders in June, ceiling ~$1–1.6k/mo as a solo operator. The funnel is mostly fixed. So "scale" is a growth question (new patients + harvest existing), and the system work is light — hardening + paying down known debt, not re-architecting.

Two tracks below. **Track A** is the four demand levers in priority order (one session each). **Track B** is cleanup + the bit of reliability, in risk order. Effort tags: **S** ≈ half-day, **M** ≈ 1–2 sessions, **L** ≈ multi-session.

## How to use this doc

Each session: read this file, take the **top unstarted item**, spec it in-session, execute, then mark it done here and note the outcome. Don't batch levers — they're deliberately separate so each gets a focused pass.

---

## Track A — Demand (mostly the operator's #1)

### A1. Get cited by AI · M · **do first**
- **Goal:** more new patients from AI answers (ChatGPT / Gemini / AI-Overviews recommending InstantMed).
- **Why #1:** AI referrals are the only free channel that's *growing* (~doubling MoM, best AOV), and Gemini / AI-Overviews cite us at ~0% today — pure headroom at near-zero cost. Semrush AI-visibility was ~14/100 (ChatGPT-only).
- **First moves:** fill the **ProductReview** listing (live but empty — the keystone AU LLM-read surface); get onto the AU comparison/directory surfaces LLMs cite; make sure `llms.txt` + the org `sameAs`/entity graph carry current structured facts (price, turnaround, what we treat, eligibility). Re-check Semrush AI-visibility as the scoreboard.
- **Open decision:** which 2–3 external surfaces to target first (ProductReview is a given).

### A2. Reactivation / repeat orders · S
- **Goal:** past patients reorder. Cheapest revenue per hour; zero acquisition cost.
- **Why #2:** infra already exists — the crons just fire to ~zero. Slot early *because* it's tiny effort, even though the ceiling is small (~8% ever reorder; a cert wave sent 45 / returned 0; the refill flag had been blank).
- **First moves:** verify `CERT_REACTIVATION_EMAILS_ENABLED` + `REFILL_REMINDER_EMAILS_ENABLED` are on and the crons (`/api/cron/cert-reactivation`, `/api/cron/refill-reminders`) actually send + are measured; check consent/dedup gating isn't silently zeroing them; instrument reorders so the effect is visible. If it stays ~zero after fixing plumbing, **stop** — don't over-invest a small-ceiling lever.
- **Open decision (flagged for operator):** run this before or after paid ads — I put it before (cheaper, zero-risk).

### A3. Scale paid ads · M · **gated**
- **Goal:** buy new patients profitably now that the funnel + conversion tracking are tight.
- **Why #3, not higher:** the only lever that costs real money, and historical ROAS was underwater (~0.18). It earns a bigger budget only once the math proves out.
- **Hard gate:** first compute whether a paid order is profitable today (AOV − CAC, with the tightened tracking). **Do not raise spend before showing the operator that number.** If profitable, raise spend on the winning campaign(s) and/or add Bing; if not, leave spend where it is.
- **Standing note:** ads are already live and stay on — this is about *scaling*, not turning on.

### A4. Organic SEO depth · L
- **Goal:** rank for more "med cert / online script [city]" and condition queries.
- **Why last:** slowest to pay off (months), but durable and free — it compounds in the background while faster levers run.
- **First moves:** re-key + internally link the **orphaned geo pages** (many deep, few indexed, ~0 links from money pages); deepen the health guides per the article template; watch GSC indexed count as the scoreboard.

---

## Track B — Cleanup (all of it) + the bit of reliability

### B1. Close the open audit findings · S–M · **do first in this track**
Known, bounded, money/PHI-adjacent items from the 2026-07-10/11 reviews:
- **Batch-review attestation only resolvable from `/dashboard`** — the full-record (`/doctor/intakes/[id]`, `/admin/intakes/[id]`) and admin-ledger cockpits render `IntakeReviewCockpit` without `onBatchReviewResolved`, so a doctor working from a full record can't clear the obligation → the cert ages into a false critical overdue alert. Thread the callback through those surfaces (and give the attestation an issued-PDF view).
- **E2E fixtures leaking into prod reads** — the batch-review E2E fixture re-points to a `randomUUID()` patient, escaping `filterSeededE2EIntakes` (patient-id keyed), so a crashed teardown leaves a test intake in real ops reads (seen in the ledger). Make the seeded-data boundary reference-prefix aware, or scope fixtures to the canonical seeded patient.
- **Hardcoded price table in the revenue readout** — `buildMonetisationReadouts` (`lib/data/revenue-dashboard.ts`) hardcodes `{2495/2995/3995}` + `995`; the test pins the same literals, so a price change leaves both green while the readout silently decays. Derive from `PRICING`.
- **Cert-revoke without `TypedConfirmDialog`** — the batch-review attestation revoke is a ≥5-char reason + click; CLAUDE.md names cert-revoke as a typed-confirm action. Wrap it.
- **Orphaned soft-flags** — `getPendingBatchReviews` dropped the `ai_audit_log` softFlags join; the "engine flagged this" signal now has zero consumers. Re-surface or delete.
- **`parseInt(formatOldestAge())` overdue check** in the batch-review banner — harmless today, latent time bomb; switch to `isBatchReviewOverdue`.

### B2. Reliability + perf (the bit of #2) · S–M
- `unstable_cache` (short TTL + `revalidateStaff` tags) on the read-mostly dashboard queries — `getSystemHealth`, `getTodayEarnings`, `getFormToInboxStats` — so Dashboard/Ledger hops stop re-running them cold.
- Trim the middleware Supabase session refresh on `.rsc`/prefetch soft-navigations so each soft nav doesn't pay a full `getUser()`.
- *Compounds the 2026-07-12 nav-lag fixes (auto-prefetch + `cache()`d auth); makes higher volume cheaper to serve.*

### B3. Broad tech-debt sweep · M · last
- Dead code, orphaned files (`scripts/check-orphaned-files.sh`), duplicated logic, stale docs, unused deps. Lowest per-item risk — do last or in spare cycles.

---

## Sequencing at a glance

**Recommended run order:** A1 → A2 → B1 → A3(gated) → B2 → A4 → B3.

Rationale: lead with the highest-leverage free growth (A1) and the free quick win (A2); slot the real-risk cleanup (B1) before spending money (A3); then the compounding-but-slow work (B2, A4) and background debt (B3).

**Two calls left for the operator:**
1. Reactivation (A2) before paid ads (A3)? — recommended yes (cheaper, zero-risk).
2. Paid ads stays gated on the profitability number — no spend increase without it.

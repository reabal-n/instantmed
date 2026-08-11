# Safe Scale Readiness Remediation Decision Record

> **Status:** Fable-reviewed and narrowed on 2026-08-11. This is a historical decision record, not an executable programme. `docs/ROADMAP.md` remains the sole active priority queue.

## Decision

The original seven-release programme overbuilt the accounting and Ads-hold problems. Keep the verified high-risk corrections and use the smallest robust implementation for the remaining reporting, replay-security, and review-choice gaps.

The approved direction is:

- keep the atomic auto-issued certificate correction and the code-owned Scripts attribution hold;
- keep exact AI-source classification and origin-only external referrer storage;
- fix refund reporting in existing readers instead of introducing a new cash-movement ledger;
- repair service-role policy scope in the baseline replay file without a production convergence migration; and
- give the dashboard review nudge the same two explicit destinations as the delivered-document review card, without changing the active copy experiment or its dimensions.

PRs #462 through #467 contain the already-shipped or queued slices. Their current merge and production state must be verified from GitHub and deployment receipts rather than inferred from this record.

## Remaining bounded fixes

### 1. Refund reporting truth

Fix the existing reporting readers only:

- A later failed retry must not erase a refund amount that was already recorded as succeeded. A refund is omitted only when there is no positive `refund_amount_cents` or no `refunded_at` timestamp.
- Dashboard and Ads economics must use the same event-window semantics: purchases enter by `paid_at`; recorded refunds leave by `refunded_at`, including refunds against purchases paid before the window.
- Ads purchase reads must therefore include rows selected by either relevant purchase time or relevant refund time, while order and gross counts remain purchase-window scoped.
- Keep seeded/test and `exclude_from_reporting` exclusions on every reporting read.

This is reporting-layer work. Do not change refund writers or Stripe payment state.

### 2. Baseline replay ACL class

Production was verified safe on 2026-08-11. Repair the clean-replay baseline so permissive `FOR ALL USING (true)` service policies are explicitly scoped to `service_role`, and add a contract test that rejects future role-less instances. Do not add a tail migration solely to restate production's existing posture.

### 3. Review-nudge destination parity

Keep the keyed review email on the hardened direct 302. In authenticated in-app cards:

- show ProductReview first and Google second;
- use labelled, keyboard-focusable controls with at least 44px mobile targets;
- preserve the nudge's existing `patient_dashboard / review_card / review` dimensions;
- preserve the delivered-document card's existing `post_delivery` medium;
- keep the #396 copy experiment and all show/dismiss analytics unchanged; and
- treat destination clicks and external review totals as separate aggregate, directional measures.

## Explicitly deferred or rejected

- Do not build `stripe_cash_movements`, new refund/dispute webhook subscriptions, or a reconciliation CLI now. The 2026-08-11 evidence was zero disputes all-time and $479.15 of refunds in 90 days. Revisit after the first real dispute or when 90-day refund value rises by roughly an order of magnitude.
- Do not remove or rename `post_delivery`; it is a first-class historical measurement dimension.
- Do not add a keyed-email review interstitial, posted-review attribution, per-destination completion rates, or one-to-one review attribution.
- Do not rewrite the active review-request copy while its mid-August measurement window remains open.
- Do not build a database-backed Ads-hold control plane while the reviewed code-owned hold provides the required fail-closed behaviour.

## Gates that remain independent

- Keep `GOOGLE_ADS_AGENT_MUTATIONS_ENABLED=false` and `TELEGRAM_ADS_APPROVALS_ENABLED=false` until the existing proof and exact-packet approval gates pass.
- A GREEN tracking day does not clear the Scripts `CROSS_SERVICE_ATTRIBUTION` hold.
- Weight Management remains organic-only; no campaign, paid keyword, or paid medicine term is authorised.
- Protocol medical-certificate issuance remains paused. Historical correction safety does not authorise reactivation.
- Google Ads changes, production migrations, external sends, and listing edits still require fresh approval for the exact action.

## Completion proof

The three remaining fixes are complete only when their focused tests pass, the baseline migration checker passes, the patient review cards are verified at mobile and desktop sizes in light and dark mode, hosted CI is green, and the resulting PR is merged. No production accounting, Ads, Stripe endpoint, or database mutation is part of these fixes.

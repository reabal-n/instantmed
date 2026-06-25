# 2026-06-11 Hygiene + Business Review (12-agent)

> Ultracode review: 3 live-state verifiers (Supabase/Sentry/repo), 5 hygiene agents on never-audited dimensions (deps security, dead exports, test gaps, perf/a11y, email deliverability), 4 forward-looking business agents (women's health prep, AOV levers, GEO scorecard, solo-operator resilience). Deliberately did NOT re-audit ground covered by the 2026-06-07/08/10 audits. Severity: P0 live money/safety bug · P1 material risk/revenue · P2 soon · P3 hygiene.

## 0. Fixed during this review (already on main)

- **Manifest consolidation** (296b19373): static `public/manifest.webmanifest` (stale $19.95, diverged branding) deleted; `app/manifest.ts` is the single source, price now dynamic via `PRICING_DISPLAY`. Verified serving live.
- **Voice-guard break on main** (8da453b81): the consolidation carried the static file's em-dash into a scanned `.ts` file → suite red on main for ~2h. Fixed; 3,239 tests green. (Found by this review's own test-gaps agent.)
- **Weight-loss client** documented as gated-future (kept per operator decision), guard test green.
- Earlier same-day: stale $19.95 sweep (manifest/request-page/docs), about-page general-consult copy, dead `lib/security/attestation.ts` deleted, CLAUDE.md migration block corrected (296b19373^, 20bd86ee3).

## 1. P0 — operator action required (5 minutes)

### Express Review fee has never been collected; the env var is the last unknown
- **History (all verified):** `STRIPE_PRICE_PRIORITY_FEE` in prod carried a trailing newline → Stripe rejected it → **3 checkouts died** (Apr 6 ×2, May 15) with `No such price: 'price_1TIezCEQlW1XRiLn7kexFfUP\n'`. Code-side trim fix shipped 2026-05-15 (`c7b771adc`, `normalizeStripePriceId`). But the Jun 6–7 priority orders charged **base only** — the var was evidently absent from prod in that window (`checkout.ts:158` falls back to base + error log). PostHog 60d: 27 Express opt-ins → 2 paid, **$0 in fees ever**.
- **Current state:** the var was re-created in Vercel Production **~17:30 AEST Jun 11** (9h before review) as Encrypted/sensitive — the exact mode where CLI 54.x silently stored EMPTY values before (documented gotcha). The price ID itself is **valid live** (`pnpm check:integrations` validates it as `one_time`). I was permission-blocked from overwriting prod env autonomously.
- **Your one-liner (or approve me to run it):**
  ```
  vercel env add STRIPE_PRICE_PRIORITY_FEE production --value "price_1TIezCEQlW1XRiLn7kexFfUP" --no-sensitive --force
  ```
  Then any deploy picks it up (one just shipped). **Verify:** `/admin/features` price-config health shows the priority fee OK, then one Express test checkout charges base + $9.95.
- **Follow-up (Claude, after env confirmed):** promote the Express toggle from the 11px pill in the order summary to a full-width option row above the pay button (compliant copy, no SLA promise) + a toggle-off event. Current attach: 1.9%. Expected +$45–90/mo at 10–20% attach. 2h.

Terminology/status note added 2026-06-25: this historical review used "Express Review". The current UI label is "Priority review", and the full-width choice row later shipped in `79b8ab286`.

## 2. P1 — this week

| # | Finding | Evidence | Fix | Owner · effort |
|---|---|---|---|---|
| 1 | **FAQ answers absent from served HTML on ALL money pages** — the GEO blocker, confirmed by curl on prod | Radix Accordion unmounts closed content; `components/sections/faq-section.tsx:56` has no `defaultValue`/`forceMount`. Questions render, answers exist only in JSON-LD + RSC payload → invisible to Bingbot (= ChatGPT grounding) | `forceMount` + `data-[state=closed]:hidden` in `components/ui/accordion.tsx` AccordionContent; one change covers med-cert/ED/hair/prescriptions; verify with curl + script-strip | CL · 2h |
| 2 | **Auto-approval ignores `doctor_available`** — certs keep issuing under the offline doctor's name (medico-legal) | `lib/clinical/auto-approval-pipeline.ts:495-508` doctor pool never checks the toggle; DOCTOR_ONBOARDING §6 confirms toggle only hides the queue | Add `doctor_available` filter + contract test; existing `no_doctor_available` retry path handles empty pool | CL · 1h |
| 3 | **B4 still open: no server-side high-stakes block** — payment taken before any enforcement; flag invisible to doctor | `runClinicalValidation` has zero high-stakes check; `checkHighStakesUseCase` only fires client-side (and only if ≥10 chars); `auto_approval_state_reason` rendered nowhere in doctor UI | Add `checkHighStakesUseCase` to the med-cert branch of `runClinicalValidation` (block pre-payment, reuse redirect copy) + render the reason as a chip on intake detail | CL · 0.5d |
| 4 | **Telegram fallback never proven + it's the ONLY pager until Sentry resets (~Jun 13)** | Sentry ingestion still dead since Jun 6 (verified); strict `==="1"` gate on an unverifiable encrypted value; send-failure still burns the 4h cooldown row | Fire `sendTelegramTestAlert` end-to-end once; fix cooldown-row-on-failure (30m); after Sentry resets, add per-key rate limit on the CSP DSN | OP 15m + CL 30m |
| 5 | **Review-email still targets Google only** — the GEO keystone retarget not shipped | `app/api/review-redirect/route.ts:45` → `GOOGLE_REVIEW_URL` only | ProductReview URL + monthly PR↔Trustpilot rotation in the redirect; Google ask stays in approval email | CL · 0.5d |
| 6 | **Cross-sell probe invisible to guests + no impression event** | `related-services-probe.tsx` only on `/patient/intakes/success`; guests (majority) land on `/auth/complete-account`; click-only event, 0 fired | Render on complete-account too + add `_shown` event. ED/hair $49.95 vs $26.78 mean AOV; +$50–100/mo at 1–2 conversions | CL · 2h |
| 7 | **Refund action completely untested** — $100 support cap, 3/24h limit, top-up idempotency all unguarded | Zero matches for `issueRefundAction` in tests; contrast decline path (412-line suite) | `issue-refund-action.test.ts` mirroring the decline-suite mocks | CL · 3h |
| 8 | **SLA breached 3× in 14d** (certs at 44–47h on the Jun 5–6 offline day) | 14d P95: med-cert 44.5h vs 24h max | Covered by #4 (proven pager) + resilience items §5; consider a "reviews delayed today" banner toggle | OP+CL |
| 9 | **PHI keys have no escrow** — backups are ciphertext without them | Keys exist only as Vercel env; zero escrow/break-glass docs | Print/seal `PHI_MASTER_KEY` + `ENCRYPTION_KEY` + 2FA recovery codes → safe/solicitor; pointer (not value) in SECURITY.md | OP · 30m |

## 3. P2 — this month (quick wins first)

- **RFC 8058 one-click unsubscribe broken** (Gmail's native button 400s → users hit Report-spam instead): POST handler ignores query-string token. 30m, + unit test. Related: bump unsubscribe token TTL 30→90d (15m); add `refill_reminder`/`heard_about_us_backfill` to dispatcher SUPPORTED_EMAIL_TYPES (1h); add `rua=` to DMARC (15m — policy is already p=reject, best-in-class).
- **Wizard a11y triad:** StepBlockedSummary scroll-into-view inside the component (fixes 4 steps, 1h) · focus/scroll management on step change (1–2h) · roving tabindex/arrow keys on `role=radio` groups or swap to Radix RadioGroup (3h).
- **State-machine parity contract test** (app layer vs DB trigger — the exact 2026-06-09 incident class, 2h) · checkout safety-ordering assertions (2h) · `execute-cert-approval` unit tests + remove coverage exclusion (4h) · extend coverage scope to lib/stripe + intake-lifecycle (1h).
- **PRICING_DISPLAY debt:** ~89 hardcoded price strings remain; top: `med-cert-intent-config.ts` (41), `audience-pages.ts` (8). Template-literal sweep covers 55% — **do before the floor-price verdict (~Jun 16)** or the revert costs another 41-string sweep. 2h.
- **Duration-nudge measurability:** `certificate_duration_selected` event dead since May 22; nudge has no `_shown` event. 1h. Judge on DB mix after ~30 orders.
- **Referral surface:** 0 events/credits in 5 months. Remove ReferralCard from the success page (it competes with heard-about-us + probe for the best slot); keep dashboard-only. 30m.
- **Refill window:** widen 25–30d → 25–40d (median true-return is 34d) + one-off manual send to the 11 stranded May-cohort scripts (~$30–90). 1h.
- **Dead-man auto-pause** (resilience): stale-queue cron auto-sets `disable_repeat_scripts`/`disable_consults` + urgent notice when oldest paid intake >24h AND no doctor action in 24h. 4h.
- **Break-glass doc** `docs/runbooks/BREAK_GLASS.md` (account inventory, flag procedure, no secrets) + complaints@/support@ auto-ack (published 24h SLA has no machinery). 2h + 30m.
- **Off-platform backup:** monthly pg_dump (encrypted, ~$1/mo storage) — Supabase-account loss currently defeats all backups; verify PITR add-on status. 3h.
- **E2E debt:** `service-hub.spec.ts` tests retired General Consult (guaranteed fail) — fix now; triage the ~14 April-era specs in one pass (~1d). Promote service-hub + guest-checkout to blocking once green.
- **GEO plumbing not yet shipped:** robots ClaudeBot/Claude-SearchBot/Perplexity-User lines (30m) · real sitemap lastmod (2h) · internal descriptive anchors to money pages (part of plan 1.4) · compare-page upgrade+reindex (1–2d, needs your icebox-exception confirm). Note: scorecard found QR-on-cert, /consult canonical, and www-301 were **already shipped pre-plan** — plan items 3.1/parts of 1.4 are done.

## 4. P3 — batched cleanup (one PR each)

- **Unused deps:** `pnpm remove resend next-mdx-remote recharts` + `-D tw-animate-css` + delete `components/charts/lazy-charts.tsx` + drop the `resend>svix` override (keep direct `svix`). Gate on typecheck+build.
- **Dead modules:** `lib/seo/symptoms.ts` (610 lines, memory-flagged orphan — confirmed), `lib/marketing/services.ts` (301 lines), zombie trio `speed-claims.ts`/`ed-prevalence-data.ts`/`review-ticker-data.ts` (+ their tests; review-ticker is testimonial-format data on an AHPRA-bound platform — delete before someone wires it), ~25 dead exports (list in agent output), `generalConsultFunnelConfig`.
- **Orphaned assets ~2.5MB:** 3 unregistered blog image dirs, 7 Lottie JSONs, notification.mp3, ~13 unreferenced logos (incl. RACGP — display is banned anyway, delete to prevent re-use), placeholder.svg. Verified false-positives to KEEP: stickers/, norwood/, resources/, IndexNow key file.
- **8 stale remote branches** (all merged PR heads): bulk delete.
- **Docs:** OPERATIONS.md falsely claims emergency-flags cron sends SMS (it Sentry-logs only); 9 pnpm.overrides undocumented in the Stack Pin table; `supabase migration repair` for the cosmetic duplicate tracker row; in-the-middle deps need a keep-rationale comment (Sentry OTel hoisting — do NOT remove blindly).
- **Empty-sitemap GSC errors:** remove the 4 iceboxed sitemap URLs from `app/robots.ts` + delete the GSC registrations (10m).

## 5. Business state (verified live)

- **June is 2.6× May:** 2.1 orders/$60.40 per day (Jun 1–10) vs 0.81/$23.51 (May) — with ads paused. AOV flat ~$29.
- **Floor-price test: no kill signal** (first $24.95 cert sold within 16h; post-change rate above baseline) but n=2 — verdict ~Jun 16.
- **heard_about_us: measurement effectively started Jun 10** (the shown-beacon was dead on the guest surface day 1; #124 fixed it). Trigger: if 0 answers after ~20 tracked impressions, move the card above the fold (it currently renders below the primary CTA, likely off-screen on mobile).
- **Refund rate 11% of orders** (30d, n=45) — consistent with 100%-refund-on-decline; watch decline reasons for screen-out opportunities.
- **Sentry blind until ~Jun 13 quota reset;** Parchment webhook match-failures (28+26 events) unresolved pre-blackout — triage post-reset.
- **Email posture is strong** (SPF -all, DKIM, DMARC p=reject; consent gating + bounce suppression verified) apart from the §3 one-click-unsubscribe bug.

## 6. Women's health launch skeleton (decided: ~3 months, OCP resupply + period delay)

Further along than "gated" implies: subtype plumbed end-to-end (types→steps→validators→checkout→Stripe mapping→identity gate); ungate is one Set (`BLOCKED_CONSULT_SUBTYPES`) + two contract tests. **But the built flow ≠ decided scope:** it offers UTI + emergency contraception (both dropped), has **no period-delay pathway**, and the OCP screener collects none of the MEC fields the safety-rules engine already checks (VTE/migraine-aura/smoker-35 rules exist and are INERT). Build: **10–14 days across 5 phases** (full skeleton in the agent output): Phase 0 now = operator+doctor decisions (price single vs split off $59.95→$29.95–39.95; BP-reading policy; age caps; resupply stability rule; call mechanism; period-delay protocol). Phase 1 at T-8wks. Content cluster pre-stages T-3wks per the mimic map. Also needed: landing page, SERVICE_LAUNCH_CHECKLISTS section, E2E in the blocking set.

## 7. Recommended sequence

1. **Today (operator, 20m):** Express env one-liner + verify · Telegram test-fire · order the key-escrow print.
2. **This week (Claude, ~2.5d):** FAQ forceMount · doctor_available filter · high-stakes server block + chip · review-redirect ProductReview · probe-to-guests + events · refund tests · Telegram cooldown fix · unsubscribe RFC fix · Express toggle promotion (after env; later shipped as Priority review in `79b8ab286`).
3. **Next 2 weeks (Claude, ~3d):** PRICING_DISPLAY sweep (before floor verdict) · a11y triad · parity contract + checkout-ordering tests · dead-man auto-pause · P3 cleanup PRs · GEO plumbing (robots/sitemap/anchors) · break-glass doc draft.
4. **You, unchanged:** the four GEO clicks (BWT · NHSD · GSC Request-Indexing · Trustpilot description+categories) — still the multiplier on ~46 indexed pages.
5. **Phase 0 decisions for women's health** whenever ready — unblocks the 10–14d build well before the 3-month line.

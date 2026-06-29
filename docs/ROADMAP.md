# ROADMAP.md — InstantMed

> Internal-only product roadmap. Refreshed monthly by the operator.
> Source of truth for: current operating phase, last-90-days shipped, next-30-60-days priorities, long-term expansion gates.
>
> **Last refreshed:** 2026-06-15 (women's-health launch + intake softening). Bump this stamp on every edit.

---

## 1. Current operating phase

**Live. Hardening operator surfaces and scaling toward $1M one-off revenue.**

Specifics:
- Brand rehaul shipped 2026-04-29 (`BRAND.md` v1.0.0 locked, coral accent + Plus Jakarta Sans display + 5 signature devices).
- Patient portal rebuild shipped 2026-04-29 (Phases 1-3, design-system v2.0.0 → v2.0.2).
- Staff cockpit rebuild shipped 2026-05-12 → 2026-05-20 (Phases 1-8, unified admin/doctor under `/dashboard`).
- Refund policy unified to 100% on decline across all categories 2026-05-20.
- Support role + capability flags + intake ledger rebuild + attribution surfacing + identity gating + renewal badges all shipped 2026-05-20 → 2026-05-23.
- Women's health (UTI + new/switch contraceptive pill) **went live 2026-06-15** — first new service line since the 2026-05 work; weight loss remains the only gated future subtype.

## 2. Active priorities (next 30 days)

| Rank | Priority | Owner | Status |
|------|----------|-------|--------|
| 1 | **Google Ads production preflight reconciliation** - prove production values hydrate, OAuth mints a token, and `GOOGLE_ADS_CONVERSION_ACTION_PURCHASE` resolves to an enabled offline click-import `UPLOAD_CLICKS` action. If strict preflight fails, investigate Vercel scope/empty values, OAuth refresh-token validity, conversion-action status/type, or project/team mismatch. | **Operator + Codex** | **Blocking before paid ramp.** No Ads campaign mutations until measurement is trusted. `pnpm release:check` already runs `CHECK_INTEGRATIONS_STRICT=1 pnpm check:integrations`; the missing evidence is production-scoped runtime proof. |
| 2 | **Deploy-status hygiene** - keep CI build and post-deploy smoke green, and fix or explicitly classify the `Video review (auto)` artifact-push failure caused by writing `docs/reviews/*` directly to protected `main`. | **Codex** | Process blocker before treating "all deployment checks green" as true. A video-review red caused only by protected-branch artifact publishing is not app-health evidence, but it should not stay noisy before production. |
| 3 | **Med cert queue SLA refresh** - re-run the live Q1 invariant and resolve any paid med-cert review backlog above the 24h max / 2h P95 operating target. | **Operator** | Last recorded risk: 2026-05-23 snapshot had med-cert work P95 = 165h and max = 14d. Use `/admin/ops` plus `docs/OPERATIONS.md` Q1 before deciding capacity, batch review, refund/apology, or policy adjustment. |
| 4 | **Parchment production prescriber link verification** - confirm every prescribing-capable doctor has `parchment_user_id` and daily production smoke is green before paid traffic for repeat scripts, ED, hair loss, or women's health. | **Operator** | Pending pre-launch per `docs/SERVICE_LAUNCH_CHECKLISTS.md`. |
| 5 | Category-by-category rewrite of remaining health guide pages | Operator | Ongoing per archived plan `docs/plans/archive/2026-05-04-health-guides-rehaul.md` and June GEO/content work. No engineering bottleneck unless page templates or indexing tooling drift. |
| 6 | **Paid traffic ramp on ED, hair loss, and women's health services** - only after per-service launch gates in `docs/SERVICE_LAUNCH_CHECKLISTS.md` are met. | Operator | Gated on #1 (Ads attribution), #4 (Parchment), and capacity/hire triggers per `docs/REVENUE_MODEL.md` §8. |
| 7 | **Demand-generation strategy session** - revenue remains far below the $1M/year target; decide between paid acquisition ramp, SEO compounding, or another channel only after measurement is trusted. | **Operator** | Not engineering. 60 min with analytics dashboards. |
| 8 | Memory hygiene pass via `/consolidate-memory` | Operator | Memory has been updated in several sessions; full consolidation pass still useful when next convenient. |
| 9 | `/blog` vs `/guides` routing cleanup once page quality stabilises | Operator | Backlog: `docs/plans/2026-05-23-archived-plan-followups.md`. |
| 10 | Type centralisation + ESLint import boundary enforcement | Operator | Backlog: same followups stub and `/wiki/refactor-plan.md`. |

Closed since the previous refresh:
- Doc cleanup PR program and branch protection remain done.
- `INVALID_TYPE` integration hardening is done; the release gate now contains strict runtime validation.
- Cert+refund orphans and refund-record anomalies were reconciled to **0** on 2026-06-01. Keep Q2/Q4 monitoring live in `/admin/ops`; do not add automatic certificate revocation on refund without an explicit clinical/legal policy decision.

## 3. Last 90 days shipped

Chronological. One line per material change. Pulled from `git log --since="90 days ago" --pretty=format:"%ad %s"`.

### 2026-06 (current month)

- 2026-06-29 - Repeat-Rx intake simplified to one medication per request: the patient step no longer offers multi-medication add/remove controls, server validation rejects multi-medication repeat payloads, and shared E2E fixture tests are serialized to stop overlapping teardown from masking release evidence.
- 2026-06-15 - **Women's health launched** (UTI + new/switch contraceptive pill, scoped via `LIVE_WOMENS_HEALTH_OPTIONS`; `ocp_repeat` routes to the cheaper repeat-script flow, morning-after / period-pain / "other" stay gated). Intake softening (A3): missing strength, missing form, and blank current dose became flag-for-doctor soft signals instead of hard step blocks; unknown medicines still require a useful free-text description. Intake friction analytics panel + guardrails; standardised intake primitives and mobile flow density; intake step-primitive a11y (disabled-aware roving radio, 48px chip tap targets).
- 2026-06-12 - Agent-browser approved for in-session verification; Google Ads enhanced conversions now attach hashed email and phone across live upload and cron backfill; `/wiki` project context map shipped; request URL seeding isolated and tested; enhanced-conversion payload typing tightened; doctor queue action guards mapped.
- 2026-06-11 - Safety, accessibility, SEO/GEO, ops, and hygiene batch: server-side high-stakes block; intake roving tabindex and scroll fixes; live NHSD listing/runbook; Telegram Rx/consult queue-stall alert; pricing display centralisation; dead dependency/module cleanup; Express review option row (later renamed Priority review); `/request` noindex.
- 2026-06-10 - Reliability and growth instrumentation: Sentry/PostHog noise reductions, fallback Telegram alerting, possible-doctor-call prescribing copy, heard-about-us MCQs in approval emails, approved-today queue list, 90-day organic/GEO plan, ED/hair content pillars.
- 2026-06-09 - Revenue and operations levers: ED/hair dead-CTA fixes, one-tap renewal prescribing lane, guest checkout triad, attribution survey, med-cert floor/AOV tests, ops breakdown strip, webhook DLQ test-noise suppression, video-review click targeting fixes.
- 2026-06-08 - Platform audit fix wave: payment amount reconciliation to Stripe truth, doctor patient-search scoping, controlled-substance checkout block, PostHog purchase pixel init, checkout dead-end fixes, multi-channel click attribution, Parchment panel production hardening, PHI scrub, dead infra cleanup, refill reminder dark launch.
- 2026-06-07 - Auto-approval incident fix, migration backfill guard, platform audit UI/perf/auth batches, OAuth-only set-password flow, staff nav-count cache.
- 2026-06-06 - Customer growth baseline, recovery conversion/email parity, LLM citation readiness, authority resources, indexing/distribution monitoring.
- 2026-06-03 -> 2026-06-04 - SEO foundation: GSC audit, reviewer E-E-A-T, content deepening, GPT image pipeline, noindex/index policy, Google Indexing API submitter, reindexing of priority guides, data-asset/privacy plans, LLM crawler/service fixes.
- 2026-06-01 -> 2026-06-02 - Dashboard auth handoff, video-review workflow guards, protected Google Ads spend report, conversion-funnel audit evidence, attribution/routing/recovery fixes, comprehensive platform audit, hardened integration gates, and production refund reconciliation notes.
- 2026-06-01 - Cert+refund orphan exposure and legacy refund-record anomaly reconciled to zero in production; see `docs/OPERATIONS.md` Q2/Q4 for the runbook and audit-note trail.

### 2026-05

- **2026-05-23 (evening)** — 6-PR doc cleanup program shipped: #48 structural cleanup + `pnpm doc:audit` tooling + CI wire-in; #49 content audit sweep of 8 canonical docs + memory tree refresh; #50 added `docs/ROADMAP.md` (this file) + `docs/DOCTOR_ONBOARDING.md`; #51 fixed 5 pre-existing test failures (timezone bug in `groupByTime` + stale admin-nav contract assertion) — unblocked CI on main; #52 `.agents/` exclusion in doc:audit; #53 Stripe webhook handler files-vs-Map parity contract (catches zombie handler class of bug). Plus: 13 stale untracked local files cleaned, 5 worktrees + branches pruned. Production visual QA via Claude in Chrome — homepage + /medical-certificate + /erectile-dysfunction + /hair-loss all on-spec, no actionable visual bugs.
- 2026-05-23 — Easy refund entry points in patient timeline + intake ledger.
- 2026-05-21 — Doctor capability flag UI; renewal badge on queue + ledger; patient profile completeness meter; attribution source surfacing on intake + patient profile; identity gating for non-medcert services; Telegram notification edits to Reviewed/Declined; unread-message badge on mobile bottom-tab; certificate-email-failed banner; clearer in-review status copy; payment-failures counter deep-link; admin attribution-sources + decline-reasons cards; geographic analytics tile.
- 2026-05-20 — `/admin/ops` reshape to two-block scannable cockpit; staff cockpit overhaul Phases 1-8 shipped + cockpit_v2 flag dropped; refund policy 100% on all decline categories; General Consult retired publicly; calm-chrome pattern codified; intake ledger rebuild; `/admin/patients` opened to doctors; patient profile compressed identity grid.
- 2026-05-19 — Production prescribing + attribution ops hardened.
- 2026-05-14 — Multi-commit lean pass: removed retired exit-intent code, prune stale dashboard/SEO/staff routes, retire synthetic Sentry test routes, retire unused subscription runtime surfaces, harden legacy subscription boundaries, simplify staff analytics, retire duplicate follow-up cron.
- 2026-05-12 → 2026-05-13 — Staff dashboard URL canonicalised to `/dashboard`; legacy admin/doctor routes redirect; system health pill; doctor availability toggle.
- 2026-05-11 — Support role added (`user_role` enum); per-doctor capability flags.

### 2026-04

- 2026-04-29 — Brand rehaul locked (`BRAND.md` v1.0.0, coral accent, Plus Jakarta Sans, 5 signature devices). Patient portal rebuild Phase 1 (design-system v2.0.0); Phase 2 + Phase 3 same week.
- 2026-04-28 — Medical certificate expiry job retired (certs no longer expire); med cert language locked in template renderer; auto-approve delay kept at 5 min per `decision_auto_approve_delay.md`.
- 2026-04-21 — Solo-director compliance sweep (no FRACGP/cohort/peer-review claims on marketing surfaces); migration drift audit (182 pre-squash files removed).
- 2026-04-20 — Design system 95-readiness sprint (Phases 1-6) shipped; `DESIGN_SYSTEM_VERSION = "1.0.0"` pinned; service icon system unified; violet purged.
- 2026-04-13 — God component decomposition + lib restructure plans drafted (deferred, see §4 backlog).
- 2026-04-08 — `/flow` parallel system deleted; `/request` is sole canonical intake.
- 2026-04-07 — Stable stack downgrade: Next 16 → 15.5.x, React 19 → 18.3.1, Turbopack → webpack, Framer Motion 12 → 11.18.2.

### 2026-03

- 2026-03-25 — Blood test referral plan drafted (deferred per `docs/plans/archive/2026-03-25-blood-test-referrals.md`).
- 2026-03-11 → 2026-03-07 — PHI Encryption Phase 2 dual-write pattern shipped across 4 data layer files + 8 `_enc` columns + RPC gap closed.

## 4. Backlog (deferred, with provenance)

From `docs/plans/2026-05-23-archived-plan-followups.md`:

- [ ] Type centralisation (move scattered types to `/types/`).
- [ ] Import boundary enforcement (ESLint rules: cross-domain import guards).
- [ ] Barrel file additions for `components/` domain dirs.
- [ ] Component-tree README creation for remaining domain dirs (admin/, doctor/, patient/, marketing/).
- [ ] Category-by-category rewrite of remaining ~93 health guide pages.
- [ ] `/blog` vs `/guides` routing cleanup once guide quality stabilises.
- [ ] Optional: `/admin/ops` live release feed via `system_release` audit row from post-deploy smoke workflow.

## 5. Expansion gates (long-term)

Per `docs/BUSINESS_PLAN.md` §9. Do not unlock new business-model layers (subscriptions, pharmacy fulfilment, staff-heavy follow-up, broader GP services) until ALL of these are true:

- [ ] Monthly gross revenue consistently above $60k.
- [ ] Refund rate below 8-10%.
- [ ] Chargebacks below 0.5%.
- [ ] Support tickets below 5 per 100 orders.
- [ ] Med-cert median turnaround below 30 minutes.
- [ ] Doctor queue P95 below 2 hours during operating hours.
- [ ] Clinical QA is current.
- [ ] Advertising and SEO pages pass compliance checks.

Hiring triggers per `docs/REVENUE_MODEL.md` §8:

| Trigger | Hire |
|---------|------|
| 30-50 orders/day or 10+ support tickets/day | Admin/support first |
| Queue P95 above 2 hours during operating hours | Additional doctor coverage (use per-doctor capability flags per `docs/DOCTOR_ONBOARDING.md`) |
| QA sampling falls behind | Doctor or clinical admin support |
| Revenue consistently above $60k-$80k/month | Start formal staff plan |
| Weight loss demand grows | Add monitoring/admin capacity before scaling |

## 6. What we will NOT build (kept here so it does not get "discovered" again)

- Subscriptions or memberships in this phase. Repeat Rx subscription acquisition is dormant; runtime surfaces retired.
- Pharmacy fulfilment / owned dispensing / delivery / inventory margin.
- Patient-heavy follow-up programs without staff to deliver them.
- Public-facing roadmap or changelog page (this doc is internal).
- Hand-written release log (`docs/RELEASE_LOG.md` deleted 2026-05-23, see CLAUDE.md Gotcha codifying this).
- Conversational AI intake. Patients use the canonical `/request` form; doctors review.

## 7. How to refresh this doc

Monthly (suggested cadence). Steps:

1. Run `git log --since="30 days ago" --pretty=format:"%ad %s" --date=short` and roll new commits into §3.
2. Update §1 phase label if the operating phase has shifted.
3. Rewrite §2 active priorities. Move completed items to §3, deferred items to §4 backlog.
4. Bump `Last refreshed:` stamp.
5. Re-sync `memory/MEMORY.md` index row to keep memory + doc aligned (the memory entry should say "see docs/ROADMAP.md" not duplicate content).

If the doc has not been refreshed in 60+ days, `pnpm doc:audit` (introduced in PR 1) should flag staleness via the `Last refreshed:` stamp.

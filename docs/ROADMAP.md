# ROADMAP.md — InstantMed

> Internal-only product roadmap. Refreshed monthly by the operator.
> Source of truth for: current operating phase, last-90-days shipped, next-30-60-days priorities, long-term expansion gates.
>
> **Last refreshed:** 2026-05-23. Bump this stamp on every edit.

---

## 1. Current operating phase

**Live. Hardening operator surfaces and scaling toward $1M one-off revenue.**

Specifics:
- Brand rehaul shipped 2026-04-29 (`BRAND.md` v1.0.0 locked, coral accent + Plus Jakarta Sans display + 5 signature devices).
- Patient portal rebuild shipped 2026-04-29 (Phases 1-3, design-system v2.0.0 → v2.0.2).
- Staff cockpit rebuild shipped 2026-05-12 → 2026-05-20 (Phases 1-8, unified admin/doctor under `/dashboard`).
- Refund policy unified to 100% on decline across all categories 2026-05-20.
- Support role + capability flags + intake ledger rebuild + attribution surfacing + identity gating + renewal badges all shipped 2026-05-20 → 2026-05-23.

## 2. Active priorities (next 30 days)

| Rank | Priority | Owner | Status |
|------|----------|-------|--------|
| 1 | Doc cleanup PR program (3 PRs: structural + content audit + new canon docs) | Operator + Claude | PR 48 + PR 49 + PR 50 in flight 2026-05-23 |
| 2 | Memory hygiene pass via `/consolidate-memory` | Operator | Scheduled post-PR-3-merge |
| 3 | Category-by-category rewrite of remaining ~93 health guide pages | Operator | Ongoing per archived plan `docs/plans/archive/2026-05-04-health-guides-rehaul.md` |
| 4 | `/blog` vs `/guides` routing cleanup once page quality stabilises | Operator | Backlogged in `docs/plans/2026-05-23-archived-plan-followups.md` |
| 5 | Type centralisation + ESLint import boundary enforcement (from archived lib-restructure plan) | Operator | Backlogged in `docs/plans/2026-05-23-archived-plan-followups.md` |
| 6 | **Google Ads conversion action ID config** — finalise `GOOGLE_ADS_CONVERSION_ACTION_PURCHASE` env var to a working `UPLOAD_CLICKS` conversion action so the hourly backfill cron stops returning `INVALID_CONVERSION_ACTION_TYPE`. Per `docs/ARCHITECTURE.md` attribution section. | Operator | Pending |
| 7 | **Parchment production prescriber link verification** — confirm every prescribing-capable doctor has a `parchment_user_id` linked + verified via daily smoke. Per `docs/SERVICE_LAUNCH_CHECKLISTS.md` shared gates. | Operator | Pending pre-launch |
| 8 | **Paid traffic ramp on ED + hair loss services** — only after the per-service launch gates in `docs/SERVICE_LAUNCH_CHECKLISTS.md` are met; start exact/phrase match only. | Operator | Gated on §3 hires + scorecard |

## 3. Last 90 days shipped

Chronological. One line per material change. Pulled from `git log --since="90 days ago" --pretty=format:"%ad %s"`.

### 2026-05 (this month)

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

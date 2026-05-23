# New Canon Docs Plan — InstantMed (PR 3 of 3)

> **Status:** Locked, drafts inline. Plan-only. Do NOT execute in this session.
> **Date:** 2026-05-23
> **Authored in:** session `c725409e-a484-46e6-9fbe-0772209a81e1` (same session as PR 1 + PR 2)
> **Executable cold in:** ~30-60 minutes by a fresh worktree session reading this file top-to-bottom.
>
> **Sequencing:** Final of a 3-PR program (decision §0 row 16 in PR 1 plan):
> - PR 1 (`docs/plans/archive/2026-05-23-doc-cleanup-plan.md` after archive): structural cleanup + tooling. Ships first.
> - PR 2 (`docs/plans/archive/2026-05-23-doc-content-audit-plan.md` after archive): content audit + memory refresh. Ships second.
> - **PR 3 (this plan):** 2 new canonical docs (ROADMAP + DOCTOR_ONBOARDING). COMPLAINTS_SOP deliberately skipped (decision §0 row 12). Ships last.
>
> **Scope of PR 3 only:** Add 2 new canonical docs to the satellite set. Update CLAUDE.md satellite-doc table to register them. Add drift-contract pins for each. Update `docs/bookkeeping/file-map.md` + `docs/bookkeeping/expected-md-count`. Move `memory/roadmap.md` into archive (now superseded by `docs/ROADMAP.md`).
>
> **Out of scope:** Editing other canonical docs (PR 1 + PR 2 cover that), source code, tests beyond the new drift-contract pins, third-party config, the public-facing /complaints page or any other public marketing surface.

---

## 0. Decisions locked

| # | Decision | Resolution | Source |
|---|----------|-----------|--------|
| 1 | docs/ROADMAP.md scope | **Internal-only, supersedes `memory/roadmap.md`.** Lives in `docs/` but not linked from public marketing. Captures current operating phase + last-90-days shipped + next-30-60-days priorities + long-term expansion gates. Refreshed monthly by operator. ~180 lines. | Operator instruction 2026-05-23 |
| 2 | docs/COMPLAINTS_SOP.md | **Skip.** Coverage is already adequate via CLAUDE.md Platform Identity + docs/CLINICAL.md §Complaint Handling + /complaints page + docs/runbooks/comparative-tagline-complaint.md (runbook pattern). A new SOP umbrella would duplicate 3 existing canon surfaces for a solo-operator with low complaint volume. Better pattern: drop new runbooks into `docs/runbooks/` per complaint class only when a class actually emerges. | Operator instruction 2026-05-23 ("idk. delete if u think its useless or can be consolidated/merged") |
| 3 | docs/DOCTOR_ONBOARDING.md scope | **Technical onboarding only.** Capability flag setup, AHPRA verification, Parchment user_id linking, identity completeness gates, service-line verification gates. Excludes clinical onboarding (needs Medical Director sign-off, separate doc) and commercial onboarding (HR-only). ~200 lines. | Operator instruction 2026-05-23 |
| 4 | memory/roadmap.md fate after PR 3 | **Move to memory archive.** PR 2 refreshes it; PR 3 supersedes it with docs/ROADMAP.md. Move to `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/archive/` (operator creates if needed) with a `> Superseded by docs/ROADMAP.md` banner. | Default lock |
| 5 | Drift-contract pins for new docs | **Yes, add pins** in `lib/__tests__/project-docs-drift-contract.test.ts` so the new docs do not drift unnoticed. Pin: ROADMAP must contain the current operating phase label + the most recent shipped milestone; DOCTOR_ONBOARDING must contain all 7 capability flag keys + the AHPRA validation regex string + the Parchment env-var list header. | Default lock; matches the existing 8 docs in the contract |
| 6 | CLAUDE.md satellite-doc table updates | **Add 2 rows.** ROADMAP row: "When to load: roadmap planning, prioritisation, monthly refresh". DOCTOR_ONBOARDING row: "When to load: onboarding a new clinician, AHPRA verification, Parchment linking, service-line capability changes". Re-sync to AGENTS.md via `scripts/sync-agent-doc.sh`. | Default lock |
| 7 | Drafts location | **Inline in this plan file.** §4 contains the full ROADMAP draft; §5 contains the full DOCTOR_ONBOARDING draft. The execution session copy-pastes from this file into the new doc files. Operator reviews the drafts in this plan BEFORE the execution session runs. | Per audit prompt: "Self-contained, executable cold" |
| 8 | Operator gaps | **Tagged inline.** Anywhere the draft needs operator confirmation, the text reads `[OPERATOR: ...]`. The execution session resolves these gaps by either pulling the operator's answer from the PR description OR pausing and asking. | Operator persona §5 ("Ask clarifying questions before assuming intent") |
| 9 | Sequencing of PR 3 vs PR 1/2 | **PR 3 starts only after PR 2 merges.** PR 2 refreshes memory/roadmap.md; PR 3 promotes that refreshed content into docs/ROADMAP.md. Doing them in reverse means the operator hand-edits roadmap content twice. | Default lock |
| 10 | Worktree | **`git worktree add ../instantmed-new-canon-docs` off `main` AFTER PR 2 merges.** Open PR from the branch. | Per audit prompt constraint |
| 11 | No-squash commit policy | **One commit per logical step** (see §6). | Consistent with PR 1 + PR 2 |
| 12 | File count change | **+2 .md files.** `docs/bookkeeping/expected-md-count` updates from `45` to `47`. `docs/bookkeeping/file-map.md` adds 2 rows. | Default lock |

---

## 1. New file: `docs/ROADMAP.md`

See full draft in §4. Path: `docs/ROADMAP.md`. ~180 lines. Internal-only.

## 2. New file: `docs/DOCTOR_ONBOARDING.md`

See full draft in §5. Path: `docs/DOCTOR_ONBOARDING.md`. ~200 lines. Internal-only.

## 3. Updated files

| File | Edit |
|------|------|
| `CLAUDE.md` | Add 2 rows to Satellite Documentation table (ROADMAP + DOCTOR_ONBOARDING). |
| `AGENTS.md` | Regenerated via `scripts/sync-agent-doc.sh`. Never hand-edit. |
| `lib/__tests__/project-docs-drift-contract.test.ts` | Add pin assertions for both new docs per decision §0 row 5. |
| `docs/bookkeeping/file-map.md` | Add 2 rows under "docs/ (canonical)" section. |
| `docs/bookkeeping/expected-md-count` | `45` → `47`. |
| `~/.claude/projects/.../memory/roadmap.md` | Move to `memory/archive/roadmap.md` with superseded banner. |
| `~/.claude/projects/.../memory/MEMORY.md` | Update the `roadmap.md` index row to point at `docs/ROADMAP.md` instead. |

---

## 4. Draft: `docs/ROADMAP.md`

> **Path:** `docs/ROADMAP.md`
> **Status:** Internal-only roadmap. Not linked from public marketing.
> **Source of truth for:** current operating phase, last-90-days shipped, next-30-60-days priorities, long-term expansion gates.
> **Supersedes:** the operator's `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/roadmap.md` (moved to memory archive on this PR's merge).

The full file contents to write:

````markdown
# ROADMAP.md — InstantMed

> Internal-only product roadmap. Refreshed monthly by the operator.
> Source of truth for: current operating phase, last-90-days shipped, next-30-60-days priorities, long-term expansion gates.
>
> **Last refreshed:** 2026-05-23. Bump this stamp on every edit.

---

## 1. Current operating phase

[OPERATOR: confirm the phase label. Suggestion based on CLAUDE.md gotchas + recent commits:]

> **Live. Hardening operator surfaces and scaling toward $1M one-off revenue.**

Specifics:
- Brand rehaul shipped 2026-04-29 (`BRAND.md` v1.0.0 locked, coral accent + Plus Jakarta Sans display + 5 signature devices).
- Patient portal rebuild shipped 2026-04-29 (Phases 1-3, design-system v2.0.0 → v2.0.2).
- Staff cockpit rebuild shipped 2026-05-12 → 2026-05-20 (Phases 1-8, unified admin/doctor under `/dashboard`).
- Refund policy unified to 100% on decline across all categories 2026-05-20.
- Support role + capability flags + intake ledger rebuild + attribution surfacing + identity gating + renewal badges all shipped 2026-05-20 → 2026-05-23.

## 2. Active priorities (next 30 days)

| Rank | Priority | Owner | Status |
|------|----------|-------|--------|
| 1 | Doc cleanup PR program (3 PRs: structural + content audit + new canon docs) | Operator + Claude | PR 1 + PR 2 + PR 3 plans locked 2026-05-23 |
| 2 | Memory hygiene pass via `/consolidate-memory` | Operator | Scheduled post-PR-3-merge |
| 3 | Category-by-category rewrite of remaining ~93 health guide pages | Operator | Ongoing per archived plan `docs/plans/archive/2026-05-04-health-guides-rehaul.md` |
| 4 | `/blog` vs `/guides` routing cleanup once page quality stabilises | Operator | Backlogged in `docs/plans/2026-05-23-archived-plan-followups.md` |
| 5 | Type centralisation + ESLint import boundary enforcement (from archived lib-restructure plan) | Operator | Backlogged in `docs/plans/2026-05-23-archived-plan-followups.md` |
| 6 | [OPERATOR: add anything else top-of-mind. Suggestions from CLAUDE.md gotchas: Google Ads conversion action ID config, Parchment production prescriber link verification, paid traffic ramp on ED + hair loss services per `docs/SERVICE_LAUNCH_CHECKLISTS.md`.] | | |

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
````

[End of ROADMAP.md draft. Operator: confirm the §1 phase label and §2 row #6 additions; rest is mechanical.]

---

## 5. Draft: `docs/DOCTOR_ONBOARDING.md`

> **Path:** `docs/DOCTOR_ONBOARDING.md`
> **Status:** Internal technical onboarding doc for new clinicians.
> **Scope:** Capability flag setup, AHPRA verification, Parchment user_id linking, identity completeness gates, service-line verification gates.
> **Does NOT cover:** clinical onboarding (protocols, scope boundaries, supervision arrangement, QA sampling cadence — separate doc owned by Medical Director), commercial onboarding (rates, hours, contracts — HR-only).

The full file contents to write:

````markdown
# DOCTOR_ONBOARDING.md — InstantMed

> Internal technical onboarding playbook for new clinicians.
> Covers the platform-side setup. Clinical onboarding (protocols, scope, supervision) is a separate doc owned by the Medical Director.
>
> **Audience:** operator (admin) + the new doctor's first technical setup session.
> **When to load:** onboarding a new clinician, AHPRA verification, Parchment user_id linking, service-line capability changes, suspending/reactivating a doctor.

---

## 0. Pre-onboarding checklist (operator side)

Before bringing the new doctor into the system, the operator confirms:

- [ ] AHPRA registration number is current (active GP registration, no conditions, no recency-of-practice flags). Format `/^[A-Z]{3}\d{10}$/` (e.g. `MED0001234567`). The platform validates the format only; the operator must verify currency on the AHPRA public register.
- [ ] Medical Director has approved the new clinician for at least one service line (med certs is the lowest-bar starting line).
- [ ] Indemnity insurance confirmed.
- [ ] Parchment account exists for the doctor (separate flow: doctor signs up via Parchment, receives a `user_id`). If not, see §3.
- [ ] Doctor has reviewed `docs/CLINICAL.md` (clinical boundaries + prescribing rules + AI limits + consent) and `docs/SECURITY.md` (PHI handling).

## 1. Staff role model

InstantMed runs 3 staff roles, defined on `profiles.role` (Phase 1 of dashboard remaster, 2026-05-11):

| Role | Capability inheritance | Surface access |
|------|------------------------|----------------|
| `admin` | admin + doctor (owner-operator only) | Everything. The owner-operator is both admin and doctor; admin role inherits doctor capabilities. |
| `doctor` | doctor | Clinical surfaces only: queue, cases, patient profiles scoped via `lib/doctor/patient-access.ts`, identity settings. |
| `support` | support | Non-clinical operations only: `/admin/ops`, `/admin/webhook-dlq`, `/admin/ops/parchment`, `/admin/ops/prescribing-identity`. Phase 8 (2026-05-20) opened `/admin/intakes` (intake ledger) and the intake refund action ($100/refund cap, 3/24h limit). No clinical actions, no prescribing, no Email delivery, no settings. |

A new doctor hire gets `role = doctor`. Owner-operator stays `role = admin`.

**Future-doctor patient boundary:** Non-admin doctors see ONLY patients with a concrete doctor relationship (claimed/reviewed/reviewing intake, owned script task, issued certificate, or authored patient note). Enforced in `lib/doctor/patient-access.ts`. Do not give a new doctor `admin` role to bypass this; it exists on purpose to prevent cross-doctor PHI exposure.

## 2. Per-doctor capability flags

Seven boolean columns on `profiles`, gated at runtime via `doctorHasCapability(profile, capability)` from `lib/auth/staff-capabilities.ts`:

| Capability key | DB column | Default for new doctor | Owner-operator default |
|----------------|-----------|------------------------|------------------------|
| `review_med_certs` | `can_review_med_certs` | `true` | `true` |
| `review_repeat_rx` | `can_review_repeat_rx` | `true` | `true` |
| `review_consults` | `can_review_consults` | `true` | `true` |
| `review_ed` | `can_review_ed` | `true` | `true` |
| `review_hair_loss` | `can_review_hair_loss` | `true` | `true` |
| `prescribe_s4` | `can_prescribe_s4` | `true` | `true` |
| `prescribe_s8` | `can_prescribe_s8` | **`false`** (explicit grant required) | `true` |

**`prescribe_s8` is the only flag that defaults off.** Schedule 8 prescribing requires an explicit AHPRA-restricted grant; do not flip this without confirming the new doctor's S8 authority on the AHPRA register.

**Runtime gating:**
- `app/actions/approve-cert.ts` gates on `review_med_certs` before rate-limit + credential checks.
- `app/doctor/queue/actions.ts` → `updateStatusAction` gates on `doctorCanReviewService(profile, serviceType, subtype)` for `approved` and `awaiting_script` transitions.
- `declineIntakeAction` gates BEFORE delegating to the canonical decline (a wrong-line doctor cannot trigger refund + email).
- `checkParchmentPrescribingCapability(...)` in `lib/doctor/parchment-prescribing-capability.ts` gates Parchment handoff: `prescribe_s4` is required for every embedded prescribing launch; `prescribe_s8` is required when repeat-script intake answers contain a controlled-medication name.

**Setting capabilities:** `/admin/doctors` exposes a capability UI per doctor (added 2026-05-21). Operator toggles via `updateDoctorCapabilitiesAction` in `app/actions/admin-doctor-capabilities.ts`. Changes are audit-logged with before/after diff under `doctor_capabilities_updated`.

## 3. Parchment linking

Parchment is the external ePrescribing system. Every prescribing doctor needs a Parchment `user_id` linked to their InstantMed profile via `profiles.parchment_user_id`.

### 3.1 Org details

| Field | Production value |
|-------|------------------|
| Parchment Org ID | `650437d7-d8a4-4aca-987a-5f09134792f4` (InstantMed organisation) |
| HPIO | `8003624166773603` |
| CSP # | `8003631566702298` |
| API base URL | `https://api.parchmenthealth.io/external` |

### 3.2 Doctor account setup steps

1. Doctor creates a Parchment account via the Parchment portal (separate signup, not handled by InstantMed).
2. Parchment provisions a `user_id` (UUID) and a `HPII` for the doctor.
3. Operator links the Parchment `user_id` to the InstantMed `profiles.parchment_user_id` via `/admin/ops/parchment` (Phase 7 dashboard remaster surface) or via the admin doctor management page.
4. Verify the link by running the daily Parchment smoke (`/api/cron/parchment-smoke`, daily 7:30am AEST) and checking `/admin/ops/parchment` shows the doctor as linked.

### 3.3 Required environment

Parchment integration runs behind the `parchment_embedded_prescribing` DB feature flag in `/admin/features`. When off, doctors see "Mark Sent Manually" only; when on, they see the embedded Parchment iframe panel.

Production env vars (Vercel, all 7 required when the flag is on):

```
PARCHMENT_API_URL=https://api.parchmenthealth.io/external
PARCHMENT_PARTNER_ID=<partner_id>
PARCHMENT_PARTNER_SECRET=<partner_secret>
PARCHMENT_ORGANIZATION_ID=650437d7-d8a4-4aca-987a-5f09134792f4
PARCHMENT_ORGANIZATION_SECRET=<org_secret>
PARCHMENT_WEBHOOK_SECRET=<webhook_secret>
PARCHMENT_DEFAULT_USER_ID=<default_prescriber_user_id>
```

No sandbox env vars should remain in production. Verify via `vercel env ls` — Parchment vars must appear only in Production environment.

### 3.4 Iframe whitelist

Parchment confirmed `https://instantmed.com.au` and `https://www.instantmed.com.au` as allowed iframe-embedding origins on 2026-05-01. `lib/parchment/embed-policy.ts` defaults must keep both hosts plus local/Vercel preview hosts. If a new production host is added, operator confirms Parchment whitelists it before pointing real traffic.

## 4. Identity completeness gates

A doctor cannot approve into `awaiting_script` (the Parchment handoff state) until their identity is complete. Same patient-snapshot rules that power `/admin/ops/prescribing-identity` apply to the doctor side.

Required identity fields on `profiles`:

- `full_name`, `email`, `phone`
- `date_of_birth`, `sex`
- Structured address: `address_line1`, `suburb`, `state`, `postcode`
- `medicare_number` (for Parchment payload compatibility — stored both plaintext and encrypted per `docs/SECURITY.md` Medicare dual-write policy)
- AHPRA registration: `ahpra_number` (validated format `/^[A-Z]{3}\d{10}$/`)
- Provider number (Medicare provider)
- Signature: `signature_storage_path` (private Supabase Storage upload)
- `parchment_user_id` (from §3)

**Required identity scope** per `lib/request/prescribing-identity.ts` `requiresPrescribingIdentityForRequest`: every service line EXCEPT medical certificates requires the full structured identity bundle. Med certs only need name + DOB + email. Pinned by `lib/__tests__/prescribing-identity-gate-contract.test.ts`.

## 5. Service-line verification gates

Before turning on paid traffic for a new doctor on a service line, follow `docs/SERVICE_LAUNCH_CHECKLISTS.md`:

| Service | Doctor must complete |
|---------|----------------------|
| Medical certificates | Capability `review_med_certs` granted. AHPRA + provider number complete. Signature uploaded. Identity gates clear. First 5 cases reviewed manually with operator QA. |
| Repeat prescriptions | All med-cert gates + `review_repeat_rx` granted + `prescribe_s4` granted + Parchment `user_id` linked + production Parchment smoke green + 10 cases reviewed manually with operator QA. `prescribe_s8` granted ONLY if AHPRA register confirms S8 authority. |
| ED | All repeat-prescription gates + `review_ed` granted + 10 ED cases reviewed manually + nitrate + cardiac contraindication understanding confirmed. |
| Hair loss | All repeat-prescription gates + `review_hair_loss` granted + 10 hair-loss cases reviewed manually + red-flag escalation understanding confirmed. |
| Women's health (when launched) | Gated future. Capability + extra clinical onboarding required. |
| Weight loss (when launched) | Gated future. Capability + monitoring infrastructure + Medical Director sign-off required. |

Production paid traffic gates per `docs/SERVICE_LAUNCH_CHECKLISTS.md` apply BEFORE turning on any campaign — these are SHARED across all doctors on a service line, not per-doctor.

## 6. Doctor availability

Doctors control their queue visibility via the availability toggle at `/doctor/settings/identity` (`profiles.doctor_available`). When `doctor_available = false`:

- `getDoctorQueue({ doctorId })` returns empty for that doctor.
- They will not be assigned new intakes.
- Existing claimed intakes remain accessible.

Use this for time off, on-call rotation, or capacity management.

## 7. Suspending or offboarding a doctor

To suspend without removing:

1. Toggle `doctor_available = false`.
2. Optionally revoke capability flags (set each `can_*` to `false`) via `/admin/doctors`. Audit log captures the diff.
3. Doctor cannot approve, decline, or prescribe; existing patient relationships remain visible.

To offboard:

1. Suspend (above).
2. Reassign any active claimed intakes to another doctor or release back to the unclaimed queue.
3. Revoke Parchment `user_id` link (set `profiles.parchment_user_id = NULL`).
4. Do NOT delete the profile or auth user. Clinical records remain linked by `profiles.id` per the data retention schedule (`docs/CLINICAL.md` §Data Retention).
5. Set `role = patient` if you want them to retain a patient account, or close the auth user via Supabase dashboard (see `docs/OPERATIONS.md` §5 Patient account access for the account closure pattern; reuse the principle: never hard-delete a profile with clinical record history).

## 8. Marketing surface rules (relevant to new doctors)

Per CLAUDE.md identity rule:

- **Do NOT advertise** doctor count, individual doctor names, FRACGP, peer review, or team size on public marketing surfaces.
- Use "AHPRA-registered doctors" for service copy.
- Use "AHPRA-registered Medical Director" only where a governance role is necessary (e.g. `/clinical-governance` page).
- Individual doctor full names are OK on cert PDFs, decline messages, dashboard messages, and email signoffs (patient-facing transactional surfaces).
- Stylised signature mark (not readable name) is OK on marketing pages.

## 9. References

| Topic | Doc |
|-------|-----|
| Capability helper API | `lib/auth/staff-capabilities.ts` |
| Capability runtime gating | `app/actions/approve-cert.ts`, `app/doctor/queue/actions.ts` |
| Parchment integration | `lib/parchment/client.ts`, `lib/parchment/sync-patient.ts`, `lib/parchment/embed-policy.ts`, `app/api/webhooks/parchment/route.ts` |
| Identity completeness gate | `lib/request/prescribing-identity.ts`, `lib/__tests__/prescribing-identity-gate-contract.test.ts` |
| Clinical boundaries the doctor must read | `docs/CLINICAL.md` |
| PHI handling the doctor must understand | `docs/SECURITY.md` |
| Service-line launch gates | `docs/SERVICE_LAUNCH_CHECKLISTS.md` |
| Capability flag UI | `/admin/doctors` (admin route) |
| Parchment ops surface | `/admin/ops/parchment` (admin or support route) |
| Identity blocker report | `/admin/ops/prescribing-identity` (admin or support route) |

---

**Last refreshed:** 2026-05-23. Bump on every change to capability flag set, Parchment integration, or onboarding sequence.
````

[End of DOCTOR_ONBOARDING.md draft. Operator gaps: none — every value is pulled from code or CLAUDE.md gotchas. Operator: review for accuracy on the Parchment sandbox-vs-prod vars (the parchment.md memory is 43 days old; production-specific values should be re-verified against the live Vercel env before merge).]

---

## 6. Execution sequence

> Run AFTER PR 2 merges. Open the worktree off the post-PR-2 `main`. **One commit per logical step.** No squash.

### Step 0 — Create worktree

```bash
cd /Users/rey/Desktop/instantmed
git pull origin main
git worktree add ../instantmed-new-canon-docs main
cd ../instantmed-new-canon-docs
git checkout -b new-canon-docs-2026-05-23
```

### Step 1 — Create docs/ROADMAP.md

Copy the contents of §4 (the ROADMAP.md draft inside the `````markdown` fence) into `docs/ROADMAP.md`. Resolve any `[OPERATOR: ...]` tags with the operator's answer from the PR description; if not provided, stop and ask.

Commit: `docs: add ROADMAP.md (internal, supersedes memory/roadmap.md)`

### Step 2 — Create docs/DOCTOR_ONBOARDING.md

Copy the contents of §5 (the DOCTOR_ONBOARDING.md draft inside the `````markdown` fence) into `docs/DOCTOR_ONBOARDING.md`. Operator: re-verify the Parchment production env-var list in §3.3 against current `vercel env ls` output before merge.

Commit: `docs: add DOCTOR_ONBOARDING.md (technical onboarding)`

### Step 3 — Update CLAUDE.md satellite table

Add 2 rows to the Satellite Documentation table in CLAUDE.md (between PRIMITIVES and DESIGN_SYSTEM_CHANGELOG, alphabetical-by-purpose works):

```
| `docs/ROADMAP.md` | Internal product roadmap: operating phase, last-90-days shipped, active priorities, expansion gates | Monthly refresh, strategic prioritisation, before suggesting new feature work |
| `docs/DOCTOR_ONBOARDING.md` | Technical onboarding for new clinicians: capability flags, AHPRA, Parchment linking, identity gates, service-line verification | Onboarding a new doctor, capability change, Parchment integration debugging |
```

Run `scripts/sync-agent-doc.sh` to regenerate AGENTS.md.

Commit: `docs(claude): register ROADMAP + DOCTOR_ONBOARDING in satellite table`

### Step 4 — Add drift-contract pins

Edit `lib/__tests__/project-docs-drift-contract.test.ts`. Add 2 new `it(...)` blocks:

```ts
it("keeps ROADMAP.md pinned to current operating phase and shipped milestones", () => {
  const roadmap = readProjectFile("docs/ROADMAP.md")
  expect(roadmap).toContain("Live. Hardening operator surfaces")  // or whatever §1 phase label resolves to
  expect(roadmap).toContain("2026-05-23")  // Last refreshed stamp
  expect(roadmap).toContain("docs/plans/2026-05-23-archived-plan-followups.md")  // backlog provenance
})

it("keeps DOCTOR_ONBOARDING.md pinned to capability flag set and AHPRA format", () => {
  const onboarding = readProjectFile("docs/DOCTOR_ONBOARDING.md")
  // All 7 capability keys
  expect(onboarding).toContain("review_med_certs")
  expect(onboarding).toContain("review_repeat_rx")
  expect(onboarding).toContain("review_consults")
  expect(onboarding).toContain("review_ed")
  expect(onboarding).toContain("review_hair_loss")
  expect(onboarding).toContain("prescribe_s4")
  expect(onboarding).toContain("prescribe_s8")
  // AHPRA format
  expect(onboarding).toContain("/^[A-Z]{3}\\d{10}$/")
  // Parchment env var floor (any 3 of 7 enough to catch wholesale rewrites)
  expect(onboarding).toContain("PARCHMENT_API_URL")
  expect(onboarding).toContain("PARCHMENT_ORGANIZATION_ID")
  expect(onboarding).toContain("PARCHMENT_WEBHOOK_SECRET")
})
```

Run `pnpm vitest run lib/__tests__/project-docs-drift-contract.test.ts` to verify both new specs pass.

Commit: `test(drift-contract): pin ROADMAP + DOCTOR_ONBOARDING canonical strings`

### Step 5 — Update docs/bookkeeping/file-map.md

Add 2 rows under the "docs/ (canonical)" section listing the 2 new docs with their owner + drift-contract pin.

Commit: `docs(bookkeeping): register ROADMAP + DOCTOR_ONBOARDING in file map`

### Step 6 — Update docs/bookkeeping/expected-md-count

Change the single integer from `45` to `47`.

Run `pnpm doc:audit` — should pass with the new count.

Commit: `chore(docs): bump expected md count 45 → 47 for ROADMAP + DOCTOR_ONBOARDING`

### Step 7 — Archive memory/roadmap.md

Memory tree edit (outside repo, no git commit):

```bash
mkdir -p ~/.claude/projects/-Users-rey-Desktop-instantmed/memory/archive
mv ~/.claude/projects/-Users-rey-Desktop-instantmed/memory/roadmap.md \
   ~/.claude/projects/-Users-rey-Desktop-instantmed/memory/archive/roadmap.md
```

Edit the moved file's top to add a banner:

```markdown
> **SUPERSEDED 2026-05-23 by `docs/ROADMAP.md`.** Historical context only.
```

Then update `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/MEMORY.md` — change the `roadmap.md` row to point at `docs/ROADMAP.md` not the moved memory file.

No git commit (memory tree not in repo). Mention in PR description.

### Step 8 — Verify

```bash
pnpm doc:audit         # sync + 8 contracts + count (47) + plan-refs
pnpm lint
pnpm typecheck
```

If any check fails: STOP. Most likely cause is a drift-contract pin (Step 4) that doesn't match the exact string in the draft. Restore the string in the new doc to match the test, or update the test to match an intentional draft change with operator approval.

No commit for this step.

### Step 9 — Archive this plan

```bash
git mv docs/plans/2026-05-23-new-canon-docs-plan.md docs/plans/archive/
```

Update `docs/plans/archive/README.md` index to add the new row.

Commit: `docs(plans): archive new-canon-docs plan now that work is shipped`

### Step 10 — Open PR

```bash
gh pr create \
  --title "docs: add ROADMAP + DOCTOR_ONBOARDING canonical docs" \
  --body "$(cat <<'EOF'
## Summary

PR 3 of 3 in the 2026-05-23 doc cleanup program. Adds 2 new canonical docs.

**New docs:**
- docs/ROADMAP.md (180 lines, internal-only). Supersedes memory/roadmap.md (moved to memory archive). Captures current operating phase + last-90-days shipped + active priorities + expansion gates + what-we-will-not-build. Monthly refresh cadence.
- docs/DOCTOR_ONBOARDING.md (200 lines). Technical onboarding for new clinicians: 7 capability flags + AHPRA validation + Parchment linking + identity completeness gates + service-line verification gates. Does NOT cover clinical onboarding or commercial onboarding.

**Updated:**
- CLAUDE.md: 2 new rows in Satellite Documentation table. AGENTS.md re-synced.
- lib/__tests__/project-docs-drift-contract.test.ts: 2 new specs pinning the new docs.
- docs/bookkeeping/file-map.md: 2 new rows.
- docs/bookkeeping/expected-md-count: 45 → 47.

**Skipped (deliberate, see plan §0 row 2):** docs/COMPLAINTS_SOP.md. Coverage already adequate via CLAUDE.md Platform Identity + docs/CLINICAL.md §Complaint Handling + /complaints page + runbook pattern. Better pattern: drop new runbooks into docs/runbooks/ per complaint class only when a class emerges.

**Memory tree (out of repo):** memory/roadmap.md moved to memory/archive/ with superseded banner; MEMORY.md index row updated to point at docs/ROADMAP.md.

## Test plan
- [ ] pnpm doc:audit passes (sync + 10 contracts + count=47 + plan-refs)
- [ ] pnpm lint + pnpm typecheck pass
- [ ] 2 new drift-contract specs in project-docs-drift-contract.test.ts pass
- [ ] Visually review the rendered ROADMAP and DOCTOR_ONBOARDING in the PR diff for table formatting
- [ ] Operator confirms Parchment env-var list in DOCTOR_ONBOARDING.md §3.3 matches current vercel env ls

Plan: docs/plans/2026-05-23-new-canon-docs-plan.md (moves to archive/ in Step 9).
EOF
)"
```

---

## 7. What stays untouched in PR 3

- All source code except `lib/__tests__/project-docs-drift-contract.test.ts` (2 new specs only).
- All other canonical docs (PR 1 + PR 2 covered those).
- `docs/runbooks/comparative-tagline-complaint.md`.
- All 4 audits.
- `/complaints` public-facing page.
- `~/.claude/` global config, slash commands, skills.
- Project `.claude/` directory.

---

## 8. Verification results — open questions resolved

| Open question | Resolution |
|---------------|-----------|
| Should COMPLAINTS_SOP be a new doc? | **No.** Operator gave the call ("idk. delete if u think its useless"). Coverage adequate via 3 existing canon surfaces + runbook pattern. |
| What audience for ROADMAP? | Internal-only. Operator-confirmed. |
| What scope for DOCTOR_ONBOARDING? | Technical only. Operator-confirmed. Clinical + commercial onboarding deferred to separate docs/processes. |
| Memory roadmap.md fate? | Move to `memory/archive/` with superseded banner. The doc supersedes the memory file. |
| New drift-contract pins? | Yes. 2 new specs in `project-docs-drift-contract.test.ts` per §6 Step 4. |
| File count change? | +2 .md files (45 → 47). `expected-md-count` bumped. |
| ICONIC_HOOK conflict between BRAND.md and memory? | Resolved in PR 2 (memory was wrong, code wins). Not a PR 3 concern. |

---

## 9. Post-PR-3 operator action

After all 3 PRs merge:

1. **`/consolidate-memory`** in a separate Claude session. Per PR 1 §11 and PR 2 §7. The memory tree has 22 files left after PR 3 (24 original − 1 moved to archive − 1 likely consolidated). Operator decides per-file: keep / refresh / archive.
2. **Monthly ROADMAP refresh cadence.** Set a recurring `/loop` or calendar reminder. Per `docs/ROADMAP.md` §7 instructions.
3. **Quarterly doc cleanup re-audit.** The 3-PR program ships in May 2026; next audit recommended August 2026. Same prompt pattern.

---

## Appendix — what changed from earlier scope

- Initial PR 3 scope had 3 new docs (ROADMAP + COMPLAINTS_SOP + DOCTOR_ONBOARDING).
- Operator decision 2026-05-23 reduced to 2 (COMPLAINTS_SOP skipped).
- Plan reduced from ~600 expected lines to current ~450 with full inline drafts.
- File count target adjusted: 45 → 47 (was 48 with COMPLAINTS_SOP).

---

**End of plan.** Locked at 2026-05-23.

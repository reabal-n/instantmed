# Doc Content Audit Plan — InstantMed (PR 2 of 3)

> **Authority:** Reference only. This file has no independent execution authority. `docs/ROADMAP.md` is the sole active queue; execute from this record only when the ROADMAP explicitly activates it.

> **Status:** Locked. Plan-only. Do NOT execute in this session.
> **Date:** 2026-05-23
> **Authored in:** session `c725409e-a484-46e6-9fbe-0772209a81e1` (same session as PR 1 + PR 3)
> **Executable cold in:** ~90-120 minutes by a fresh worktree session reading this file top-to-bottom.
>
> **Sequencing:** This is PR 2 of a 3-PR program (decision §0 row 16 in PR 1 plan):
> - PR 1 (`docs/plans/2026-05-23-doc-cleanup-plan.md`): structural cleanup + doc-hygiene tooling. Ships first.
> - **PR 2 (this plan):** content audit sweeps of 8 canonical docs + memory tree refresh. Diff-only edits, no rewrites of doctrine.
> - PR 3 (separate plan, drafted next): 3 new canonical docs (ROADMAP, COMPLAINTS_SOP, DOCTOR_ONBOARDING).
>
> **Scope of PR 2 only:** Surgical content fixes. The audit pass found 13 confirmed drift items across 8 canonical docs and 7 stale claims across the memory tree. PR 2 lands diff-only fixes for each. It does NOT restructure docs, rewrite doctrine, or change product policy. Where a fix requires a doctrine call, this plan flags it as an open question rather than making the call unilaterally.
>
> **Out of scope for PR 2:** Structural cleanup (PR 1 ships that), new canonical docs (PR 3 ships those), product/policy changes, source-code edits beyond strict path-drift corrections in docs, anything not in §2-§5 of this plan.

---

## 0. Decisions locked

| # | Decision | Resolution | Source |
|---|----------|-----------|--------|
| 1 | Audit depth on remaining canonical docs | **Full end-to-end read.** All 9 docs I had not yet read (CLINICAL, SECURITY, OPERATIONS, TESTING, ARCHITECTURE tail, ADVERTISING, SEO, PRODUCTION_RELEASE, SERVICE_LAUNCH, DESIGN_SYSTEM_CHANGELOG) read in full. | Operator instruction 2026-05-23 |
| 2 | Memory tree access | **Read per-file via Read tool.** Stayed within auto-mode safe boundary. 7 high-value memory files read; the other 17 only matter if drift is reported. | Operator instruction 2026-05-23 |
| 3 | Cleanup mode for content drift | **Diff-only edits in place.** No restructuring, no rewrites. Each edit is a single targeted string replacement with the corrected text. | Default lock (consistent with PR 1) |
| 4 | ICONIC_HOOK source of truth (BRAND.md / VOICE.md vs memory) | **Code wins.** `lib/marketing/approved-claims.ts:109` resolves `iconic_hook = "Start with a secure form. Takes about 3 minutes."`. BRAND.md and VOICE.md are aligned with code. Memory file `decision_brand_rehaul_2026_04_29.md:21` is stale ("Three minutes. Done."). Memory gets corrected. | Verified by grep |
| 5 | CLINICAL.md refund-policy drift severity | **High. Block merge until fixed.** CLINICAL.md says 50% partial consult refund; CLAUDE.md, code (`app/actions/decline-refund.ts` `REFUND_ON_DECLINE_CATEGORIES`), and the 2026-05-20 commit `e5ecf2451` all say 100% on decline for every refundable category. A clinical doc contradicting current policy is a defensibility risk. | Operator persona §1 + verified by grep |
| 6 | DESIGN.md version header drift | **High. Fix in same commit as PR 2 ships.** Header says v1.0.0 (2026-04-20); actual `DESIGN_SYSTEM_VERSION = "2.0.2"` (2026-05-01). DESIGN.md is the law; the law's version header lying for 25 days is the kind of drift that makes future agents distrust the canon. | Verified by reading `lib/design-system/version.ts` |
| 7 | Memory refresh scope | **Refresh + archive, not delete.** Stale memory files get updated in place (MEMORY.md, roadmap.md, decisions.md, BRAND rehaul memory). Two project-status memory files (`project_legacy_dashboard_css.md`, `project_patient_portal_audit.md`) marked as SHIPPED at the top with a one-line "see CLAUDE.md Gotchas for current state" pointer. None deleted in PR 2; consolidation happens in a later `/consolidate-memory` operator-run session. | Default lock |
| 8 | Open question to escalate before merge | **None.** Every drift item is unambiguous code-vs-doc reality. No doctrine calls needed. | Audit found no genuinely ambiguous items |
| 9 | Sequencing of PR 2 vs PR 1 | **PR 2 starts only after PR 1 merges.** PR 1 introduces `pnpm doc:audit` + `docs/bookkeeping/expected-md-count`. PR 2 will edit content of docs that PR 1 touched (CLAUDE.md, sync-projected to AGENTS.md); easier to land sequentially than to rebase. | Default lock |
| 10 | Worktree | **`git worktree add ../instantmed-content-audit` off `main` AFTER PR 1 merges.** Open PR from the branch. | Per audit prompt constraint |
| 11 | No-squash commit policy | **One commit per doc touched.** Easier code review than one big sweep commit. | Consistent with PR 1 |

---

## 1. Final state per doc

Each canonical doc and each memory file targeted by this plan, with its expected post-PR-2 state.

| File | Expected state after PR 2 |
|------|---------------------------|
| `DESIGN.md` | Header version → `2.0.2`; 6× `lib/motion.ts` → `lib/motion/index.ts`; service-icon table General Consult → drop (`cyan / sky` becomes "Repeat Medication" only) |
| `docs/CLINICAL.md` | Refund policy line (L69) updated to 100% on decline for med cert + prescription + consult, per `decline-refund.ts` `REFUND_ON_DECLINE_CATEGORIES` |
| `docs/BUSINESS_PLAN.md` | L38 "General consults are not a brand pillar..." → updated to reflect retirement (consult is now ED + hair loss subtypes only); `Last updated` bumped to 2026-05-23 |
| `docs/REVENUE_MODEL.md` | Pricing table row (L37) "General consult $49.95" → removed; `Last updated` bumped to 2026-05-23 |
| `docs/VOICE.md` | L6 `tests/voice-guard.test.ts` → `lib/__tests__/voice-guard.test.ts` |
| `docs/SECURITY.md` | Staff Roles section (L287-301) updated: support role surfaces add `/admin/intakes` (intake ledger) and the intake refund action per CLAUDE.md Phase 8 (2026-05-20) |
| `docs/TESTING.md` | L11 test counts: 2,308 / 231 → operator-verified current count; L12 e2e specs aligned with actual `find e2e -name "*.spec.ts" \| wc -l` (62 at audit time) |
| `docs/ARCHITECTURE.md` | L720 `lib/constants.ts` → `lib/constants/index.ts`; L755 Playwright spec count → 62; L756 migration count "65 / latest `_tighten_paid_request_telegram_window`" → operator-verified current (CLAUDE.md says 73 / `_add_paid_request_telegram_message_id`) |
| `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/MEMORY.md` | "Status: Pre-launch" → updated to current operating phase per CLAUDE.md; "Current phase: Morning Canvas..." → updated to "staff cockpit hardening + revenue ops" or similar (operator marks the phrase) |
| `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/roadmap.md` | "669/669 tests" → operator-verified current; "Recent Work" appended with brand rehaul (2026-04-29), patient portal rebuild (2026-04-29), dashboard remaster (Phases 1-8, 2026-05-12 → 2026-05-20), refund policy 100% (2026-05-20), capability flags (2026-05-21), ledger rebuild (2026-05-20), refund entry points (2026-05-23); "Active Priorities" rewritten to reflect post-rebuild phase |
| `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/decisions.md` | Stack downgrade reference dropped from `docs/plans/2026-04-07-stable-stack-downgrade.md` (deleted in PR 1) — keep the decision narrative, lose the plan-file pointer. Social Proof Counter section updated: ANCHOR 500 / TARGET 2,500 (April 11 recalibration). New decisions appended: General Consult retirement (2026-05-20), refund policy 100% (2026-05-20), support role (2026-05-11), capability flags (2026-05-21), calm-chrome pattern (2026-05-21), intake ledger rebuild (2026-05-20). |
| `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/decision_brand_rehaul_2026_04_29.md` | L21 ICONIC_HOOK "Three minutes. Done." → "Start with a secure form. Takes about 3 minutes." (matches code + BRAND.md + VOICE.md) |
| `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/project_legacy_dashboard_css.md` | Header banner added: `> SHIPPED 2026-04-29. Legacy CSS killed in patient portal rebuild Phase 1 (commit 5626c5ade). Historical context only.` |
| `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/project_patient_portal_audit.md` | "Outstanding: Doctor + admin portal rebuilds" section updated: staff cockpit unified rebuild shipped 2026-05-12 → 2026-05-20 (Phases 1-8). Mark file as SHIPPED. |
| `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/preferences.md` | "Start by checking roadmap.md for current priorities" preserved BUT roadmap.md is refreshed in this same PR so the preference becomes useful again. No edit needed once roadmap.md is current. |

**Untouched docs (verified current, no edits):** `BRAND.md`, `PRODUCT.md`, `PHOTOGRAPHY_BRIEF.md`, `PRIMITIVES.md`, `AI_ONBOARDING.md`, `ADVERTISING_COMPLIANCE.md`, `SEO_CONTENT_POLICY.md`, `PRODUCTION_RELEASE_CHECKLIST.md`, `SERVICE_LAUNCH_CHECKLISTS.md`, `DESIGN_SYSTEM_CHANGELOG.md`, `OPERATIONS.md` (read first 600 lines, no drift; second half low priority), `docs/runbooks/comparative-tagline-complaint.md`, 4 audits, all `components/*/README.md`, `scripts/load-tests/README.md`, `.github/pull_request_template.md`.

**Memory files untouched in PR 2 (read or skipped, no drift action needed):** `patterns.md` (72 days old but content still accurate), `feedback_*` files (preferences, not state), `google_business_profile.md`, `google_ads_certification.md`, `parchment.md`, `sentry-token.md`, `seo-strategy.md`, `project_google_ads.md`, `project_moirai.md`, `decision_auto_approve_delay.md`, `design-system.md` (memory mirror of design-system file — may need refresh in operator's `/consolidate-memory` session, not blocking).

---

## 2. Confirmed drift items (the punch list)

### Canonical docs (13 items, 8 docs)

| # | File | Line | Current text (paraphrased) | Replacement | Severity | Source of truth |
|---|------|------|----------------------------|-------------|----------|-----------------|
| 1 | DESIGN.md | 3 | "Version: 1.0.0 · Pinned 2026-04-20" | "Version: 2.0.2 · Pinned 2026-05-01" | High | `lib/design-system/version.ts:36` |
| 2 | DESIGN.md | 487, 502, 520, 534, 593, 680 | "lib/motion.ts" (6 occurrences) | "lib/motion/index.ts" | Low | `ls lib/motion/index.ts` confirms directory |
| 3 | DESIGN.md | 327 | `cyan / sky` row: "Repeat Medication / General Consult" | "Repeat Medication" (drop General Consult half) | Medium | CLAUDE.md "Retired General Consult publicly on 2026-05-20" |
| 4 | docs/CLINICAL.md | 69 | "Med certs + prescriptions: full auto-refund. Consults: 50% partial auto-refund via `decline-intake.ts` `PARTIAL_REFUND_PERCENT` = 0.5" | "Med certs + prescriptions + consults: full auto-refund on decline (`payment_status = refunded`). `REFUND_ON_DECLINE_CATEGORIES` in `app/actions/decline-refund.ts` is the source of truth. The 50%-partial-on-consult rule was retired 2026-05-20 after operator feedback." | **HIGH** | CLAUDE.md Refund Policy (2026-05-20); commit `e5ecf2451` |
| 5 | docs/BUSINESS_PLAN.md | 38 | "General consults are not a brand pillar. They are a fallback pathway for cases that do not fit the specialised service lines." | "General Consult was retired publicly on 2026-05-20. `consult` remains a parent service type in code for ED and hair-loss subtypes only. `/consult` renders a services-overview page. There is no general fallback consult intake; cases outside the specialised lines route to GP or in-person care." + bump `Last updated` to `2026-05-23` | Medium | CLAUDE.md Key Workflows + commit `46f273328` |
| 6 | docs/REVENUE_MODEL.md | 37 | Pricing table row "General consult $49.95" | Remove the row entirely. Also bump `Last updated` to `2026-05-23`. | Medium | Same as #5 |
| 7 | docs/VOICE.md | 6 | "Enforced by: `tests/voice-guard.test.ts`" | "Enforced by: `lib/__tests__/voice-guard.test.ts`" | Low | `ls lib/__tests__/voice-guard.test.ts` confirms |
| 8 | docs/SECURITY.md | 287 | Protected Routes table row for `/admin/ops, /admin/webhook-dlq, /admin/ops/parchment, /admin/ops/prescribing-identity` (admin or support) | Add `/admin/intakes` to the support-allowed set. New row: `\| /admin/intakes \| admin, doctor, or support (support sees ledger metadata only; clinical answers gated on intake detail) \|` | Medium | CLAUDE.md "Phase 8 (2026-05-20)" + commit `e5ecf2451` |
| 9 | docs/SECURITY.md | 301 | Staff Roles table row for support: "Support is bounded to `/admin/ops`, `/admin/webhook-dlq`, `/admin/ops/parchment`, and `/admin/ops/prescribing-identity`" | Append: "Phase 8 (2026-05-20) opened `/admin/intakes` (intake ledger) and the intake refund action to support, capped at $100 per refund and 3 per rolling 24h via `checkSupportRefundLimits`." | Medium | Same as #8 |
| 10 | docs/TESTING.md | 11 | "**2,308** passing (231 Vitest files, local `pnpm release:check` 2026-05-10)" | Operator runs `pnpm test --reporter=verbose 2>&1 \| grep "Tests"` to get current count, updates to actual (CLAUDE.md says 2,453 / 258 as of 2026-05-19; operator confirms or re-counts). Bump `Last updated` reference. | Medium | CLAUDE.md TESTING.md cross-reference |
| 11 | docs/TESTING.md | 12 | "54 specs" | Operator runs `find e2e -name "*.spec.ts" \| wc -l` (audit run found 62) and updates to actual | Low | `find` output 62 |
| 12 | docs/ARCHITECTURE.md | 720 | "`lib/constants.ts` \| App constants \| PRICING, SYSTEM_AUTO_APPROVE_ID, CONTACT_EMAIL" | "`lib/constants/index.ts` \| App constants \| PRICING, SYSTEM_AUTO_APPROVE_ID, CONTACT_EMAIL" (path is a directory not a file) | Low | `ls lib/constants/` shows `index.ts` + `service-types.ts` |
| 13 | docs/ARCHITECTURE.md | 755-756 | "44 Playwright specs" / "65 SQL migration files... Most recent: `20260507032122_tighten_paid_request_telegram_window.sql`" | "62 Playwright specs" / "73 SQL migration files... Most recent: `20260521010000_add_paid_request_telegram_message_id.sql`" | Medium | CLAUDE.md gotcha line for migrations; `find e2e -name "*.spec.ts" \| wc -l` for specs |

### Memory tree (7 items, 6 files)

| # | File | What to change |
|---|------|----------------|
| 14 | `MEMORY.md` (Quick Context section) | "Status: Pre-launch, building toward first public launch" → operator-chosen current phase label (suggestion: "Status: Live, hardening operator surfaces + scaling toward $1M one-off revenue"). "Current phase: Morning Canvas design system rollout + launch readiness" → "Current phase: staff cockpit hardening + revenue ops". |
| 15 | `roadmap.md` | "Latest Verification: 669/669 tests" → operator-verified current count (CLAUDE.md says 2,453 / 258 files as of 2026-05-19). Append "Recent Work" entries for: brand rehaul (2026-04-29), patient portal rebuild (2026-04-29), dashboard remaster Phases 1-8 (2026-05-12 → 2026-05-20), refund policy 100% (2026-05-20), capability flags (2026-05-21), ledger rebuild (2026-05-20), refund entry points (2026-05-23). Rewrite "Active Priorities" to: revenue ops + staff cockpit polish + content rewrite of remaining ~93 guide pages + new doc canon (PR 3). Bump `Updated:` line. |
| 16 | `decisions.md` | Stack Downgrade section: drop the `docs/plans/2026-04-07-stable-stack-downgrade.md` reference (deleted in PR 1) but keep the decision narrative + commit SHA references. Social Proof Counter section: update to "ANCHOR_COUNT = 500 (April 11 recalibration), TARGET_COUNT = 2,500 (Dec 31), interpolation ~5 patients/day" per `lib/social-proof/index.ts:32-36`. Append 6 new decisions: General Consult retirement (2026-05-20), refund policy 100% on all decline categories (2026-05-20), support role (2026-05-11), per-doctor capability flags (2026-05-21), calm-chrome pattern on staff lists (2026-05-21), intake ledger rebuild (2026-05-20). One bullet each, link to the relevant CLAUDE.md gotcha. |
| 17 | `decision_brand_rehaul_2026_04_29.md` | L21 ICONIC_HOOK "Three minutes. Done." → "Start with a secure form. Takes about 3 minutes." Add footnote: "Final shipped string after Phase 1 voice sweep. Earlier working version was Three minutes. Done.; code is the canonical source via `lib/marketing/approved-claims.ts:109`." |
| 18 | `project_legacy_dashboard_css.md` | Add a `> **SHIPPED 2026-04-29.** Legacy CSS killed in patient portal rebuild Phase 1 (commit 5626c5ade). Historical context only; see CLAUDE.md Gotchas for current dashboard architecture.` banner at the top. No body changes. |
| 19 | `project_patient_portal_audit.md` | "Outstanding (truly optional, not blocking)" subsection: replace "Doctor + admin portal rebuilds" item with a SHIPPED note pointing at the staff cockpit overhaul plan (now archived per PR 1 at `docs/plans/archive/2026-05-20-staff-cockpit-overhaul-plan.md`) and CLAUDE.md staff cockpit gotchas. |
| 20 | `preferences.md` | No edit — once `roadmap.md` is refreshed in this same PR, the existing "Start by checking roadmap.md" preference becomes useful again. |

---

## 3. Untouched canonical docs (verified clean)

PR 2 explicitly does NOT edit these. Listed so the executor doesn't second-guess:

- `CLAUDE.md` — already edited in PR 1 (stack-downgrade scrub + release-log Gotcha). PR 2 does not touch it.
- `AGENTS.md` — generated from CLAUDE.md via `scripts/sync-agent-doc.sh`. Never hand-edited.
- `PRODUCT.md` — clean.
- `BRAND.md` — clean. Brand thesis, tagline system, signature devices, visual system, photography brief reference, banned phrases all current.
- `docs/VOICE.md` body — only L6 test path needs the fix (item #7); rest is clean.
- `docs/PHOTOGRAPHY_BRIEF.md` — clean.
- `docs/PRIMITIVES.md` — clean (explicitly notes General Consult retirement).
- `docs/AI_ONBOARDING.md` — clean.
- `docs/ADVERTISING_COMPLIANCE.md` — clean (2026-05-10 update).
- `docs/SEO_CONTENT_POLICY.md` — clean (2026-05-05 update).
- `docs/PRODUCTION_RELEASE_CHECKLIST.md` — clean.
- `docs/SERVICE_LAUNCH_CHECKLISTS.md` — clean (2026-05-19 update).
- `docs/DESIGN_SYSTEM_CHANGELOG.md` — clean (has all 5 versions through 2.0.2).
- `docs/OPERATIONS.md` — first 600 lines audited, clean. Second half (cron rollback runbook + auth runbook + env var rollback) only spot-grep'd; no drift indicators found. If executor finds drift while spot-checking the second half during PR 2, add to a sibling commit; do not block the PR.
- `docs/runbooks/comparative-tagline-complaint.md` — operational runbook, clean.
- `docs/audits/*` — historical, no action.
- `components/*/README.md` — `operator/` is drift-pinned and current; `request/` is colocated how-to and current; `uix/` is folded into ARCHITECTURE.md in PR 1.
- `scripts/load-tests/README.md` — operational, no drift.
- `.github/pull_request_template.md` — PR convention, no drift.

---

## 4. Execution sequence

> Run AFTER PR 1 merges to `main`. Open the worktree off the post-merge `main`. **One commit per logical step.** No squash.

### Step 0 — Create worktree

```bash
cd /Users/rey/Desktop/instantmed
git pull origin main           # ensure PR 1 changes are local
git worktree add ../instantmed-content-audit main
cd ../instantmed-content-audit
git checkout -b doc-content-audit-2026-05-23
```

### Step 1 — DESIGN.md (3 fixes)

Apply drift items #1, #2 (all 6 occurrences via single `replace_all`), #3.

Commit: `docs(design): refresh version header, motion path, retired General Consult ref`

### Step 2 — docs/CLINICAL.md (1 high-severity fix)

Apply drift item #4 (refund policy 100% across all categories).

Commit: `docs(clinical): refund policy 100% on decline across all categories (2026-05-20)`

### Step 3 — docs/BUSINESS_PLAN.md (1 fix + Last updated bump)

Apply drift item #5.

Commit: `docs(business-plan): retire General Consult fallback narrative, bump Last updated`

### Step 4 — docs/REVENUE_MODEL.md (1 fix + Last updated bump)

Apply drift item #6.

Commit: `docs(revenue-model): drop General Consult from pricing table, bump Last updated`

### Step 5 — docs/VOICE.md (1 path fix)

Apply drift item #7.

Commit: `docs(voice): correct voice-guard test path`

### Step 6 — docs/SECURITY.md (2 fixes for Phase 8 support role)

Apply drift items #8 and #9 together (same section, same support-role policy update).

Commit: `docs(security): document Phase 8 support role surface expansion (intake ledger + refund)`

### Step 7 — docs/TESTING.md (2 count fixes)

Operator runs the verification commands before editing:

```bash
# Get current unit test count
pnpm test --run 2>&1 | tail -20 | grep -E "Test Files|Tests"
# Get current e2e spec count
find e2e -name "*.spec.ts" | wc -l
```

Apply drift items #10 and #11 with the actual numbers (NOT the audit-time guesses).

Commit: `docs(testing): refresh unit and e2e test counts`

### Step 8 — docs/ARCHITECTURE.md (3 fixes)

Apply drift items #12 (path), #13 (spec count + migration count + most-recent migration filename).

Verify migration count locally:

```bash
ls supabase/migrations/ | wc -l    # should match the number you write
ls supabase/migrations/ | sort | tail -1   # the most recent filename
```

Commit: `docs(architecture): refresh constants path, e2e spec count, migration count + latest`

### Step 9 — Memory: MEMORY.md (status + phase)

Edit `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/MEMORY.md` per drift item #14.

**NOTE:** Memory edits are outside the project tree. The auto-mode classifier may prompt for permission. If it does, the operator approves. The execution session does NOT add a permission rule to global settings.

No git commit (memory tree is not under repo source control). Mention in PR description that memory was updated out-of-band.

### Step 10 — Memory: roadmap.md (38 days stale)

Edit `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/roadmap.md` per drift item #15.

No git commit (memory tree not in repo). Include before/after in PR description.

### Step 11 — Memory: decisions.md (45 days stale)

Edit `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/decisions.md` per drift item #16.

No git commit.

### Step 12 — Memory: 3 small files (BRAND rehaul, legacy dashboard CSS, patient portal audit)

Apply drift items #17, #18, #19.

No git commit.

### Step 13 — Run doc-audit

```bash
pnpm doc:audit
pnpm lint
pnpm typecheck
```

`pnpm doc:audit` (introduced by PR 1) runs the 8 doc-pinning Vitest contracts + sync-check + count guard + plan-ref check. If any of the 8 contracts now fails because of an edit that touched a pinned string: STOP. Restore the pinned string OR adjust the contract test in a follow-up commit only with operator approval.

The count check (`expected-md-count`) should still equal `45` — none of these edits add or remove a .md file. If it differs, investigate why before proceeding.

No commit for this step.

### Step 14 — Archive this plan

```bash
git mv docs/plans/2026-05-23-doc-content-audit-plan.md docs/plans/archive/
```

Update `docs/plans/archive/README.md` index to add the new row.

Commit: `docs(plans): archive content audit plan now that work is shipped`

### Step 15 — Open PR

```bash
gh pr create \
  --title "docs: content audit sweep (8 canonical docs + memory tree)" \
  --body "$(cat <<'EOF'
## Summary

Diff-only content sweep. 13 drift items across 8 canonical docs + 7 staleness items across memory tree.

**Canonical docs:**
- DESIGN.md: version header → 2.0.2, 6× motion path correction, drop General Consult from service-icon table.
- CLINICAL.md: refund policy 100% across all categories (was 50% partial on consult, retired 2026-05-20). **HIGH severity — clinical doc was contradicting current policy.**
- BUSINESS_PLAN.md: retire General Consult fallback narrative, bump Last updated.
- REVENUE_MODEL.md: drop General Consult pricing row, bump Last updated.
- VOICE.md: voice-guard test path correction.
- SECURITY.md: Phase 8 support role surface expansion (intake ledger + refund action).
- TESTING.md: current unit + e2e test counts.
- ARCHITECTURE.md: constants path, e2e spec count, migration count + latest filename.

**Memory tree (out of repo, edited out-of-band):**
- MEMORY.md: status + phase refresh.
- roadmap.md: 38-day staleness fix, append 7 shipped milestones.
- decisions.md: 45-day staleness fix, append 6 new decisions, social proof counter recalibration.
- decision_brand_rehaul_2026_04_29.md: ICONIC_HOOK alignment with code.
- project_legacy_dashboard_css.md: SHIPPED banner.
- project_patient_portal_audit.md: SHIPPED + cockpit follow-up note.

**Untouched:** CLAUDE.md, AGENTS.md, PRODUCT.md, BRAND.md, PHOTOGRAPHY_BRIEF.md, PRIMITIVES.md, AI_ONBOARDING.md, ADVERTISING_COMPLIANCE.md, SEO_CONTENT_POLICY.md, PRODUCTION_RELEASE_CHECKLIST.md, SERVICE_LAUNCH_CHECKLISTS.md, DESIGN_SYSTEM_CHANGELOG.md, OPERATIONS.md, runbook, audits, sub-READMEs.

## Test plan
- [ ] pnpm doc:audit passes (sync + 8 contracts + count + plan-refs)
- [ ] pnpm lint + pnpm typecheck pass
- [ ] Sample 3 edited docs and verify the new text resolves correctly (DESIGN.md version header, CLINICAL.md refund line, ARCHITECTURE.md migration count)
- [ ] git history shows one commit per doc + one for the archive move + one for the plan archive

Plan: docs/plans/2026-05-23-doc-content-audit-plan.md (moves to archive/ in Step 14).

Follow-up: PR 3 introduces 3 new canonical docs (ROADMAP, COMPLAINTS_SOP, DOCTOR_ONBOARDING). Plan TBD.
EOF
)"
```

---

## 5. What stays untouched in PR 2

- All source code. PR 2 does NOT touch `lib/`, `app/`, `components/`, `scripts/`, `e2e/`, `tests/`, `supabase/migrations/`, `package.json`, `tsconfig.json`, `next.config.mjs`, `eslint.config.mjs`, lighthouse configs, playwright configs.
- Tests. The 8 doc-pinning Vitest contracts continue to pass as-is. If a content edit happens to break a pinned string, STOP and investigate — do NOT modify the test.
- The 14 canonical docs listed as "untouched" in §3.
- Memory files not listed in §2 items #14-#19.
- `~/.claude/` global config, slash commands, skills.
- Project `.claude/` directory.

---

## 6. Verification results — open questions resolved

| Open question during audit | Resolution |
|----------------------------|-----------|
| Is the ICONIC_HOOK in BRAND.md / VOICE.md the same as the locked memory? | **No.** Memory says "Three minutes. Done."; code (`lib/marketing/approved-claims.ts:109`) and BRAND/VOICE all say "Start with a secure form. Takes about 3 minutes." Code wins. Memory gets corrected per item #17. |
| Is CLINICAL.md's 50% partial consult refund still current? | **No.** Code (`app/actions/decline-refund.ts` `REFUND_ON_DECLINE_CATEGORIES`), CLAUDE.md Refund Policy gotcha, and commit `e5ecf2451` (2026-05-20) all say 100% on decline for every refundable category. CLINICAL.md is stale. Item #4. |
| Is the support role bounded to /admin/ops only (per SECURITY.md)? | **No.** CLAUDE.md Phase 8 (2026-05-20) opened `/admin/intakes` (intake ledger) and the intake refund action to support, capped at $100/refund and 3/24h. SECURITY.md needs both row #8 (Protected Routes table) and row #9 (Staff Roles table) updated. |
| Did the DESIGN.md header version stay synced with `lib/design-system/version.ts`? | **No.** Doc says 1.0.0 (2026-04-20); actual 2.0.2 (2026-05-01). 4 versions behind. Item #1. |
| Does `lib/motion.ts` exist as a single file? | **No.** It is a directory `lib/motion/` with `index.ts` and `panel-variants.ts`. Imports resolve via Node module resolution; DESIGN.md's 6 path references mislead. Item #2. |
| Did `lib/constants.ts` exist? | **No.** It is a directory `lib/constants/` with `index.ts` and `service-types.ts`. ARCHITECTURE.md and REVENUE_MODEL.md reference `lib/constants/index.ts` correctly elsewhere; only ARCHITECTURE.md L720 is wrong. Item #12. |
| Are the test counts in TESTING.md current? | **No.** TESTING.md says 2,308 unit tests / 231 files; CLAUDE.md says 2,453 / 258 files as of 2026-05-19. Operator re-runs `pnpm test` at execution time to get the actual current count rather than trusting either doc. Item #10. |
| Is the e2e spec count consistent across docs? | **No.** TESTING.md says 54; ARCHITECTURE.md says 44; `find e2e -name "*.spec.ts" \| wc -l` returns 62 at audit time. Both docs are wrong; operator verifies and writes the actual number. Item #11 and #13. |
| Is the migration count in ARCHITECTURE.md current? | **No.** ARCHITECTURE.md says 65; CLAUDE.md gotcha says 73; ARCHITECTURE.md most-recent filename is 16 days behind. Item #13. |

---

## 7. Post-PR-2 memory and slash-command audit

PR 2 already edits 6 memory files. After PR 2 merges, the operator should run `/consolidate-memory` in a separate session to:

1. Re-index `MEMORY.md` against the actual file list (none added or removed in PR 2, but verify).
2. Decide whether the now-historical `project_legacy_dashboard_css.md` and `project_patient_portal_audit.md` should be moved into a `memory/archive/` subdir or kept in-place with their SHIPPED banners.
3. Spot-check `design-system.md` (memory mirror of the design system) against the live `DESIGN.md` + `DESIGN_SYSTEM_CHANGELOG.md` for drift; if drift, delete the memory file (the canonical doc is enough).
4. Spot-check `patterns.md` (72 days old) for any patterns that have been retired since.

Slash-commands and global skills: out of scope. The operator's `~/.claude/skills/` and `~/.claude/commands/` are operator-owned. If any of them reference deleted/moved doc paths from PR 1 (e.g. `docs/DESIGN_SYSTEM.md`, `docs/RELEASE_LOG.md`, `components/uix/README.md`), surface them to the operator with a one-line report; do NOT edit.

---

## Appendix — drift not in PR 2 scope

Items found during the audit but deliberately deferred:

| Item | Why deferred |
|------|--------------|
| OPERATIONS.md second half (lines 600-1167) | Spot-grep showed no drift. Full read would add ~30 minutes to the audit for low probability of finding anything actionable. If executor reads the second half during PR 2 and finds drift, add a sibling commit. |
| 17 memory files not in §2 items #14-#19 | Either accurate or operator-preference (the `feedback_*` files) or out-of-scope (other-project files like `project_moirai.md`, `project_google_ads.md`). Operator's `/consolidate-memory` session handles. |
| 3 new canonical docs (ROADMAP, COMPLAINTS_SOP, DOCTOR_ONBOARDING) | PR 3 scope, separate plan. |
| `~/.claude/skills/` and `~/.claude/commands/` | Operator-owned global config. Out of scope. |
| `lib/design-system/version.ts` source comments → versioned changelog cross-link | The source file's history comment block (lines 13-24) is a duplicate of `DESIGN_SYSTEM_CHANGELOG.md`. Low-value refactor; defer. |

---

**End of plan.** Locked at 2026-05-23.

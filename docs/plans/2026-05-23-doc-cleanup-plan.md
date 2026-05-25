# Doc Cleanup Plan — InstantMed (PR 1 of 3)

> **Status:** Locked. Plan-only. Do NOT execute in this session.
> **Date:** 2026-05-23
> **Authored in:** session `c725409e-a484-46e6-9fbe-0772209a81e1`
> **Executable cold in:** ~60-90 minutes by a fresh worktree session reading this file top-to-bottom.
>
> **Sequencing:** This is PR 1 of a 3-PR program (decision §0 row 16):
> - **PR 1 (this plan):** structural cleanup + doc-hygiene tooling. 15 commits. Doc-and-tooling diff only. Ships first.
> - **PR 2 (separate plan, drafted next):** content audit sweeps of 7 canonical docs (BUSINESS_PLAN, REVENUE_MODEL, BRAND, VOICE, DESIGN, PRODUCT, PHOTOGRAPHY_BRIEF) + the user's `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/` tree. Diff-only edits, no rewrites.
> - **PR 3 (separate plan, drafted after PR 2):** 3 new canonical docs (`docs/ROADMAP.md`, `docs/COMPLAINTS_SOP.md`, `docs/DOCTOR_ONBOARDING.md`), extracted from scattered existing content with operator-marked gaps.
>
> **Scope of PR 1 only:** Surgical doc cleanup. The canon is in decent shape on structure (60 .md files, ~14k lines, drift-test-pinned) but its content currency is being audited separately in PR 2. PR 1 trims the rot — superseded plans, broken refs, redirect stubs, and a third-party skill drop — without rewriting any surviving doctrine.
>
> **Out of scope for PR 1:** Content edits to canonical docs (those go in PR 2), creating new canonical docs (those go in PR 3), editing source code, splitting large canonical docs (OPERATIONS.md, ARCHITECTURE.md), touching `~/.claude/` global config, modifying tests beyond what a doc move forces.

---

## 0. Decisions locked

| # | Decision | Resolution | Source |
|---|----------|-----------|--------|
| 1 | Cleanup mode for completed/superseded plans | **Move to `docs/plans/archive/`**. Keep the receipts, separate from active plans. | Operator answer 2026-05-23 |
| 2 | `.agents/skills/` (13 SKILL.md files) | **Delete the directory.** No inbound references; taste profiles contradict BRAND.md. | Operator answer 2026-05-23 |
| 3 | `docs/AI_ONBOARDING.md` location | **Keep at current path.** Drift-test-pinned. Doc serves AI consumers, not the human operator. | Default selected on operator "idk" |
| 4 | Sub-tree README files | **Keep colocated for operator + request + load-tests, delete blog-photos placeholder, fold uix into ARCHITECTURE.md.** | Operator answer 2026-05-23 |
| 5 | Cleanup mode for `docs/DESIGN_SYSTEM.md` (5-line redirect stub) | **Delete.** No inbound references. CLAUDE.md + drift-test point directly at root `DESIGN.md`. | Pre-locked by inventory finding |
| 6 | Cleanup mode for `docs/RELEASE_LOG.md` (abandoned, one 2026-05-07 entry) | **Delete.** Format abandoned. No inbound references. Production release evidence belongs in CI artifacts, not a hand-written log. | Pre-locked by inventory finding |
| 7 | Broken plan reference at `CLAUDE.md:107` / `AGENTS.md:107` (`docs/plans/2026-04-07-stable-stack-downgrade.md`) | **Scrub the dead path.** Keep the memory-file reference. | Pre-locked by inventory finding |
| 8 | Inbound reference at `docs/DESIGN_SYSTEM_CHANGELOG.md:181` to the design-system-95 plan | **Rewrite to `docs/plans/archive/...`** in the same commit as the plan move. | Pre-locked by inventory finding |
| 9 | Archive retention rule | **90 days minimum.** Re-evaluate quarterly. Documented in `docs/plans/archive/README.md`. | Default lock |
| 10 | New `docs/bookkeeping/file-map.md` | **Create.** Single source of truth for "what every doc is and where it lives", maintained in lockstep with this plan's outcome. | Default lock |
| 11 | No-squash commit policy | **One commit per logical step** (per Execution Sequence §7). | Per audit prompt constraint |
| 12 | Worktree | **Execute in `git worktree add ../instantmed-doc-cleanup` off `main`.** Open a PR from the branch. | Per audit prompt constraint |
| 13 | Scope creep into hygiene tooling | **Approved.** This PR also adds `pnpm doc:audit` (new script + package.json entry + CI wire-in) and `scripts/check-doc-plan-refs.sh` to prevent future zombie-reference rot. Doc-only cleanup is not enough on its own; without a guard, the same drift recurs in 90 days. | Operator instruction 2026-05-23 |
| 14 | Codify "no hand-written release logs" doctrine | **Add a one-line Gotcha to `CLAUDE.md`** so the deletion of `docs/RELEASE_LOG.md` does not invite a `docs/RELEASE_LOG_2026_Q3.md` six weeks later. Sync projects to `AGENTS.md`. | Operator instruction 2026-05-23 |
| 15 | Memory hygiene pass timing | **Reassigned to PR 2.** The memory audit was previously planned as a post-merge `/consolidate-memory` run. Operator decision 2026-05-23 (Q3) moved this into PR 2's content audit scope so memory rewrites and canon-doc rewrites land together. PR 1 still does a read-only spot-check (§11). | Operator instruction 2026-05-23 (revised) |
| 16 | Sequencing of expanded scope | **Three PRs in sequence.** PR 1 = this plan (structural + tooling). PR 2 = content audit sweeps of 7 canonical docs + memory audit. PR 3 = 3 new canonical docs (ROADMAP, COMPLAINTS_SOP, DOCTOR_ONBOARDING). Each independently revertable, each reviewable. | Operator instruction 2026-05-23 |
| 17 | Source material for the 3 new canonical docs (PR 3) | **Extract from scattered existing content + operator-marked gaps.** ROADMAP from `memory/roadmap.md` + BUSINESS_PLAN sequencing. COMPLAINTS_SOP from CLAUDE.md Platform Identity + runbook + CLINICAL.md. DOCTOR_ONBOARDING from SERVICE_LAUNCH_CHECKLISTS + CLAUDE.md doctor capability flag Gotchas + Parchment sections. Locked for PR 3, not PR 1. | Operator instruction 2026-05-23 |

---

## 1. Final canonical structure

Target: **30 canonical .md files**. Down from the current effective set of ~60 (excluding `.agents/skills/`).

```
root/
  CLAUDE.md                                 agent contract (canonical, source for AGENTS.md)
  AGENTS.md                                 agent contract (generated; never hand-edit)
  PRODUCT.md                                design context (small, drift-pinned)
  DESIGN.md                                 design system law

docs/
  AI_ONBOARDING.md                          AI quick-start (drift-pinned)
  ARCHITECTURE.md                           system architecture (drift-pinned)
  BRAND.md                                  brand spine
  VOICE.md                                  voice + banned phrases
  PHOTOGRAPHY_BRIEF.md                      shot list + GPT prompt scaffold
  PRIMITIVES.md                             marketing primitives registry
  CLINICAL.md                               clinical boundaries + APP rules
  SECURITY.md                               PHI, RLS, kill switches
  OPERATIONS.md                             incident response, cron, env vars
  TESTING.md                                test conventions + E2E seams
  BUSINESS_PLAN.md                          current-phase strategy
  REVENUE_MODEL.md                          $1M model + service mix
  ADVERTISING_COMPLIANCE.md                 Google/AHPRA/TGA rules
  SEO_CONTENT_POLICY.md                     organic content rules
  PRODUCTION_RELEASE_CHECKLIST.md           pre-promotion gates
  SERVICE_LAUNCH_CHECKLISTS.md              repeat-script/ED/hair-loss gates
  DESIGN_SYSTEM_CHANGELOG.md                versioned design-system changelog

  runbooks/
    comparative-tagline-complaint.md        AHPRA/TGA/Google complaint runbook

  audits/                                   historical audits (read-only references)
    2026-04-21-migration-drift-audit.md
    2026-05-03-supabase-conversion-audit.md
    2026-05-11-patient-portal-post-rebuild-audit.md
    google-ads-audit.md

  plans/                                    active plans only
    2026-05-23-doc-cleanup-plan.md          (this file; will move to archive/ once executed)

    archive/                                completed or superseded plans, 90-day retention
      README.md                             archive policy + index
      2026-03-25-blood-test-referrals.md
      2026-04-06-revenue-engagement-design.md
      2026-04-06-revenue-engagement-plan.md
      2026-04-13-god-component-decomposition.md
      2026-04-13-lib-restructure-and-script-wiring.md
      2026-04-20-design-system-95-sprint.md
      2026-05-04-health-guides-rehaul.md
      2026-05-20-admin-ops-cockpit-reshape-design.md
      2026-05-20-admin-ops-cockpit-reshape-plan.md
      2026-05-20-staff-cockpit-overhaul-design.md
      2026-05-20-staff-cockpit-overhaul-plan.md

  bookkeeping/
    file-map.md                             new: "what is every doc and where"

components/
  operator/README.md                        drift-test-pinned, colocated doctrine
  request/README.md                         colocated how-to for the unified intake flow

scripts/
  load-tests/README.md                      colocated k6 ops doc

.github/
  pull_request_template.md                  PR convention
```

**Doc count check:** 4 root laws + 17 docs/ + 1 runbook + 4 audits + 1 active plan + (archive index) + 1 bookkeeping + 2 colocated component READMEs + 1 script README + 1 PR template = **31 canonical** (within 20-30 target band, +1 for the archive index file).

---

## 2. Deletion list

Group A — **stub / abandoned (no inbound references, hard delete)**:

| File | Reason | Inbound refs |
|------|--------|--------------|
| `docs/DESIGN_SYSTEM.md` | 5-line redirect stub. Root `DESIGN.md` is the canonical design system; CLAUDE.md satellite table and drift test point at it directly. | 0 |
| `docs/RELEASE_LOG.md` | One stale 2026-05-07 entry. Format abandoned. Release evidence lives in CI + Sentry + Vercel. | 0 |
| `scripts/blog-photos/README.md` | One-line placeholder ("Drop category photos here"). The script `scripts/update-blog-images.mjs:5` already documents the path inline. | 0 |

Group B — **third-party skill drop (operator-confirmed)**:

| Directory | Reason |
|-----------|--------|
| `.agents/skills/` (whole tree, 13 SKILL.md files + parent dirs) | Contains: `brandkit`, `design-taste-frontend`, `full-output-enforcement`, `gpt-taste`, `high-end-visual-design`, `image-to-code`, `imagegen-frontend-mobile`, `imagegen-frontend-web`, `industrial-brutalist-ui`, `minimalist-ui`, `redesign-existing-projects`, `stitch-design-taste` (each with a `SKILL.md`; `stitch-design-taste` also has a `DESIGN.md`). Zero inbound references from CLAUDE.md, AGENTS.md, docs/, package.json, or scripts/. Taste profiles directly contradict `docs/BRAND.md` ("calm, anti-aggressive", anti-glass, anti-gradient). Operator confirmed delete. |

Group C — **fold-then-delete (content preserved per §3)**:

| File | Disposition |
|------|-------------|
| `components/uix/README.md` | Fold into `docs/ARCHITECTURE.md` Component Patterns → UIX Component Library section. See §3. |

---

## 3. Folds (content preserved into new home, source deleted)

### Fold 1 — `components/uix/README.md` → `docs/ARCHITECTURE.md`

**Source:** `components/uix/README.md` (60 lines).
**Target:** `docs/ARCHITECTURE.md` § Component Patterns → UIX Component Library (already exists at ~line 504-518).

**What to merge in:**
- The exact `import { ... } from "@/components/uix"` export list (Accordion, AccordionItem, Badge, Button, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CompactStepper, DatePickerField, Input, Modal, ModalBody, ModalFooter, ModalHeader, PageBreadcrumbs, Pagination, ScrollShadow, Skeleton, Snippet, Spinner, Stepper, Tooltip, UserCard, useDisclosure).
- The "Do not add new compatibility APIs here unless the repo has live callers that need them. Prefer canonical components from `@/components/ui` and domain-specific primitives first." retirement notice.
- The PageBreadcrumbs / UserCard / Snippet usage examples (compact form, 3 examples).

**Where in ARCHITECTURE.md:** Expand the existing UIX subsection at the "UIX Component Library" heading. Add a "Status: compatibility layer in retreat — do not add new APIs" line at the top.

**Verification:** After the fold, `grep -n "components/uix/README" docs/ ARCHITECTURE.md` must return zero. The drift contract test still passes (it does not pin uix/README).

---

## 4. Rewrites required

Three surviving docs carry stale or broken references. All three are pinpoint string scrubs, not rewrites.

### Rewrite 1 — `CLAUDE.md:107` (and projected `AGENTS.md:107`)

**Before:**
```
5. Reference the prior context: `docs/plans/2026-04-07-stable-stack-downgrade.md` and `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/decisions.md`.
```

**After:**
```
5. Reference the prior context in `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/decisions.md`.
```

**Why:** The plan file `docs/plans/2026-04-07-stable-stack-downgrade.md` does not exist on disk. Verified by `ls` + grep across docs/, plans/, archive/, lib/, app/. The memory-file reference remains valid.

**Mechanic:** Edit `CLAUDE.md` only. Then run `scripts/sync-agent-doc.sh` to regenerate `AGENTS.md`. Do NOT hand-edit `AGENTS.md` — the sync script projects CLAUDE.md → AGENTS.md via sed (`~/.claude/` → `~/.Codex/`, etc).

### Rewrite 2 — `docs/DESIGN_SYSTEM_CHANGELOG.md:181`

**Before:**
```
See `docs/plans/2026-04-20-design-system-95-sprint.md` for full audit rubric and success criteria.
```

**After:**
```
See `docs/plans/archive/2026-04-20-design-system-95-sprint.md` for full audit rubric and success criteria.
```

**Why:** The referenced plan moves to archive in §5. Update the inbound link in the same commit as the move so no commit leaves a broken ref.

### Rewrite 3 — `docs/ARCHITECTURE.md` § UIX subsection

See §3 Fold 1. Expand the existing UIX subsection with the export list + retirement notice + usage examples from `components/uix/README.md`, then delete the source README.

### Rewrite 4 — `CLAUDE.md` Gotchas: codify "no hand-written release logs"

**Insertion point:** `CLAUDE.md` § Gotchas, alphabetically grouped near the "Med certs do not expire" / "Med cert language is locked" entries (around line ~250-270 depending on current state). New bullet, single line:

```
- **No hand-written release logs**: `docs/RELEASE_LOG.md` was deleted 2026-05-23. Release evidence belongs in commit messages, GitHub Releases, and Sentry release tagging — not in a markdown file that goes stale after the first deploy. Do not resurrect it as `docs/RELEASE_LOG_2026_Q3.md` or any variant. If the operator wants a live release feed, add a `system_release` audit row from the post-deploy smoke workflow and surface it on `/admin/ops` next to the recovery rows.
```

**Mechanic:** Edit `CLAUDE.md` only. Then `scripts/sync-agent-doc.sh` projects to `AGENTS.md`.

### Rewrite 5 — `package.json` scripts: add `doc:audit`

**Insertion point:** `package.json` `"scripts"` block. Add one line near other check/audit scripts (e.g. next to `"check:node"`, `"check:sentry"`, `"check:staff-roles"`):

```json
"doc:audit": "scripts/doc-audit.sh",
```

**Verification:** `pnpm doc:audit` resolves and runs the script.

### Rewrite 6 — `.github/workflows/ci.yml`: add doc-audit job

**Insertion point:** `.github/workflows/ci.yml`. Add a new job (or step in an existing fast job) that runs `pnpm doc:audit`. Suggested shape (executor adapts to the existing workflow structure):

```yaml
  doc-audit:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.23.0
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm doc:audit
```

If a workflow already does install+setup+test, the executor folds `pnpm doc:audit` into that job as a final step instead of creating a new job. Either is acceptable.

---

## 5. Direct moves (rename only, no rewrite)

`git mv` operations — no content edit, preserve full history:

```
git mv docs/plans/2026-03-25-blood-test-referrals.md docs/plans/archive/
git mv docs/plans/2026-04-06-revenue-engagement-design.md docs/plans/archive/
git mv docs/plans/2026-04-06-revenue-engagement-plan.md docs/plans/archive/
git mv docs/plans/2026-04-13-god-component-decomposition.md docs/plans/archive/
git mv docs/plans/2026-04-13-lib-restructure-and-script-wiring.md docs/plans/archive/
git mv docs/plans/2026-04-20-design-system-95-sprint.md docs/plans/archive/
git mv docs/plans/2026-05-04-health-guides-rehaul.md docs/plans/archive/
git mv docs/plans/2026-05-20-admin-ops-cockpit-reshape-design.md docs/plans/archive/
git mv docs/plans/2026-05-20-admin-ops-cockpit-reshape-plan.md docs/plans/archive/
git mv docs/plans/2026-05-20-staff-cockpit-overhaul-design.md docs/plans/archive/
git mv docs/plans/2026-05-20-staff-cockpit-overhaul-plan.md docs/plans/archive/
```

**Status justification per file:**

| Plan | Why archive |
|------|-------------|
| `2026-03-25-blood-test-referrals.md` | Self-marked SUPERSEDED in header. |
| `2026-04-06-revenue-engagement-design.md` | Self-marked Partially superseded. |
| `2026-04-06-revenue-engagement-plan.md` | Self-marked Partially superseded. |
| `2026-04-13-god-component-decomposition.md` | "Pending approval" 7 weeks ago. Component tree has been reorganised on a different cadence per `docs/ARCHITECTURE.md`; treat as historical proposal. |
| `2026-04-13-lib-restructure-and-script-wiring.md` | Same pattern as above. CLAUDE.md gotchas already document the resulting lib structure. |
| `2026-04-20-design-system-95-sprint.md` | Shipped. `lib/design-system/version.ts` is v2.0.x; sprint completion narrative is in `docs/DESIGN_SYSTEM_CHANGELOG.md`. |
| `2026-05-04-health-guides-rehaul.md` | Shipped. CLAUDE.md "Health guide workflow" Gotcha section documents the resulting guide rules + generated visuals pipeline. |
| `2026-05-20-admin-ops-cockpit-reshape-{design,plan}.md` | Shipped. CLAUDE.md "Operational controls" + "Cockpit counter + recovery primitives (2026-05-20)" Gotchas document the resulting `/admin/ops` cockpit. |
| `2026-05-20-staff-cockpit-overhaul-{design,plan}.md` | Shipped. CLAUDE.md "Staff dashboard URL (Phase 2 remaster, 2026-05-12)" + "Intake ledger (2026-05-20 rebuild)" + commit `43063b889 refactor(ledger): collapse cockpit_v2 to canonical client, drop the flag` confirm Phases 1-8 done. |

**Note:** If any of the 11 plans has follow-on work the operator still wants to track, surface it to the operator BEFORE moving (see §9 verification step). Otherwise execute the move.

---

## 6. New files to create

### New file 1 — `docs/plans/archive/README.md`

**Content (verbatim, ~30 lines):**

```markdown
# Plans Archive

Completed or superseded plans, preserved for retrospective context.

## Retention rule

Minimum 90 days. Re-evaluate quarterly. Delete only if:
- the plan has been fully superseded by a newer plan that has itself shipped, AND
- no current doc, code header, or memory file references the archived plan path.

## When to read these

- Onboarding a new contributor and they ask "why is X built this way?".
- A retro on a shipped feature that needs the original goals/risks.
- Resurrecting a deliberately-deferred plan (e.g. blood test referrals, repeat-Rx subscription nudge).

## When NOT to read these

- Day-to-day work. The canon (root laws + docs/) carries the live truth.
- Confusion about current behaviour. The code is the source of truth; archived plans describe intent that may or may not have shipped as written.

## Index

| File | Why archived |
|------|--------------|
| 2026-03-25-blood-test-referrals.md | Superseded (self-marked); pathology not in current /request service model. |
| 2026-04-06-revenue-engagement-design.md | Partially superseded (self-marked); Rx subscription nudge not aligned with one-off model. |
| 2026-04-06-revenue-engagement-plan.md | Same as above. Review-request work shipped. |
| 2026-04-13-god-component-decomposition.md | Pending approval since 2026-04-13; component tree reorganised on a different cadence. |
| 2026-04-13-lib-restructure-and-script-wiring.md | Pending approval since 2026-04-13; lib structure stabilised independently. |
| 2026-04-20-design-system-95-sprint.md | Shipped. See docs/DESIGN_SYSTEM_CHANGELOG.md. |
| 2026-05-04-health-guides-rehaul.md | Shipped. See CLAUDE.md → "Health guide workflow". |
| 2026-05-20-admin-ops-cockpit-reshape-{design,plan}.md | Shipped. See CLAUDE.md → "Cockpit counter + recovery primitives". |
| 2026-05-20-staff-cockpit-overhaul-{design,plan}.md | Shipped. See CLAUDE.md → "Staff dashboard URL", "Intake ledger". |
```

### New file 2 — `docs/bookkeeping/file-map.md`

**Purpose:** Single source of truth for "what is every .md file and where does it live". A fresh contributor reads this file and knows the full doc surface without grepping.

**Content sketch (the executor fills in by reading §1 above):**

```markdown
# Doc File Map

> Last updated: 2026-05-23 (post-cleanup).
> Single source of truth for the full canonical doc surface.

## Root laws (4)

| File | Owner | Pinned by |
|------|-------|-----------|
| CLAUDE.md | Operator | lib/__tests__/project-docs-drift-contract.test.ts; scripts/sync-agent-doc.sh |
| AGENTS.md | Generated from CLAUDE.md | Same |
| PRODUCT.md | Operator | project-docs-drift-contract |
| DESIGN.md | Operator | project-docs-drift-contract; marketing-copy-contract |

## docs/ (17 satellites)

[... full table per §1 with one row per file, naming the test or code reference that pins it ...]

## docs/runbooks/ (1)
## docs/audits/ (4)
## docs/plans/ (active plans only; archive in subdir)
## docs/bookkeeping/ (this file)
## components/*/README.md (2)
## scripts/*/README.md (1)
## .github/pull_request_template.md
```

**Owner:** Operator. Update on every doc add/move/delete.

### New file 4 — `scripts/doc-audit.sh`

**Path:** `scripts/doc-audit.sh` (chmod +x).
**Purpose:** Single CI-callable command that catches doc-surface drift. Wraps the existing AGENTS.md sync check, the 8 doc-pinning Vitest contracts, a count-vs-expected guard, and the broken-plan-reference check.

**Content (verbatim, ~50 lines):**

```bash
#!/usr/bin/env bash
# scripts/doc-audit.sh
# Detects drift in the documentation surface.
# Run as: pnpm doc:audit
#
# Fails if:
#   - AGENTS.md drifted from CLAUDE.md (scripts/sync-agent-doc.sh --check)
#   - any of the 8 doc-pinning Vitest contracts fails
#   - the .md file count differs from docs/bookkeeping/expected-md-count
#   - any docs/plans/*.md reference in surviving canon points at a non-existent file
#
# If the count check fails intentionally (you added/removed a doc),
# update docs/bookkeeping/expected-md-count AND docs/bookkeeping/file-map.md
# in the same commit.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Sync check: AGENTS.md projected from CLAUDE.md"
scripts/sync-agent-doc.sh --check

echo "==> Vitest: doc-pinning contracts (8 specs)"
pnpm vitest run --reporter=dot \
  lib/__tests__/project-docs-drift-contract.test.ts \
  lib/__tests__/code-clean-retirement-contract.test.ts \
  lib/__tests__/release-check-contract.test.ts \
  lib/__tests__/service-launch-checklists-contract.test.ts \
  lib/__tests__/cron-surface-contract.test.ts \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts \
  lib/__tests__/password-reset-flow-contract.test.ts

echo "==> Doc surface count"
ACTUAL=$(find . -name "*.md" \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./.next-stale-*/*" \
  -not -path "./.git/*" \
  -not -path "./output/*" \
  -not -path "./playwright-report/*" \
  -not -path "./test-results/*" \
  -not -path "./.vercel/*" \
  -not -path "./.lighthouseci/*" \
  -not -path "./.playwright-cli/*" \
  | wc -l | tr -d ' ')
EXPECTED=$(cat docs/bookkeeping/expected-md-count | tr -d ' \n')
if [ "$ACTUAL" -ne "$EXPECTED" ]; then
  echo "FAIL: expected $EXPECTED .md files, found $ACTUAL"
  echo "If intentional, update docs/bookkeeping/expected-md-count AND docs/bookkeeping/file-map.md in the same commit."
  exit 1
fi
echo "OK: $ACTUAL .md files (matches expected)"

echo "==> Broken plan-reference check"
scripts/check-doc-plan-refs.sh

echo "==> doc:audit passed"
```

### New file 5 — `scripts/check-doc-plan-refs.sh`

**Path:** `scripts/check-doc-plan-refs.sh` (chmod +x).
**Purpose:** Fails if any surviving canon doc (CLAUDE.md, AGENTS.md, PRODUCT.md, DESIGN.md, docs/*.md outside docs/plans/) cites a `docs/plans/*.md` path that does not resolve. Prevents the next stack-downgrade zombie reference.

**Content (verbatim, ~40 lines):**

```bash
#!/usr/bin/env bash
# scripts/check-doc-plan-refs.sh
# Fails if any surviving canon doc references a docs/plans/*.md path that does
# not exist on disk. Scoped to canon, not plans (plans referencing each other
# during a multi-step build is normal).
#
# Pattern: docs/plans/<slug>.md OR docs/plans/archive/<slug>.md
#
# Standalone or called from scripts/doc-audit.sh.

set -euo pipefail
cd "$(dirname "$0")/.."

BROKEN=()

# Canon set: root laws + docs/ excluding docs/plans/
CANON_FILES=$(find . -maxdepth 4 -name "*.md" \
  -not -path "./docs/plans/*" \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./.next/*" \
  -not -path "./.next-stale-*/*" \
  -not -path "./.agents/*" \
  | grep -E "^\./(CLAUDE\.md|AGENTS\.md|PRODUCT\.md|DESIGN\.md|docs/)" || true)

while IFS= read -r FILE; do
  [ -z "$FILE" ] && continue
  REFS=$(grep -oE 'docs/plans/(archive/)?[a-zA-Z0-9_./-]+\.md' "$FILE" || true)
  while IFS= read -r REF; do
    [ -z "$REF" ] && continue
    if [ ! -f "$REF" ]; then
      BROKEN+=("$FILE -> $REF")
    fi
  done <<< "$REFS"
done <<< "$CANON_FILES"

if [ ${#BROKEN[@]} -gt 0 ]; then
  echo "FAIL: broken docs/plans/ references in surviving canon:"
  for B in "${BROKEN[@]}"; do
    echo "  $B"
  done
  echo ""
  echo "Either restore the missing file, update the reference path (e.g. add archive/), or remove the reference."
  exit 1
fi

echo "OK: no broken docs/plans/ references in canon"
```

### New file 6 — `docs/bookkeeping/expected-md-count`

**Path:** `docs/bookkeeping/expected-md-count` (plain text, no extension so it is not itself counted).
**Content:** a single integer line representing the expected count of .md files after Step 11 (cleanup plan archived).

**Final expected value: `45`** (computed in §1, validated in §10b adjustment, verified in Step 10 run of `pnpm doc:audit`).

**Note for executor:** if the actual `find` count differs from 45 at the time of Step 10, do NOT silently update the file. Stop, investigate the diff (which file was missed?), report. The whole point of the count file is to catch silent additions.

---

## 7. Execution sequence

> Run in `git worktree add ../instantmed-doc-cleanup main` off main. **One commit per step. Do not squash.** Stop on any failure and report.

### Step 0 — Create the worktree

```bash
cd /Users/rey/Desktop/instantmed
git worktree add ../instantmed-doc-cleanup main
cd ../instantmed-doc-cleanup
git checkout -b doc-cleanup-2026-05-23
```

### Step 1 — Create subdirectories

```bash
mkdir -p docs/plans/archive
mkdir -p docs/bookkeeping
```

Commit: `docs: scaffold plans/archive and bookkeeping subdirs`

### Step 2 — Move shipped/superseded plans to archive

Run the 11 `git mv` commands in §5 verbatim.

Commit: `docs(plans): archive 11 shipped or superseded plans`

### Step 3 — Update the inbound reference to the design-system-95 plan

Edit `docs/DESIGN_SYSTEM_CHANGELOG.md:181` per §4 Rewrite 2.

Commit: `docs(design-system-changelog): point at archived design-system-95 sprint plan`

### Step 4 — Delete the `.agents/skills/` directory

```bash
git rm -r .agents/skills
# If .agents/ becomes empty, also remove it:
rmdir .agents 2>/dev/null || true
```

Verify: `grep -rn "\.agents/skills" .` returns nothing.

Commit: `chore: delete unused .agents/skills third-party skill drop`

### Step 5 — Delete stub/abandoned docs

```bash
git rm docs/DESIGN_SYSTEM.md
git rm docs/RELEASE_LOG.md
git rm scripts/blog-photos/README.md
```

Commit: `docs: delete abandoned DESIGN_SYSTEM pointer, RELEASE_LOG, blog-photos placeholder`

### Step 6 — Fold `components/uix/README.md` into ARCHITECTURE.md

a. Open `docs/ARCHITECTURE.md`, locate the existing UIX Component Library subsection under § Component Patterns.
b. Add a "Status: compatibility layer in retreat — do not add new APIs" line at the top of the subsection.
c. Expand the existing component table to cover the full export list from `components/uix/README.md` (Accordion, AccordionItem, Badge, Button, Card + Card sub-parts, CompactStepper, DatePickerField, Input, Modal + Modal sub-parts, PageBreadcrumbs, Pagination, ScrollShadow, Skeleton, Snippet, Spinner, Stepper, Tooltip, UserCard, useDisclosure).
d. Move the PageBreadcrumbs / UserCard / Snippet usage example block in.
e. `git rm components/uix/README.md`.

Verify: `grep -n "components/uix/README" docs/` returns nothing.

Commit: `docs(architecture): fold components/uix README into Component Patterns, delete source`

### Step 7 — Scrub the broken stack-downgrade reference

a. Edit `CLAUDE.md:107` per §4 Rewrite 1.
b. Run `scripts/sync-agent-doc.sh` to regenerate `AGENTS.md`.
c. Confirm via `scripts/sync-agent-doc.sh --check` (returns 0).

Commit: `docs(claude): drop broken 2026-04-07-stable-stack-downgrade plan reference`

### Step 8 — Create archive README

Write `docs/plans/archive/README.md` per §6 New file 1.

Commit: `docs(plans/archive): document retention policy and index`

### Step 9 — Create file-map

Write `docs/bookkeeping/file-map.md` per §6 New file 2. Fill in the full table from §1.

Commit: `docs(bookkeeping): introduce canonical file map`

### Step 9a — Create the archived-plan follow-ups stub

Write `docs/plans/2026-05-23-archived-plan-followups.md` per §10b.

Commit: `docs(plans): capture open follow-ups from archived plans as active backlog stub`

### Step 9b — Create the broken-plan-reference check script

Write `scripts/check-doc-plan-refs.sh` per §6 New file 5. `chmod +x scripts/check-doc-plan-refs.sh`.

Run it once standalone to confirm zero broken refs: `./scripts/check-doc-plan-refs.sh` should print `OK`.

Commit: `chore(docs): add check-doc-plan-refs.sh to fail on zombie plan references`

### Step 9c — Create the doc-audit script + expected-count seed

a. Write `scripts/doc-audit.sh` per §6 New file 4. `chmod +x scripts/doc-audit.sh`.
b. Write `docs/bookkeeping/expected-md-count` with the single line `45`.
c. Add `"doc:audit": "scripts/doc-audit.sh"` to `package.json` `"scripts"` block per §4 Rewrite 5.
d. Run `pnpm doc:audit`. It should pass. If the count differs from 45, STOP and report which file is unexpected.

Commit: `chore(docs): add pnpm doc:audit (sync + contracts + count + plan-refs)`

### Step 9d — Wire doc-audit into CI

Edit `.github/workflows/ci.yml` per §4 Rewrite 6. Add `pnpm doc:audit` as a step (either in a new `doc-audit` job or as a step in the existing fast lint/test job — executor decides based on the workflow shape).

Verify locally that the YAML parses: `cat .github/workflows/ci.yml | python3 -c "import yaml,sys; yaml.safe_load(sys.stdin)"` returns no error (or use `gh workflow view` after push).

Commit: `ci(docs): run pnpm doc:audit on every CI build`

### Step 9e — Add the "no hand-written release logs" Gotcha

Edit `CLAUDE.md` Gotchas section per §4 Rewrite 4. Add the single bullet.

Run `scripts/sync-agent-doc.sh` to regenerate `AGENTS.md`.

Verify: `scripts/sync-agent-doc.sh --check` returns 0.

Commit: `docs(claude): codify no-hand-written-release-logs doctrine`

### Step 10 — Verify nothing broke

Run, in order, and confirm exit 0 on each:

```bash
pnpm doc:audit                         # wraps sync-check + 8 contracts + count + plan-refs
pnpm lint
pnpm typecheck
scripts/check-stack-pins.sh
scripts/check-orphaned-files.sh
```

`pnpm doc:audit` is the single canonical doc-hygiene gate now. If it fails:
- Sync check fail: did you hand-edit `AGENTS.md`? Don't. Edit `CLAUDE.md`, run `scripts/sync-agent-doc.sh`.
- Vitest contract fail: a pinned string was touched. Restore or update the pin in the test only with operator approval.
- Count fail: a .md file was added/removed that the plan did not predict. Investigate which. Do NOT silently update `expected-md-count`.
- Plan-ref fail: a `docs/plans/*.md` reference broke. Fix the reference, not the script.

If any STILL fail after diagnosis: STOP. Report which check, paste failure, do not patch around it.

No commit for this step (verification only).

### Step 11 — Archive this plan

After the worktree merges to main and the doc cleanup is "shipped":

```bash
git mv docs/plans/2026-05-23-doc-cleanup-plan.md docs/plans/archive/
```

Update `docs/plans/archive/README.md` to add the new row.

The archive move does NOT change the .md file count (still 45 — same file, different dir). `pnpm doc:audit` should still pass.

Commit: `docs(plans): archive doc cleanup plan now that work is shipped`

### Step 12 — Open PR

```bash
gh pr create \
  --title "docs: surgical cleanup + doc-hygiene tooling" \
  --body "$(cat <<'EOF'
## Summary

Doc surface (60 → 45 files total, 31 canonical):

- Archive 11 shipped or superseded plans under docs/plans/archive/ (no content rewrite).
- Delete .agents/skills/ third-party skill drop (13 SKILL.md files; zero inbound refs, off-brand taste profiles).
- Delete redirect stubs: docs/DESIGN_SYSTEM.md, docs/RELEASE_LOG.md, scripts/blog-photos/README.md.
- Fold components/uix/README.md into docs/ARCHITECTURE.md UIX Component Library subsection.
- Scrub broken docs/plans/2026-04-07-stable-stack-downgrade.md reference from CLAUDE.md (re-synced to AGENTS.md).
- Update docs/DESIGN_SYSTEM_CHANGELOG.md:181 to point at the archived design-system-95 sprint plan.
- Add docs/plans/archive/README.md (retention policy + index).
- Add docs/bookkeeping/file-map.md (single source of truth for the doc surface).
- Add docs/plans/2026-05-23-archived-plan-followups.md (open backlog stub for 6 items carried out of archived plans).

Doc-hygiene tooling:

- Add scripts/doc-audit.sh + pnpm doc:audit (wraps sync-check + 8 contracts + count guard + plan-ref check).
- Add scripts/check-doc-plan-refs.sh (prevents zombie plan references).
- Add docs/bookkeeping/expected-md-count (45) as the count source of truth.
- Wire pnpm doc:audit into .github/workflows/ci.yml.
- Add CLAUDE.md Gotcha codifying "no hand-written release logs" doctrine.

## Test plan
- [ ] pnpm doc:audit passes (covers sync, 8 contracts, count, plan-refs)
- [ ] pnpm lint + pnpm typecheck pass
- [ ] scripts/check-stack-pins.sh + scripts/check-orphaned-files.sh pass
- [ ] CI shows the new doc-audit step/job green
- [ ] git history shows one commit per logical step (no squash)

Plan: docs/plans/2026-05-23-doc-cleanup-plan.md (moves to archive/ in Step 11 of this branch).

Follow-ups (NOT in this PR):
- Memory hygiene pass via /consolidate-memory in a separate session.
- Optional: /admin/ops live release feed (captured in archived-plan-followups.md backlog).
EOF
)"
```

---

## 8. What stays untouched

- All source code (`app/`, `lib/`, `components/`, `scripts/` source files **other than the 2 new shell scripts in §6 and the package.json scripts entry in §4 Rewrite 5**).
- All tests (`lib/__tests__/`, `e2e/`). No test edits — the 8 pinning contracts must continue to pass as-is.
- All other config (`pnpm-lock.yaml`, `tsconfig.json`, `next.config.mjs`, `tailwind.config*`, `eslint.config.mjs`, `playwright.config*.ts`, lighthouse configs).
- All `~/.claude/`, `~/.Codex/`, `~/.claude/projects/-Users-rey-Desktop-instantmed/`. The execution session must NOT touch user-global config or memory files.
- The canonical docs (no rewrites except the 4 listed in §4: CLAUDE.md scrub + release-log Gotcha, DESIGN_SYSTEM_CHANGELOG.md inbound link, ARCHITECTURE.md UIX subsection expansion).
- All 4 audits under `docs/audits/`.
- The runbook `docs/runbooks/comparative-tagline-complaint.md`.
- Component-tree READMEs that survive: `components/operator/README.md` (drift-pinned), `components/request/README.md` (colocated how-to).
- `scripts/load-tests/README.md` (k6 ops doc).
- `.github/pull_request_template.md`.

**In-scope but small (touched, but doc-hygiene-only):**
- `package.json` `"scripts"` block: one-line addition for `doc:audit`.
- `.github/workflows/ci.yml`: one new step or job invoking `pnpm doc:audit`.
- `scripts/doc-audit.sh`, `scripts/check-doc-plan-refs.sh`: new executable scripts.
- `docs/bookkeeping/expected-md-count`: new single-integer text file.

---

## 9. Verification results — open questions resolved

| Open question during audit | Resolution |
|----------------------------|-----------|
| Does `docs/plans/2026-04-07-stable-stack-downgrade.md` exist? | **No.** Confirmed via `ls`. References at CLAUDE.md:107 and AGENTS.md:107 are dead. Scrub per §4 Rewrite 1. |
| Are any `.agents/skills/` SKILL.md files referenced from CLAUDE.md/AGENTS.md/docs/package.json/scripts? | **No.** Confirmed via `grep -rn "\.agents/"` across all entry points. Delete per §2 Group B. |
| Are `docs/DESIGN_SYSTEM.md` or `docs/RELEASE_LOG.md` referenced anywhere? | **No.** Confirmed via `grep -rn` across all docs and source trees. Delete per §2 Group A. |
| Is `scripts/blog-photos/README.md` referenced? | **No.** Only `scripts/update-blog-images.mjs:5` mentions the *path* `scripts/blog-photos/` in a comment, not the README. Delete the README. |
| Are the 11 plans selected for archive actually shipped / superseded? | **Yes, with high confidence.** 3 self-marked Superseded/Partially-superseded; 8 verified shipped via CLAUDE.md Gotchas + commit log (43063b889, 0ff193726, e6f83b62e, 51b103d32, etc). If the operator wants any of them kept active, raise BEFORE Step 2 in §7. |
| Will the drift contract test pass after these changes? | **Yes.** The contract pins strings in 8 files; none of those files are touched except `CLAUDE.md` (one line scrub) and `docs/ARCHITECTURE.md` (UIX subsection expansion). The pinned strings remain. |
| Will `scripts/sync-agent-doc.sh --check` pass? | **Yes**, as long as Step 7 runs `scripts/sync-agent-doc.sh` after editing CLAUDE.md, regenerating AGENTS.md in lockstep. |
| Are any audits stale? | The 4 audits are historical records. CLAUDE.md:273 explicitly references the 2026-04-21 migration drift audit + 2026-05-03 supabase conversion audit as "current". The 2026-05-11 patient portal post-rebuild audit and `google-ads-audit.md` have no inbound refs but are kept for historical context (single source of truth for past assessments). Do not delete. |
| Is `components/uix/README.md` safe to delete? | **Yes**, after the fold in §3 lands the export list and retirement notice in `docs/ARCHITECTURE.md`. The README itself is not pinned by any test. |
| Should `PRODUCT.md` (55 lines) be folded into `DESIGN.md` (822 lines)? | **No.** Pinned independently by the drift contract (`expect(product).toContain(...)`). The user-facing context vs. design-system law separation is intentional. Re-evaluate in a future pass. |

---

## 10b. Open follow-ups carried out of archived plans

Spot-check during plan-locking turned up open follow-up threads in 2 of the 11 archived plans. Archive them anyway (per operator decision §0 row 1), but capture the open items in a single new stub so they are not lost.

### New file: `docs/plans/2026-05-23-archived-plan-followups.md`

Status: **Active backlog stub, not a sequenced plan.** Operator triages and either picks up, defers, or kills each item.

**Content:**

```markdown
# Open Follow-ups From Archived Plans

> **Status:** Active backlog stub. Captured 2026-05-23 during doc cleanup audit.
> **Provenance:** Items lifted from plans archived on 2026-05-23 that had explicit "deferred" or "ongoing" threads.

## From archive/2026-04-13-lib-restructure-and-script-wiring.md

Originally listed under "What This Does NOT Cover":

- [ ] **Type centralisation** — move scattered types to `/types/`.
- [ ] **Import boundary enforcement** — add ESLint rules to prevent cross-domain imports (e.g. `lib/clinical/` should not import from `lib/marketing/`).
- [ ] **Barrel file additions for `components/`** — consistent `index.ts` exports across domain dirs.
- [ ] **Component-tree README creation for the remaining domain dirs** (admin/, doctor/, patient/, marketing/, etc) — operator/, request/, uix/ already have READMEs (uix folded into ARCHITECTURE.md by the 2026-05-23 cleanup).

## From archive/2026-05-04-health-guides-rehaul.md

System fixes shipped (renderer, TOC, guide-only template, audit gate, GPT visual pipeline). Remaining backlog from "Recommended Execution":

- [ ] **Category-by-category rewrite** across the remaining ~93 guide pages, each with at least two GPT-generated article-specific visuals.
- [ ] **`/blog` vs `/guides` routing cleanup** once page quality is no longer embarrassing.

## From the 2026-05-23 doc cleanup audit

- [ ] **Optional: `/admin/ops` live release feed** — instead of resurrecting `docs/RELEASE_LOG.md`, surface a `system_release` audit row written by the `.github/workflows/post-deploy-smoke.yml` workflow and render the last 20 on `/admin/ops` next to the recovery rows. Operator-visible, no markdown drift, no hand-write. Pick up only if the operator wants live release visibility; otherwise commit messages + GitHub Releases + Sentry release tagging cover this already.

## Triage rule

Each item: pick up, defer (with date), or kill (with one-line reason). Update this file in-place. When all items resolve, archive this stub too.
```

### New file: `docs/plans/2026-05-23-archived-plan-followups.md` location

Lives at `docs/plans/` (active), NOT in `archive/`.

### Update §6 to add this file

Add a row to §6: "New file 3 — `docs/plans/2026-05-23-archived-plan-followups.md`. Content as above. ~30 lines."

### Update §7 execution sequence

Insert a new Step between Step 9 (file-map) and Step 10 (verification):

> **Step 9a — Create the archived-plan follow-ups stub.** Write `docs/plans/2026-05-23-archived-plan-followups.md` per §10b. Commit: `docs(plans): capture open follow-ups from archived plans as active backlog stub`.

### Doc count adjustment

Net surface after execution: 31 canonical + 1 archive index + 12 archived plans + 1 active backlog stub = **45 total tracked .md files**. Still within the spirit of the 20-30 canonical target (the active surface is 31; backlog and archive are accounting, not doctrine).

---

## 11. Post-cleanup memory and slash-command audit

> **Scope:** Read-only audit during the execution session. **The actual memory hygiene pass is a separate post-merge operator action** — see "Post-merge operator action" subsection at the end. Do NOT edit anything under `~/.claude/` in the execution session.

### Post-merge operator action — required, not optional

After this PR merges to `main`, the operator runs `/consolidate-memory` in a **separate** Claude session against `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/`. This is decision row §0 #15.

**Why separate session:**
- The cleanup PR diff stays doc-and-tooling-only. Mixing memory edits into the same review makes it un-reviewable.
- `/consolidate-memory` is a destructive-ish operation on user-owned files; it should run interactively under the operator's eye.
- The cleanup PR can ship and revert independently of memory hygiene.

**Prompt the operator pastes after merge:**

```
Run /consolidate-memory. Focus on files under ~/.claude/projects/-Users-rey-Desktop-instantmed/memory/ that may reference docs deleted, moved, or archived by the 2026-05-23 doc cleanup PR. Specifically check decisions.md, project_legacy_dashboard_css.md, project_patient_portal_audit.md, and MEMORY.md for references to: docs/plans/2026-04-07-stable-stack-downgrade.md (now non-existent), docs/DESIGN_SYSTEM.md / docs/RELEASE_LOG.md (deleted), components/uix/README.md (folded into ARCHITECTURE.md), .agents/skills/ (deleted), or any of the 11 plans now under docs/plans/archive/. Update paths, remove dead references, or mark memory rows as "shipped, see CLAUDE.md Gotchas".
```

### Read-only spot-check during the execution session

### Memory files to spot-check (read-only, report to operator)

Path: `~/.claude/projects/-Users-rey-Desktop-instantmed/memory/`

Files known to reference doc paths or plan slugs that change in this cleanup:

| Memory file | What to verify | If stale, what to recommend |
|-------------|----------------|------------------------------|
| `MEMORY.md` (index) | Has rows for `decisions.md`, `seo-strategy.md`, `feedback_*`, `project_*`, `decision_brand_rehaul_2026_04_29.md`. None of these reference moved/deleted docs by path. Safe. | None. |
| `decisions.md` | Likely references the (now non-existent) `docs/plans/2026-04-07-stable-stack-downgrade.md`. Search for the slug. | Suggest operator runs `/consolidate-memory` to update references. |
| `project_legacy_dashboard_css.md` | References `app/dashboard-styles.css` and Phase 1 cleanup. The dashboard remaster shipped; this memory may be stale. | Suggest operator re-reads and updates or deletes. |
| `project_patient_portal_audit.md` | References the 2026-04-29 audit + 3-phase rebuild. The rebuild shipped; the 2026-05-11 post-rebuild audit (kept in `docs/audits/`) is the current reference. | Suggest operator marks the memory as "rebuild shipped, see docs/audits/2026-05-11-patient-portal-post-rebuild-audit.md". |
| `roadmap.md`, `seo-strategy.md`, `patterns.md` | Likely OK; not path-pinned to any moved doc. | None unless grep finds a stale slug. |

**Run command** (operator side, after merge):

```bash
grep -rln "2026-04-07-stable-stack-downgrade\|2026-04-20-design-system-95-sprint\|2026-05-04-health-guides-rehaul\|2026-05-20-admin-ops\|2026-05-20-staff-cockpit\|docs/DESIGN_SYSTEM\.md\|docs/RELEASE_LOG\.md\|components/uix/README\|\.agents/skills" ~/.claude/projects/-Users-rey-Desktop-instantmed/memory/
```

Any hit → operator decides per-file whether to update the path (e.g. add `archive/`) or remove the line. The cleanup execution session does NOT touch these files.

### Slash-command and skill audit

The operator's `~/.claude/` setup carries many skills (impeccable, emil-design-eng, brand-voice, etc per the session-start skill listing). None of them index InstantMed doc paths directly that I am aware of. Recommended spot-checks:

```bash
grep -rln "docs/plans/2026-04-07\|docs/DESIGN_SYSTEM\.md\|docs/RELEASE_LOG\.md\|components/uix/README\|\.agents/skills" ~/.claude/skills/ 2>/dev/null
grep -rln "docs/plans/2026-04-07\|docs/DESIGN_SYSTEM\.md\|docs/RELEASE_LOG\.md\|components/uix/README\|\.agents/skills" ~/.claude/commands/ 2>/dev/null
```

If hits appear: report to operator, do NOT edit. Slash-commands and global skills are operator-owned config.

### Local project `.claude/` directory

Path: `/Users/rey/Desktop/instantmed/.claude/`
Contents: `launch.json`, `scheduled_tasks.lock`, `settings.local.json`, `worktrees/`. None of these reference docs. Untouched.

---

## Appendix — full inventory at audit time

60 .md files audited. Inventory grouped by status:

**Canonical (29, all kept):** CLAUDE.md, AGENTS.md, PRODUCT.md, DESIGN.md, docs/AI_ONBOARDING.md, docs/ARCHITECTURE.md, docs/BRAND.md, docs/VOICE.md, docs/PHOTOGRAPHY_BRIEF.md, docs/PRIMITIVES.md, docs/CLINICAL.md, docs/SECURITY.md, docs/OPERATIONS.md, docs/TESTING.md, docs/BUSINESS_PLAN.md, docs/REVENUE_MODEL.md, docs/ADVERTISING_COMPLIANCE.md, docs/SEO_CONTENT_POLICY.md, docs/PRODUCTION_RELEASE_CHECKLIST.md, docs/SERVICE_LAUNCH_CHECKLISTS.md, docs/DESIGN_SYSTEM_CHANGELOG.md, docs/runbooks/comparative-tagline-complaint.md, 4 audits, components/operator/README.md, components/request/README.md, scripts/load-tests/README.md, .github/pull_request_template.md.

**To-archive (11):** the 11 plans in §5.

**To-delete (16):** 13 SKILL.md files under .agents/skills/ + docs/DESIGN_SYSTEM.md + docs/RELEASE_LOG.md + scripts/blog-photos/README.md.

**To-fold (1):** components/uix/README.md → docs/ARCHITECTURE.md.

**New .md files (4):** this plan file (will move to archive/ in Step 11), docs/plans/archive/README.md, docs/bookkeeping/file-map.md, docs/plans/2026-05-23-archived-plan-followups.md (active backlog stub per §10b).

**New non-.md files (5, hygiene tooling):** scripts/doc-audit.sh, scripts/check-doc-plan-refs.sh, docs/bookkeeping/expected-md-count.

**Touched config (2):** package.json (one-line scripts entry for `doc:audit`), .github/workflows/ci.yml (one step or job invoking `pnpm doc:audit`).

**Touched canonical docs (3):** CLAUDE.md (Rewrites 1 + 4, then re-sync to AGENTS.md), docs/DESIGN_SYSTEM_CHANGELOG.md (Rewrite 2, one path), docs/ARCHITECTURE.md (Rewrite 3, UIX subsection expansion via fold).

Net .md surface after execution: 31 canonical + 1 archive index + 12 archived plans + 1 active backlog stub = **45 total tracked .md files**. Down from 60. Within target (the active surface is 31; backlog and archive are accounting, not doctrine).

### Commit count

13 commits in the cleanup branch:

| # | Step | Commit subject |
|---|------|----------------|
| 1 | 1   | `docs: scaffold plans/archive and bookkeeping subdirs` |
| 2 | 2   | `docs(plans): archive 11 shipped or superseded plans` |
| 3 | 3   | `docs(design-system-changelog): point at archived design-system-95 sprint plan` |
| 4 | 4   | `chore: delete unused .agents/skills third-party skill drop` |
| 5 | 5   | `docs: delete abandoned DESIGN_SYSTEM pointer, RELEASE_LOG, blog-photos placeholder` |
| 6 | 6   | `docs(architecture): fold components/uix README into Component Patterns, delete source` |
| 7 | 7   | `docs(claude): drop broken 2026-04-07-stable-stack-downgrade plan reference` |
| 8 | 8   | `docs(plans/archive): document retention policy and index` |
| 9 | 9   | `docs(bookkeeping): introduce canonical file map` |
| 10 | 9a  | `docs(plans): capture open follow-ups from archived plans as active backlog stub` |
| 11 | 9b  | `chore(docs): add check-doc-plan-refs.sh to fail on zombie plan references` |
| 12 | 9c  | `chore(docs): add pnpm doc:audit (sync + contracts + count + plan-refs)` |
| 13 | 9d  | `ci(docs): run pnpm doc:audit on every CI build` |
| 14 | 9e  | `docs(claude): codify no-hand-written-release-logs doctrine` |
| 15 | 11  | `docs(plans): archive doc cleanup plan now that work is shipped` |

(Step 10 is verification-only, no commit. Step 0 is worktree setup, no commit.)

15 commits total. No squash.

---

**End of plan.** Locked at 2026-05-23.

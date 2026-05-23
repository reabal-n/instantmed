# Open Follow-ups From Archived Plans

> **Status:** Active backlog stub. Captured 2026-05-23 during doc cleanup audit.
> **Provenance:** Items lifted from plans archived on 2026-05-23 that had explicit "deferred" or "ongoing" threads, plus one item surfaced by the cleanup audit itself.

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

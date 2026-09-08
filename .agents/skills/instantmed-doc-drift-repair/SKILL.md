---
name: instantmed-doc-drift-repair
description: 'InstantMed documentation repair: reconcile canonical docs, generated agent instructions, wiki and implementation evidence without creating competing sources.'
metadata:
  owner: Rey / instantmed
  scope: project:instantmed
  version: 1.0.0
---

# InstantMed Doc Drift Repair

Use this when docs and implementation disagree, or when code changes require doc updates. The goal is to repair the source of truth without adding another stale document.

## Load Order

Read:

1. `AGENTS.md`, then `wiki/index.md`
2. The canonical doc named by `AGENTS.md` or `wiki/index.md` for the changed domain
3. The implementation files that should prove the current truth
4. `scripts/doc-audit.sh` when the drift is audit-related
5. Existing doc-pinning tests when the drift should become a contract

## Rules

- Do not edit `AGENTS.md` by hand. Edit `CLAUDE.md`, then run `scripts/sync-agent-doc.sh`.
- Do not create a new doc when an existing canonical doc owns the fact.
- Do not infer product, clinical, legal, advertising, or pricing policy from code alone; check the canonical docs and ask if policy changed.
- If adding/removing markdown files, update `docs/bookkeeping/expected-md-count` and `docs/bookkeeping/file-map.md`.
- If a drift pattern can recur, prefer a small contract test over a memory note.
- Keep docs concise. Delete stale references rather than preserving both old and new truth.

## Repair Path

1. Identify the canonical owner: `CLAUDE.md`, `docs/CLINICAL.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/OPERATIONS.md`, `docs/TESTING.md`, `docs/BRAND.md`, `docs/VOICE.md`, `docs/ADVERTISING_COMPLIANCE.md`, `docs/SEO_CONTENT_POLICY.md`, `docs/ROADMAP.md`, or `wiki/*`.
2. Prove current truth from code, config, migrations, tests, or committed docs.
3. Patch the canonical doc and only necessary mirrors.
4. Add or update a doc-pinning test when the drift is important and mechanically checkable.
5. Run `pnpm doc:audit` for docs-only work; run focused tests too when code changed.
6. Summarize exactly which source now owns the fact.

## Output Shape

Report:

- Drift found.
- Source of current truth.
- Docs changed.
- Guard added or why no guard was useful.
- Verification run.

## Scope and ownership

This workflow applies only to instantmed and its verified checkouts/worktrees. Confirm the project from its operating docs and Git root before applying it. Project doctrine owns product, brand, privacy and release requirements; shared skills supply techniques only. Resolve commands and project paths from the active checkout, not a fixed machine path.

## Verification

Verify the requested result against the authoritative project files and relevant checks. Report evidence, skipped checks and remaining uncertainty; do not infer owner approval.

---
name: instantmed-doc-drift-repair
description: InstantMed documentation drift repair workflow. Use when a task in /Users/rey/Developer/instantmed mentions stale docs, docs out of sync, doc:audit, AGENTS.md, CLAUDE.md, wiki, README, architecture docs, clinical docs, operations docs, testing docs, pricing docs, model/version drift, generated agent docs, documentation cleanup, canonical source of truth, or updating docs after code changes.
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

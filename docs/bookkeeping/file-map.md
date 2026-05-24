# Doc File Map

> **Last updated:** 2026-05-23 (post-cleanup).
> Single source of truth for the full canonical doc surface. A fresh contributor reads this file and knows the doc tree without grepping.
>
> **Owner:** Operator. Update on every doc add, move, or delete. Bump the timestamp.

---

## Root laws (4)

| File | Owner | Pinned by |
|------|-------|-----------|
| [CLAUDE.md](../../CLAUDE.md) | Operator | `lib/__tests__/project-docs-drift-contract.test.ts`; `scripts/sync-agent-doc.sh` |
| [AGENTS.md](../../AGENTS.md) | Generated from CLAUDE.md | Same. Never hand-edit. Run `scripts/sync-agent-doc.sh` after CLAUDE.md changes. |
| [PRODUCT.md](../../PRODUCT.md) | Operator | `project-docs-drift-contract` |
| [DESIGN.md](../../DESIGN.md) | Operator | `project-docs-drift-contract`; `marketing-copy-contract` |

## docs/ — 19 canonical satellites

| File | Purpose | Pinned by |
|------|---------|-----------|
| [docs/AI_ONBOARDING.md](../AI_ONBOARDING.md) | AI assistant quick start | `project-docs-drift-contract` |
| [docs/ARCHITECTURE.md](../ARCHITECTURE.md) | System architecture, data flows, integrations | `project-docs-drift-contract`; `code-clean-retirement-contract` |
| [docs/BRAND.md](../BRAND.md) | Brand spine, taglines, signature devices | `marketing-copy-contract` |
| [docs/VOICE.md](../VOICE.md) | Voice rules, banned phrases, healthcare compliance copy | Code header in `lib/marketing/voice.ts` |
| [docs/PHOTOGRAPHY_BRIEF.md](../PHOTOGRAPHY_BRIEF.md) | Photography brief, 8-shot launch list, GPT prompt scaffold | BRAND.md reference |
| [docs/PRIMITIVES.md](../PRIMITIVES.md) | Marketing primitives registry (social proof, badges, pricing, FAQ, wait times) | `code-clean-retirement-contract` |
| [docs/CLINICAL.md](../CLINICAL.md) | Clinical boundaries, prescribing rules, AI limits, consent, APP privacy | Code headers across `lib/clinical/`, `lib/ai/` |
| [docs/SECURITY.md](../SECURITY.md) | PHI encryption, RLS, rate limiting, audit logging, kill switches | Code header in `lib/config/kill-switches.ts` |
| [docs/OPERATIONS.md](../OPERATIONS.md) | Incident response, cron jobs, debugging, env vars, rollback runbook | `cron-surface-contract`; `code-clean-retirement-contract`; `password-reset-flow-contract` |
| [docs/TESTING.md](../TESTING.md) | Unit + E2E test conventions, auth bypass, coverage rules | `project-docs-drift-contract` |
| [docs/BUSINESS_PLAN.md](../BUSINESS_PLAN.md) | Current business strategy + non-negotiable business decisions | `service-launch-checklists-contract`; `advertising-compliance-guard` |
| [docs/REVENUE_MODEL.md](../REVENUE_MODEL.md) | $1M one-off revenue model, service mix, unit economics | `code-clean-retirement-contract` |
| [docs/ADVERTISING_COMPLIANCE.md](../ADVERTISING_COMPLIANCE.md) | Google/AHPRA/TGA paid acquisition rules | `advertising-compliance-guard` |
| [docs/SEO_CONTENT_POLICY.md](../SEO_CONTENT_POLICY.md) | Organic educational content rules, guide-only article rules | `advertising-compliance-guard` |
| [docs/PRODUCTION_RELEASE_CHECKLIST.md](../PRODUCTION_RELEASE_CHECKLIST.md) | Pre-promotion gates (quality + dashboard + clinical + payments + ops) | `release-check-contract` |
| [docs/SERVICE_LAUNCH_CHECKLISTS.md](../SERVICE_LAUNCH_CHECKLISTS.md) | Repeat-script / ED / hair-loss production launch gates | `service-launch-checklists-contract` |
| [docs/DESIGN_SYSTEM_CHANGELOG.md](../DESIGN_SYSTEM_CHANGELOG.md) | Versioned design-system changelog | `release-check-contract` |
| [docs/ROADMAP.md](../ROADMAP.md) | Internal product roadmap: operating phase, last-90-days shipped, active priorities, expansion gates | `project-docs-drift-contract` (phase label + Last refreshed stamp + backlog provenance link) |
| [docs/DOCTOR_ONBOARDING.md](../DOCTOR_ONBOARDING.md) | Technical onboarding for new clinicians: capability flags, AHPRA, Parchment linking, identity gates, service-line verification | `project-docs-drift-contract` (7 capability flag keys + AHPRA regex + Parchment env-var floor) |
| [docs/PHI_KEY_ROTATION_DESIGN.md](../PHI_KEY_ROTATION_DESIGN.md) | DESIGN ONLY (2026-05-24). Three-phase PHI master-key rotation: dual-key reads + operator-paced key swap + optional re-encryption batch. Not yet implemented; operator approval required per phase. | none yet (design doc; will need `phi-key-rotation-contract` when Phase 1 ships) |

## docs/runbooks/ — 1

| File | Purpose |
|------|---------|
| [docs/runbooks/comparative-tagline-complaint.md](../runbooks/comparative-tagline-complaint.md) | AHPRA/TGA/Medical Board/Google complaint runbook for the "Faster than your GP." tagline |

## docs/audits/ — 4 (historical records)

| File | Purpose |
|------|---------|
| [docs/audits/2026-04-21-migration-drift-audit.md](../audits/2026-04-21-migration-drift-audit.md) | Migration drift audit; CLAUDE.md references it for current migration history context |
| [docs/audits/2026-05-03-supabase-conversion-audit.md](../audits/2026-05-03-supabase-conversion-audit.md) | Current migration/conversion audit; CLAUDE.md references it |
| [docs/audits/2026-05-11-patient-portal-post-rebuild-audit.md](../audits/2026-05-11-patient-portal-post-rebuild-audit.md) | Patient portal post-rebuild audit (v2.0.2) |
| [docs/audits/google-ads-audit.md](../audits/google-ads-audit.md) | Google Ads audit (historical) |

## docs/plans/ — active

| File | Purpose |
|------|---------|
| [docs/plans/2026-05-23-archived-plan-followups.md](../plans/2026-05-23-archived-plan-followups.md) | Active backlog stub: 6 open follow-ups carried out of archived plans (lib restructure deferrals + health guides remaining rewrite + /admin/ops release feed idea) |

The cleanup plan that produced this state lives in archive: [docs/plans/archive/2026-05-23-doc-cleanup-plan.md](../plans/archive/2026-05-23-doc-cleanup-plan.md).

## docs/plans/archive/ — completed/superseded plans (90-day retention)

See [docs/plans/archive/README.md](../plans/archive/README.md) for the retention policy + index of archived plans.

## docs/bookkeeping/ — 2

| File | Purpose |
|------|---------|
| [docs/bookkeeping/file-map.md](file-map.md) | This file |
| docs/bookkeeping/expected-md-count | Single integer; source of truth for the .md file count guard run by `pnpm doc:audit` |

## components/*/README.md — 2 colocated docs

| File | Purpose | Pinned by |
|------|---------|-----------|
| [components/operator/README.md](../../components/operator/README.md) | Unified staff cockpit primitives doctrine | `project-docs-drift-contract` |
| [components/request/README.md](../../components/request/README.md) | Unified intake flow how-to (orchestrator + step registry + Zustand store) | Colocated with code; no test pin |

`components/uix/README.md` was folded into `docs/ARCHITECTURE.md` UIX Component Library subsection on 2026-05-23 and deleted.

## scripts/*/README.md — 1

| File | Purpose |
|------|---------|
| [scripts/load-tests/README.md](../../scripts/load-tests/README.md) | k6 load test operational doc |

`scripts/blog-photos/README.md` was deleted on 2026-05-23 (one-sentence placeholder; the script that uses the dir documents the path inline).

## .github/ — 1

| File | Purpose |
|------|---------|
| [.github/pull_request_template.md](../../.github/pull_request_template.md) | PR template: light/dark/reduced-motion checklist |

---

## How to add a new doc

1. Pick the right home from the categories above. Default: `docs/` for a new canonical satellite.
2. Update this file with a new row in the matching table.
3. Bump `docs/bookkeeping/expected-md-count` by 1 (or by N if adding multiple).
4. If the new doc should be drift-protected, add a pin assertion in `lib/__tests__/project-docs-drift-contract.test.ts` referencing strings that must remain stable.
5. If the new doc should appear in CLAUDE.md's satellite-doc table (most should), add a row there too, then run `scripts/sync-agent-doc.sh` to project to AGENTS.md.
6. Run `pnpm doc:audit` to confirm the count guard passes.

## How to remove a doc

1. Confirm zero inbound references via `grep -rn "<old/path>" docs/ CLAUDE.md AGENTS.md PRODUCT.md DESIGN.md lib/ app/ components/ scripts/`.
2. `git rm <path>`.
3. Update this file (remove the row).
4. Update `docs/bookkeeping/expected-md-count` (subtract 1).
5. If the doc was drift-pinned, remove its `it(...)` block from `project-docs-drift-contract.test.ts`.
6. Run `pnpm doc:audit`.

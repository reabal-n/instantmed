# Doc File Map

> **Last updated:** 2026-07-10.
> Single source of truth for the full canonical doc surface. A fresh contributor reads this file and knows the doc tree without grepping.
>
> **Doc-surface count:** 118 `.md` files per `scripts/doc-audit.sh` (which counts the root assistant docs, `.agent-skills/**/SKILL.md`, `wiki/*.md`, `docs/plans/**` working + archived plans, `docs/superpowers/plans/**`, and `docs/reviews/INDEX.md` alongside the canonical satellites below). Reconciled 2026-06-16: 97 -> 103 after adding the repo-owned InstantMed workflow skills; 103 -> 110 on 2026-06-26 after adding the 7 prescribing-rebuild + med-cert implementation plans; 110 -> 112 on 2026-07-01 after adding the root context glossary and first ADR for Google Ads retained-value bidding; reconciled to 115 on 2026-07-08 after excluding generated verification artifacts from `scripts/doc-audit.sh` and adding the GEO citation execution record; reconciled to 116 on 2026-07-09 after adding the intake drop-off final plan; reconciled to 118 on 2026-07-10 after adding the audit-remediation implementation program and the comparison-surface submission kit.
>
> **Owner:** Operator. Update on every doc add, move, or delete. Bump the timestamp.

---

## Root laws (5)

| File | Owner | Pinned by |
|------|-------|-----------|
| [CLAUDE.md](../../CLAUDE.md) | Operator | `lib/__tests__/project-docs-drift-contract.test.ts`; `scripts/sync-agent-doc.sh` |
| [AGENTS.md](../../AGENTS.md) | Generated from CLAUDE.md | Same. Never hand-edit. Run `scripts/sync-agent-doc.sh` after CLAUDE.md changes. |
| [CONTEXT.md](../../CONTEXT.md) | Operator | `google-ads-attribution-contract` |
| [PRODUCT.md](../../PRODUCT.md) | Operator | `project-docs-drift-contract` |
| [DESIGN.md](../../DESIGN.md) | Operator | `project-docs-drift-contract`; `marketing-copy-contract` |

## .agent-skills/ — 6 workflow skills

These are the canonical InstantMed-specific agent workflows. Run `scripts/sync-agent-skills.sh` after edits to refresh local Claude and Codex discovery folders.

| File | Purpose | Pinned by |
|------|---------|-----------|
| [.agent-skills/instantmed-checkout-payment-review/SKILL.md](../../.agent-skills/instantmed-checkout-payment-review/SKILL.md) | Checkout, Stripe, refund, webhook, and payment-state safety review | `project-docs-drift-contract` |
| [.agent-skills/instantmed-clinical-safety-review/SKILL.md](../../.agent-skills/instantmed-clinical-safety-review/SKILL.md) | Clinical policy, intake safety, service launch, prescribing, and doctor-review safety review | `project-docs-drift-contract` |
| [.agent-skills/instantmed-doc-drift-repair/SKILL.md](../../.agent-skills/instantmed-doc-drift-repair/SKILL.md) | Documentation drift repair and source-of-truth routing | `project-docs-drift-contract` |
| [.agent-skills/instantmed-marketing-compliance-review/SKILL.md](../../.agent-skills/instantmed-marketing-compliance-review/SKILL.md) | Regulated marketing, SEO, ads, claims, and public-copy compliance review | `project-docs-drift-contract` |
| [.agent-skills/instantmed-production-incident-review/SKILL.md](../../.agent-skills/instantmed-production-incident-review/SKILL.md) | Production incident, outage, stuck-intake, integration, and recovery review | `project-docs-drift-contract` |
| [.agent-skills/instantmed-ui-browser-verification/SKILL.md](../../.agent-skills/instantmed-ui-browser-verification/SKILL.md) | UI polish, patient/staff flow verification, browser proof, and visual QA | `project-docs-drift-contract` |

## wiki/ — 8 context-navigation docs

| File | Purpose |
|------|---------|
| [wiki/index.md](../../wiki/index.md) | First navigation layer after `CLAUDE.md`; routes future AI sessions to the smallest useful context set |
| [wiki/context-map.md](../../wiki/context-map.md) | Domain and data-flow map for intake, checkout, staff, patient, prescribing, analytics, SEO, and ops |
| [wiki/file-directory.md](../../wiki/file-directory.md) | Important file/folder directory with purpose, when to read, and priority |
| [wiki/architecture.md](../../wiki/architecture.md) | Compact current app structure and live inventory snapshot |
| [wiki/code-hygiene-audit.md](../../wiki/code-hygiene-audit.md) | Read-only hygiene findings, guardrail status, and risk-ranked hotspots |
| [wiki/refactor-plan.md](../../wiki/refactor-plan.md) | Deferred small-step refactor plan for future code hygiene work |
| [wiki/decision-log.md](../../wiki/decision-log.md) | Decisions made while creating and wiring the wiki |
| [wiki/open-questions.md](../../wiki/open-questions.md) | Product, clinical, legal, and architecture questions not safe to guess |

## docs/ — 20 canonical satellites

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
| [docs/ARTICLE_TEMPLATE.md](../ARTICLE_TEMPLATE.md) | Health-guide authoring standard: archetypes, component caps, visual system, per-page workflow, indexing gate | none yet (PR 1 adds audit enforcement) |
| [docs/PRODUCTION_RELEASE_CHECKLIST.md](../PRODUCTION_RELEASE_CHECKLIST.md) | Pre-promotion gates (quality + dashboard + clinical + payments + ops) | `release-check-contract` |
| [docs/SERVICE_LAUNCH_CHECKLISTS.md](../SERVICE_LAUNCH_CHECKLISTS.md) | Repeat-script / ED / hair-loss / women's-health production launch gates | `service-launch-checklists-contract` |
| [docs/DESIGN_SYSTEM_CHANGELOG.md](../DESIGN_SYSTEM_CHANGELOG.md) | Versioned design-system changelog | `release-check-contract` |
| [docs/ROADMAP.md](../ROADMAP.md) | Internal product roadmap: operating phase, last-90-days shipped, active priorities, expansion gates | `project-docs-drift-contract` (phase label + Last refreshed stamp + backlog provenance link) |
| [docs/DOCTOR_ONBOARDING.md](../DOCTOR_ONBOARDING.md) | Technical onboarding for new clinicians: capability flags, AHPRA, Parchment linking, identity gates, service-line verification | `project-docs-drift-contract` (7 capability flag keys + AHPRA regex + Parchment env-var floor) |
| [docs/PHI_KEY_ROTATION_DESIGN.md](../PHI_KEY_ROTATION_DESIGN.md) | DESIGN ONLY (2026-05-24). Three-phase PHI master-key rotation: dual-key reads + operator-paced key swap + optional re-encryption batch. Not yet implemented; operator approval required per phase. | none yet (design doc; will need `phi-key-rotation-contract` when Phase 1 ships) |

## docs/runbooks/ — 3

| File | Purpose |
|------|---------|
| [docs/runbooks/comparative-tagline-complaint.md](../runbooks/comparative-tagline-complaint.md) | AHPRA/TGA/Medical Board/Google complaint runbook for the "Faster than your GP." tagline |
| [docs/runbooks/BREAK_GLASS.md](../runbooks/BREAK_GLASS.md) | Solo-operator continuity: account inventory + sealed-secret location register (pointers, never values) + recovery procedure |
| [docs/runbooks/NHSD_REGISTRATION.md](../runbooks/NHSD_REGISTRATION.md) | Paste-ready field-values sheet for the National Health Services Directory listing (GEO citation surface) |

## docs/adr/ — 1 decision record

| File | Purpose | Pinned by |
|------|---------|-----------|
| [docs/adr/0001-google-ads-net-retained-purchase-value.md](../adr/0001-google-ads-net-retained-purchase-value.md) | Decision record for Google Ads optimizing against retained purchase value, not gross value or micro-conversions | `google-ads-attribution-contract` |

## docs/audits/ — 23 (historical + growth records)

| File | Purpose |
|------|---------|
| [docs/audits/2026-04-21-migration-drift-audit.md](../audits/2026-04-21-migration-drift-audit.md) | Migration drift audit; CLAUDE.md references it for current migration history context |
| [docs/audits/2026-05-03-supabase-conversion-audit.md](../audits/2026-05-03-supabase-conversion-audit.md) | Current migration/conversion audit; CLAUDE.md references it |
| [docs/audits/2026-05-11-patient-portal-post-rebuild-audit.md](../audits/2026-05-11-patient-portal-post-rebuild-audit.md) | Patient portal post-rebuild audit (v2.0.2) |
| [docs/audits/2026-06-02-comprehensive-platform-audit.md](../audits/2026-06-02-comprehensive-platform-audit.md) | Comprehensive platform audit snapshot |
| [docs/audits/2026-06-03-3llm-brain-review.md](../audits/2026-06-03-3llm-brain-review.md) | Three-model review record |
| [docs/audits/2026-06-06-authority-distribution-execution.md](../audits/2026-06-06-authority-distribution-execution.md) | Authority resource distribution execution record |
| [docs/audits/2026-06-03-gsc-seo-content-audit.md](../audits/2026-06-03-gsc-seo-content-audit.md) | Google Search Console / SEO content audit |
| [docs/audits/2026-06-04-3llm-educational-content-review.md](../audits/2026-06-04-3llm-educational-content-review.md) | Educational content review record |
| [docs/audits/2026-06-04-au-backlink-plan.md](../audits/2026-06-04-au-backlink-plan.md) | Australian backlink plan |
| [docs/audits/2026-06-04-citation-kit.md](../audits/2026-06-04-citation-kit.md) | Citation outreach kit |
| [docs/audits/2026-06-04-content-specs-batch-1.md](../audits/2026-06-04-content-specs-batch-1.md) | Batch 1 content specifications |
| [docs/audits/2026-06-04-data-asset-spec.md](../audits/2026-06-04-data-asset-spec.md) | Data asset specification |
| [docs/audits/2026-06-04-reactive-pr-kit.md](../audits/2026-06-04-reactive-pr-kit.md) | Reactive PR kit |
| [docs/audits/2026-06-04-session-handoff.md](../audits/2026-06-04-session-handoff.md) | Session handoff notes |
| [docs/audits/2026-06-05-profitability-3llm-audit.md](../audits/2026-06-05-profitability-3llm-audit.md) | Three-model profitability audit and paid-restart gate record |
| [docs/audits/google-ads-audit.md](../audits/google-ads-audit.md) | Google Ads audit (historical) |
| [docs/audits/2026-06-07-conversion-gaps.md](../audits/2026-06-07-conversion-gaps.md) | Conversion gaps audit record 2026-06-07 |
| [docs/audits/2026-06-07-platform-audit.md](../audits/2026-06-07-platform-audit.md) | Comprehensive platform audit 2026-06-07 |
| [docs/audits/2026-06-08-scale-reaudit.md](../audits/2026-06-08-scale-reaudit.md) | 11-lens scale re-audit 2026-06-08; shipped Bucket A; Bucket B greenlit |
| [docs/audits/2026-06-10-comprehensive-audit.md](../audits/2026-06-10-comprehensive-audit.md) | 44-agent platform + business audit 2026-06-10; P0 anon PHI leak fix, competitor/regulatory/channel research, staged scaling plan |
| [docs/audits/2026-06-11-hygiene-business-review.md](../audits/2026-06-11-hygiene-business-review.md) | 12-agent hygiene + business review 2026-06-11; Express-fee P0, GEO FAQ-HTML blocker, test gaps, resilience, women's-health skeleton, prioritized backlog |
| [docs/audits/2026-07-08-geo-citation-execution.md](../audits/2026-07-08-geo-citation-execution.md) | GEO citation execution record: NHSD listing verification, drift found, profile copy, and comparison outreach draft |
| [docs/audits/2026-07-09-comparison-surface-submission-kit.md](../audits/2026-07-09-comparison-surface-submission-kit.md) | Submission-ready comparison-surface kit for MediCompare and Finder: channels, assets, dated fact sheet, outreach drafts, and marketing-compliance review |

## docs/plans/ — active

| File | Purpose |
|------|---------|
| [docs/plans/2026-03-25-blood-test-referrals.md](../plans/2026-03-25-blood-test-referrals.md) | Active root copy of blood-test referrals plan |
| [docs/plans/2026-04-06-revenue-engagement-design.md](../plans/2026-04-06-revenue-engagement-design.md) | Active root copy of revenue engagement design |
| [docs/plans/2026-04-06-revenue-engagement-plan.md](../plans/2026-04-06-revenue-engagement-plan.md) | Active root copy of revenue engagement plan |
| [docs/plans/2026-04-13-god-component-decomposition.md](../plans/2026-04-13-god-component-decomposition.md) | Active root copy of god-component decomposition plan |
| [docs/plans/2026-04-13-lib-restructure-and-script-wiring.md](../plans/2026-04-13-lib-restructure-and-script-wiring.md) | Active root copy of lib restructure and script-wiring plan |
| [docs/plans/2026-04-20-design-system-95-sprint.md](../plans/2026-04-20-design-system-95-sprint.md) | Active root copy of design-system sprint plan |
| [docs/plans/2026-05-04-health-guides-rehaul.md](../plans/2026-05-04-health-guides-rehaul.md) | Active root copy of health-guides rehaul plan |
| [docs/plans/2026-05-20-admin-ops-cockpit-reshape-design.md](../plans/2026-05-20-admin-ops-cockpit-reshape-design.md) | Active root copy of admin ops cockpit reshape design |
| [docs/plans/2026-05-20-admin-ops-cockpit-reshape-plan.md](../plans/2026-05-20-admin-ops-cockpit-reshape-plan.md) | Active root copy of admin ops cockpit reshape plan |
| [docs/plans/2026-05-20-staff-cockpit-overhaul-design.md](../plans/2026-05-20-staff-cockpit-overhaul-design.md) | Active root copy of staff cockpit overhaul design |
| [docs/plans/2026-05-20-staff-cockpit-overhaul-plan.md](../plans/2026-05-20-staff-cockpit-overhaul-plan.md) | Active root copy of staff cockpit overhaul plan |
| [docs/plans/2026-05-23-archived-plan-followups.md](../plans/2026-05-23-archived-plan-followups.md) | Active backlog stub: 6 open follow-ups carried out of archived plans (lib restructure deferrals + health guides remaining rewrite + /admin/ops release feed idea) |
| [docs/plans/2026-05-23-doc-cleanup-plan.md](../plans/2026-05-23-doc-cleanup-plan.md) | Active root copy of doc cleanup plan |
| [docs/plans/2026-05-23-doc-content-audit-plan.md](../plans/2026-05-23-doc-content-audit-plan.md) | Active root copy of doc content audit plan |
| [docs/plans/2026-05-26-minimal-slide-modal-design.md](../plans/2026-05-26-minimal-slide-modal-design.md) | Design doc for the 2026-05-26 cockpit cleanup bundle (2-day auto-approve widening, single-column slide modal, ED prescription preset). |
| [docs/plans/2026-05-26-minimal-slide-modal-plan.md](../plans/2026-05-26-minimal-slide-modal-plan.md) | 8-task TDD implementation plan companion to the 2026-05-26 design doc. |
| [docs/plans/2026-06-10-organic-geo-beat-nextclinic-plan.md](../plans/2026-06-10-organic-geo-beat-nextclinic-plan.md) | 90-day organic + GEO/LLM-citation growth plan (beat-NextClinic teardown, citation-layer sequence, verify-loop, ads-resume gate). Awaiting operator approval. |
| [docs/plans/2026-06-10-content-mimic-map.md](../plans/2026-06-10-content-mimic-map.md) | NextClinic→InstantMed content mimic map: deepen-and-reindex / write-new (ED+hair) / net-new-elevate (employer-verify, one-off-vs-subscription, cost) / skip / park buckets + metered sequence. Companion to the GEO plan. Awaiting operator approval. |
| [docs/plans/2026-07-09-intake-dropoff-final-plan.md](../plans/2026-07-09-intake-dropoff-final-plan.md) | Reconciled intake drop-off reduction plan: PostHog-backed P0/P1/P2 sequence for med-cert, mobile CTA, validation instrumentation, ED age gate, symptoms, review, patient-details, and repeat-Rx work. Awaiting build green-light. |

Some active root plan files also have archived copies. Keep this mapped until the plan-retention decision is reconciled.

## docs/superpowers/plans/ — 10

| File | Purpose |
|------|---------|
| [docs/superpowers/plans/2026-06-06-customer-growth-phased-plan.md](../superpowers/plans/2026-06-06-customer-growth-phased-plan.md) | Phased customer-growth execution plan covering recovery, paid ads, and organic/LLM authority work |
| [docs/superpowers/plans/2026-06-26-01-shared-addressfinder-primitive.md](../superpowers/plans/2026-06-26-01-shared-addressfinder-primitive.md) | Prescribing rebuild 01: Addressfinder-first shared address primitive — manual-entry escape, provider-neutral labels (QOL + consolidation; Google fallback kept) |
| [docs/superpowers/plans/2026-06-26-02-prescribing-identity-profile.md](../superpowers/plans/2026-06-26-02-prescribing-identity-profile.md) | Prescribing rebuild 02: canonical patient-profile prescribing identity — split names, Medicare-or-IHI, focused identity editor |
| [docs/superpowers/plans/2026-06-26-03-prescribing-intake-flow.md](../superpowers/plans/2026-06-26-03-prescribing-intake-flow.md) | Prescribing rebuild 03: one shared prescribing-identity intake step across all prescribing/specialty services |
| [docs/superpowers/plans/2026-06-26-04-prescribing-packet.md](../superpowers/plans/2026-06-26-04-prescribing-packet.md) | Prescribing rebuild 04: typed PrescribingPacket domain model across review, queue, timeline, and Parchment handoff |
| [docs/superpowers/plans/2026-06-26-05-parchment-sync-lifecycle.md](../superpowers/plans/2026-06-26-05-parchment-sync-lifecycle.md) | Prescribing rebuild 05: Parchment preflight/fingerprint sync gating; separate prescribe from request completion |
| [docs/superpowers/plans/2026-06-26-06-doctor-review-ui-simplification.md](../superpowers/plans/2026-06-26-06-doctor-review-ui-simplification.md) | Prescribing rebuild 06: doctor review UI simplification — one packet, exact blockers, identity/Parchment readiness |
| [docs/superpowers/plans/2026-06-26-07-med-cert-wording.md](../superpowers/plans/2026-06-26-07-med-cert-wording.md) | Prescribing rebuild 07: warmer medical-certificate body wording (third locked support paragraph) |
| [docs/superpowers/plans/2026-07-08-seo-geo-llm-task5-plan.md](../superpowers/plans/2026-07-08-seo-geo-llm-task5-plan.md) | Task 5 SEO/GEO/LLM growth plan: page-template contracts, contextual evidence links, CTR fixes, condition-template hardening, GEO answer blocks, and citation-surface workflow |
| [docs/superpowers/plans/2026-07-10-audit-remediation-program.md](../superpowers/plans/2026-07-10-audit-remediation-program.md) | Reconciled implementation program for PHI key-rotation containment, AI med-cert batch review, service-worker retirement, repository artifact cleanup, dead-code ratcheting, and documentation consolidation |

## docs/plans/archive/ — completed/superseded plans (90-day retention)

See [docs/plans/archive/README.md](../plans/archive/README.md) for the retention policy + index of archived plans.

## docs/bookkeeping/ — 2

| File | Purpose |
|------|---------|
| [docs/bookkeeping/file-map.md](file-map.md) | This file |
| docs/bookkeeping/expected-md-count | Single integer; source of truth for the .md file count guard run by `pnpm doc:audit` |

## docs/reviews/ — 1 (auto-maintained)

| File | Purpose |
|------|---------|
| [docs/reviews/INDEX.md](../reviews/INDEX.md) | Auto-generated video-review log. Maintained by `scripts/video-review/index-update.ts` (runs at the end of every `pnpm review`). Per-run `report.md` files under `docs/reviews/<runId>/` are gitignored from the count by being inside subdirectories — only INDEX.md sits at the top. |

## components/*/README.md — 3 colocated docs

| File | Purpose | Pinned by |
|------|---------|-----------|
| [components/operator/README.md](../../components/operator/README.md) | Unified staff cockpit primitives doctrine | `project-docs-drift-contract` |
| [components/request/README.md](../../components/request/README.md) | Unified intake flow how-to (orchestrator + step registry + Zustand store) | Colocated with code; no test pin |
| [components/uix/README.md](../../components/uix/README.md) | Legacy UIX component library notes still present in tree; reconcile with `docs/ARCHITECTURE.md` before retiring again | No current pin |

`components/uix/README.md` was previously marked as deleted, but is currently present and counted by `scripts/doc-audit.sh`.

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
5. If the new doc should appear in `CLAUDE.md`'s satellite-doc table (most should), add a row there too, then run `scripts/sync-agent-doc.sh` to project to `AGENTS.md`.
6. Run `pnpm doc:audit` to confirm the count guard passes.

## How to remove a doc

1. Confirm zero inbound references via `grep -rn "<old/path>" docs/ CLAUDE.md AGENTS.md PRODUCT.md DESIGN.md lib/ app/ components/ scripts/`.
2. `git rm <path>`.
3. Update this file (remove the row).
4. Update `docs/bookkeeping/expected-md-count` (subtract 1).
5. If the doc was drift-pinned, remove its `it(...)` block from `project-docs-drift-contract.test.ts`.
6. Run `pnpm doc:audit`.

# InstantMed Wiki

This wiki is the first navigation layer after `CLAUDE.md`. Use it to choose the right files before opening broad folders.

## Start Here

1. Read `CLAUDE.md` first. It is the project brain and contains the current stack, policy, and workflow rules.
2. Read this wiki index next when the task is non-trivial.
3. Jump to the smallest domain map below instead of scanning the entire repo.
4. Only then open the canonical docs or implementation files for the task.

## Read By Task

| Task | Read first | Then read |
|------|------------|-----------|
| UI, layout, animation, or patient-facing copy | `docs/AI_ONBOARDING.md`, `DESIGN.md`, `PRODUCT.md` | `docs/BRAND.md`, `docs/VOICE.md`, `docs/ADVERTISING_COMPLIANCE.md` when public copy or claims change |
| Intake flow | `wiki/context-map.md`, `components/request/README.md` | `lib/request/step-registry.ts`, `components/request/request-flow.tsx`, target step component |
| Checkout, Stripe, payment recovery | `wiki/context-map.md`, `docs/ARCHITECTURE.md` payments section | `lib/stripe/checkout.ts`, `lib/stripe/guest-checkout.ts`, `app/api/stripe/webhook/route.ts` |
| Clinical, safety, prescribing, AI drafting | `docs/CLINICAL.md`, `docs/SECURITY.md` | `lib/safety/*`, `lib/clinical/*`, `lib/ai/provider.ts` |
| Staff cockpit, admin, doctor, support | `components/operator/README.md`, `wiki/context-map.md` | `lib/dashboard/routes.ts`, `lib/dashboard/staff-navigation.ts`, target `app/admin/*` or `app/doctor/*` page |
| Patient portal | `wiki/context-map.md`, `docs/ARCHITECTURE.md` patient portal section | `app/patient/*`, `components/patient/*`, `lib/data/patient-*` |
| Analytics, attribution, paid growth | `docs/REVENUE_MODEL.md`, `docs/ADVERTISING_COMPLIANCE.md` | `docs/ROADMAP.md` for current priority, `docs/OPERATIONS.md` for Ads mutations, then `lib/analytics/*`, `app/admin/analytics/*`, `app/admin/ops/*` |
| SEO or health guide work | `docs/SEO_CONTENT_POLICY.md`, `docs/ADVERTISING_COMPLIANCE.md` | `content/blog/*`, `lib/blog/*`, `lib/seo/*`, target route |
| Ops, cron, deploy, incidents | `docs/OPERATIONS.md`, `docs/SECURITY.md` | `vercel.json`, `app/api/cron/*`, `.github/workflows/*` |
| Tests or release checks | `docs/TESTING.md`, `wiki/code-hygiene-audit.md` | `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml` |

## Wiki Files

| File | Purpose |
|------|---------|
| `wiki/context-map.md` | Domain map for the app, data flows, routes, and implementation entry points |
| `wiki/file-directory.md` | Important files/folders referenced by root docs, with read priority |
| `wiki/architecture.md` | Current high-level structure and live inventory counts |
| `wiki/code-hygiene-audit.md` | Read-only hygiene scan, guardrails, and risk-ranked hotspots |
| `wiki/refactor-plan.md` | Deferred refactor plan split into safe small steps |
| `wiki/decision-log.md` | Decisions made while creating this wiki |
| `wiki/open-questions.md` | Product, legal, clinical, or architecture questions not safe to guess |

## Verification Commands

Use the narrowest command that proves the change.

| Change | Minimum verification |
|--------|----------------------|
| Docs/wiki only | `pnpm doc:audit`, `git diff --check` |
| Route or file cleanup | `bash scripts/check-orphaned-files.sh`, `bash scripts/check-route-conflicts.sh` |
| TypeScript code | `pnpm lint`, `pnpm typecheck`, focused `pnpm test run ...` |
| Clinical, checkout, payment, security | Focused unit/contract test plus `pnpm typecheck` and `pnpm lint` |
| Public UI | Relevant tests plus browser check at `http://localhost:3060` |
| Release | `pnpm release:check` |

## Hard Rules

- Do not edit `AGENTS.md` by hand. Edit `CLAUDE.md`, then run `scripts/sync-agent-doc.sh`.
- Do not upgrade pinned stack packages without explicit approval.
- Do not recreate redirect-only routes handled by `next.config.mjs`.
- Do not change product, clinical, advertising, or legal posture from code inference alone.
- Do not use this wiki as a replacement for canonical docs. It is a router into them.

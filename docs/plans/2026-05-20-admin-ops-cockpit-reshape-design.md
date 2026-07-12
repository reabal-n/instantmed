# /admin/ops Cockpit Reshape — Design

> **Authority:** Reference only. This file has no independent execution authority. `docs/ROADMAP.md` is the sole active queue; execute from this record only when the ROADMAP explicitly activates it.

**Date:** 2026-05-20
**Status:** Approved, ready for implementation plan
**Scope:** `/admin/ops` (support + admin views, single page)
**Out of scope:** Dashboard queue migration, email hub, patient portal, env/config migration to `/admin/features` (follow-up)

## Problem statement

`/admin/ops` is the only major staff surface that did not get the calm-chrome treatment. Three issues:

1. **Calm-chrome violation.** The page uses colored-background `StatusPill` components ("Clear" / "Open" / "System clear" / "Needs review") for routine status across the System Checks rows, the Recovery Path tiles, the page header, and the Refund summary. This is the exact pattern CLAUDE.md codified against on 2026-05-21 for every staff list surface. Reserved colored backgrounds are for exception states only; "Clear" is not an exception.
2. **Duplicate signal.** The page renders the same set of recovery categories twice. The Needs-Attention block shows the open subset of failure categories. The Recovery-Paths grid renders the same categories again as a 4-column grid plus a collapsible "Clear paths" details fold. Eight System-Checks rows below duplicate five of those categories a third time. Plus a standalone Refunds card.
3. **Feature bloat.** Twenty-one parallel Supabase queries feed surfaces that nobody acts on. Recent outgoing emails, last paid intake heartbeat, last Telegram test, last Parchment success, audit-volume total, safety-blocks recent list, Stripe price config, Telegram env, auth-email config. Most of these are environment or setup signals that belong on `/admin/features`, not an operations cockpit.

The bones (server-fetched data via existing helpers, `OperatorPage` shell, role gating via `hasSupportAccess`, PHI mask boundary already drawn) are right. The page needs to be reshaped to two blocks, not nine.

## North star

**At any moment the operator sees what is broken and what was just recovered. Nothing else.**

This is the support cockpit's only job. Env/config signals migrate to `/admin/features`. Deep recovery workshops (`/admin/ops/parchment`, `/admin/ops/prescribing-identity`, `/admin/webhook-dlq`) stay where they are — `/admin/ops` is the scannable index that links into them.

## Page composition

```
┌────────────────────────────────────────────────────────────────────┐
│  Operations                                                         │
│  Resolve payment, sync, and identity issues.                        │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │  3           │ │  0           │ │  1           │ │  0         │ │
│  │ Payment      │ │ Webhook DLQ  │ │ Parchment    │ │ Missing    │ │
│  │ failures     │ │              │ │ unsynced     │ │ identity   │ │
│  │ • 1 stale    │ │ All clear    │ │ Action need  │ │ All clear  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│   click → ledger pre-filtered                                       │
├────────────────────────────────────────────────────────────────────┤
│  Recent (last 24h)                                                  │
│  • R***** N****** · payment failed · IM-...90CF3E · 2h        ›    │
│  • G***** J***** · parchment failed · IM-...8A8728 · 5h       ›    │
│  • ...                                                              │
│                                                                     │
│  Empty: "Nothing to recover. All systems clear."                    │
└────────────────────────────────────────────────────────────────────┘
```

Two blocks total. Identical view for admin and support. The only role-driven difference is PHI masking on the recent list. No accordions, no toggles, no tertiary actions.

### Counter cards

Four cards, fixed 4-up grid at `xl`, 2-up at `md`, 1-up below. Each card click deep-links to the ledger with the appropriate filter applied; the ledger has the filter, sort, density, and bulk-select power already, so the cockpit page never duplicates that machinery.

| Card | Source data | Click target |
|---|---|---|
| Payment failures | `failureOverview.categories[stripe_webhooks].count + checkout.count + refund_failures.count` | `/admin/intakes?chips=payment_failed,refunded_failed` |
| Webhook DLQ | `webhookDlqResult.count` | `/admin/webhook-dlq` |
| Parchment unsynced | `failureOverview.categories[prescription_delivery].count + stale_scripts.count` | `/admin/ops/parchment` |
| Missing identity | `prescribingIdentityResult.blockedCount` | `/admin/ops/prescribing-identity` |

Helper text under each count carries the most useful diagnostic for the current state ("1 stale" / "All clear" / "Action needed"). Tone follows the count: `neutral` at 0, `warning` for 1+, `critical` if `failureOverview.severity === "critical"` is present in that category.

### Recent recoveries list

Default 10 items, sorted by `occurredAt DESC` across all categories. Each row is the link target (no separate button). Hover reveals a small chevron on the right edge.

Row content:

```
[StatusDot] [Masked or real name] · [category label] · [IM-ref] · [relative time]   [chevron on hover]
```

Severity dot, name, category, ref, time. That's it. No avatar, no action button, no metadata block. The intake reference uses `font-mono tabular-nums text-[11px]`. Time uses `tabular-nums text-xs`.

Empty state: `"Nothing to recover. All systems clear."` Rendered as a single calm line inside the block. No celebration icon, no graphic.

## New primitives

### `components/operator/counter-card.tsx`

```ts
type CounterCardProps = {
  count: number
  label: string
  helperText?: string
  tone: "neutral" | "warning" | "critical"
  href?: string
  loading?: boolean
}
```

- 140px min-height.
- Count `text-3xl font-semibold tabular-nums`.
- Label `text-sm font-medium`.
- Helper row: `StatusDot` (tone-driven) + `text-xs text-muted-foreground` helper text.
- Idle border `border-border/50`. Warning adds `border-amber-200/60` as a hint, not a billboard. Critical adds `border-red-200/60`.
- When `href` provided, wraps in a `<Link>` with `transition-colors` hover. No translate, no scale, no decorative motion (per portal motion rule).
- Reusable for the `/dashboard` KPI strip in the next cycle (revenue · queue · SLA · volume).

### `components/operator/cases/recovery-row.tsx`

Sibling to `CaseRow`, lives in the same primitives family.

```ts
type RecoveryRowProps = {
  patientName: string | null
  category: RecoveryCategory
  intakeRef: string
  occurredAt: string
  severity: "warning" | "critical"
  href: string
  maskPhi: boolean
}
```

- 56px row height, same rhythm as `CaseRow`.
- `StatusDot` for severity, inline with category label.
- Name rendered raw when `maskPhi === false`, via `maskPatientName()` when `true`.
- `font-mono tabular-nums text-[11px]` for ref, `tabular-nums` for time.
- Whole row is the link. Hover bg `bg-accent/30`. Chevron `›` revealed on hover at the right edge, opacity 0 → 60 over 80ms.

### `lib/admin/mask-phi.ts`

```ts
export function maskPatientName(name: string | null): string
export function maskPhone(phone: string | null): string
```

`maskPatientName("Reabal Najjar")` → `"R***** N******"`. First letter retained, remaining letters replaced one-for-one with `*`. Handles single-word names, hyphens, apostrophes, unicode (matches the existing `/^[\p{L}\s'-]+$/u` validator). Returns `"Unknown patient"` for null/empty.

`maskPhone("0450722549")` → `"•••• 2549"`. Last 4 retained.

Lives next to `lib/admin/ops-failures.ts` since masking is an ops-cockpit concern. Unit tests cover single-word, hyphenated, apostrophe, unicode, null, empty, single-character.

### `lib/admin/ops-recoveries.ts`

```ts
export type RecoveryCategory =
  | "payment_failed"
  | "webhook_failed"
  | "parchment_failed"
  | "identity_missing"

export type Recovery = {
  id: string
  category: RecoveryCategory
  patientName: string | null
  intakeId: string | null
  intakeRef: string
  occurredAt: string
  severity: "warning" | "critical"
  href: string
}

export function buildRecoveries(input: {
  webhookFailures: ...
  checkoutFailures: ...
  emailFailures: ...
  certificateFailures: ...
  parchmentWebhookFailures: ...
  staleScriptIntakes: ...
  refundFailures: ...
  identityBlockers: ...
}): Recovery[]
```

Builds a normalized list from the existing typed inputs the page already fetches, sorts by `occurredAt DESC`, slices to 10. No new database queries.

## Data layer cleanup

`app/admin/ops/page.tsx` drops from 21 parallel queries to 9. Removed:

| Removed query / helper | Why |
|---|---|
| `recentOutgoingEmailsResult` | Emails block deleted |
| `latestPaidIntakeResult` | productionTimeline deleted |
| `latestSentEmailResult` | productionTimeline deleted |
| `opsAuditActionsResult` | Test-event tracking; moves to `/admin/features` |
| `recentRefundsResult` | Refund failures fold into Payment failures; successful refunds live in ledger |
| `auditLogsResult` (volume) | Never actionable |
| `safetyBlocksResult` | Safety blocks surface via stuck intakes |
| `authEmailHealthResult` | Auth-email config moves to `/admin/features` |
| `getStripePriceConfigIssues()` | Env config; moves to `/admin/features` |
| `getDuplicatePatientProfileSummary()` | Patient identity is its own surface |
| `getMissingTelegramAlertEnv()` | Env config; moves to `/admin/features` |

Kept (9 queries): `webhookDlqResult`, `emailFailuresResult`, `checkoutFailuresResult`, `incompleteRequestsResult`, `certificateFailuresResult`, `prescriptionWebhookFailuresResult`, `staleScriptIntakesResult`, `refundFailuresResult`, `prescribingIdentityResult`.

`buildOperationalFailureOverview()` in [lib/admin/ops-failures.ts](../../lib/admin/ops-failures.ts) stays as the counter-totals computer; we just stop rendering the categories the new design hides.

## Role-aware composition

```ts
return (
  <OpsDashboardClient
    counters={counters}
    recoveries={recoveries}
    maskPhi={isSupportOnly}
  />
)
```

`OpsDashboardClient` renders the same JSX for both. The only branch is the recovery-row `maskPhi` prop. No `supportMode` ternaries scattered through the tree, no separate admin block.

## Calm chrome contract

- Zero colored-background pills on routine status. The header "System: clear" indicator becomes an inline `<StatusDot /> + text` element, never a pill.
- All status rendering goes through `StatusDot` or `Badge` (the latter reserved for exception states only — `critical` severity recovery rows may use a small `Badge variant="destructive"` for the category label; warning rows use `StatusDot` + plain text).
- Background levels: page `bg-background`, cards `bg-card`, hover `bg-accent/30`. No new shades.
- `transition-colors` for all hover states. No decorative motion in this surface.

## Acceptance

| Check | How |
|---|---|
| Visual diff matches design doc | Manual screenshot review at both `support` and `admin` roles, light and dark |
| Calm-chrome contract | New test `lib/__tests__/admin-ops-calm-chrome.test.ts` greps `app/admin/ops/**` for `bg-emerald-50\|bg-orange-100\|bg-red-100\|bg-amber-100\|bg-emerald-100\|bg-red-50\|bg-orange-50\|bg-amber-50` and asserts zero matches in the rendered tree |
| PHI mask unit tests | `lib/__tests__/mask-phi.test.ts` covers single-word, hyphenated, apostrophe, unicode, null, empty, single-character |
| Recovery builder unit | `lib/__tests__/ops-recoveries.test.ts` covers sort order, slice, severity escalation, category mapping |
| E2E support cockpit | Existing `e2e/admin.ops-index.spec.ts` updated to assert 4 counter cards visible plus at least one recovery row when seeded data present |
| Data layer regression | Snapshot the new `page.tsx` query count at 9; CI fails if it grows back |
| Counter primitive contract | `lib/__tests__/counter-card-contract.test.ts` covers tone-to-StatusDot mapping, helperText render, click behavior |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Admin habit relies on the env/config signals we're removing | Stripe price + Telegram + auth-email banners migrate to `/admin/features` in a follow-up task. CLAUDE.md gotcha + commit note ensures discoverability. Banner copy stays consistent so the operator's mental model survives the move. |
| Refunds card removal surprises support staff who used it for "did my refund go through" | Refund dialog already shows success + toast on confirmation. Ledger has Refunded chip filter for history. Document the new path in the commit body. |
| Counter-card primitive over-fits to ops needs | API stays generic. Dashboard KPI strip in the next cycle uses identical props with different data. |
| PHI mask edge cases (empty, single-char, unicode) | Unit tests cover; CI fails on regression. |
| Calm-chrome grep test catches false positives in unrelated components | Scope the grep to `app/admin/ops/**` only. The dashboard queue migration in the next cycle will add the same test scoped to `/dashboard`. |
| Counter card click target conflict with ledger filter schema | Reuse existing `STAFF_LEDGER_HREF` + chip query param convention (`?chips=payment_failed`). No new URL grammar. Confirm chip values match `lib/operator/cases/types.ts` before wiring. |
| `failureOverview` counter math diverges from `recentRecoveries` count | Both derive from the same query results; assert equality in unit test. |

## Out of scope (explicit)

- No `/api/admin/ops/since` polling endpoint. The page is server-rendered with `dynamic = "force-dynamic"`; a hard refresh is sufficient. The system-health pill in the header already polls every 45s for high-level signal.
- No bulk recovery action. Support resolves items one at a time via deep links into the owning workshop pages.
- No saved filter chips on the recent list. If support needs to scope, they go to the ledger.
- No new sub-routes. `/admin/ops/parchment`, `/admin/ops/prescribing-identity`, `/admin/ops/intakes-stuck`, `/admin/ops/reconciliation`, `/admin/ops/patient-merge-audit` stay as the deep workshops.
- No migration of env/config banners in this PR. That's a follow-up task: move `getStripePriceConfigIssues`, `getMissingTelegramAlertEnv`, and `getAuthEmailHealth` callers to `/admin/features` with inline section banners.
- No changes to refund logic, role gates, capacity checks, or any actions in [app/doctor/queue/actions.ts](../../app/doctor/queue/actions.ts). This is a presentation reshape.
- No changes to `OperatorShell`, `OperatorPage`, `OperatorPageHeader`, or staff navigation.

## Doc maintenance

When this ships, update:

- **CLAUDE.md** "Operational controls" workflow note: add that `/admin/ops` is the scannable two-block index (counters + recent recoveries) and that env/config signals live on `/admin/features`.
- **CLAUDE.md** Gotchas: add a one-liner that the counter-card and recovery-row primitives are reusable for the `/dashboard` KPI strip and any future cockpit list surface that needs masked PHI rendering.
- **docs/ARCHITECTURE.md** Component Patterns: register `CounterCard` and `RecoveryRow` next to `CaseRow` / `CaseTable`.

## Next step

Invoke `superpowers:writing-plans` to convert this design into a sequenced implementation plan with concrete file-by-file changes and verification gates.

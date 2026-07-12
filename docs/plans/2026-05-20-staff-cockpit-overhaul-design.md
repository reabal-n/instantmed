# Staff Cockpit Overhaul — Design

> **Authority:** Reference only. This file has no independent execution authority. `docs/ROADMAP.md` is the sole active queue; execute from this record only when the ROADMAP explicitly activates it.

**Date:** 2026-05-20
**Status:** Approved, ready for implementation plan
**Scope:** `/dashboard` (admin + doctor), `/admin/ops` (support), `/admin/intakes` (Ledger), `/admin/patients` (People)
**Out of scope:** patient profile, intake case detail, med cert PDF, prescribing flow. Those are the four cycles that follow this one.

## Problem statement

Three staff surfaces today read as generic admin tooling rather than a confident operator cockpit:

1. **Intake Ledger has a literal sort bug.** `getAllIntakesForAdmin()` at [lib/data/intakes/queries.ts:597](../../lib/data/intakes/queries.ts) builds the query without an `.order()` clause, so Postgres returns rows in planner order. That is why the ledger looks random in the screenshots.
2. **Visual chrome is loud and undisciplined.** Pill-shaped status badges fight for attention, row rhythm is loose, IDs are not tabular, density is fixed, and the design language drifts from page to page.
3. **The three roles (admin, doctor, support) are mashed onto one shape** instead of being given role-appropriate dashboards. Doctors see admin signals they should not see. Support sees clinical context that is irrelevant to them.

The bones are right (role-aware `OperatorShell`, j/k keyboard layer, status taxonomy in [lib/data/status.ts](../../lib/data/status.ts), command palette, system health pill, Phase 2 dashboard remaster from 2026-05-12). The gap is craft and role-aware composition.

## North star

**At any moment, one obvious next action should be visible without scanning.**

This is the opposite of Helix and MediRecords, which surface every possible action and every possible piece of data at all times. The reference aesthetic is the calmer end of Vercel (Stripe Dashboard, Notion) rather than dense data-grid Vercel.

## Seven simplicity rules

1. **One job per screen.** Cockpit = work the queue. Ledger = find anything. People = patient identity. Do not mix.
2. **Role-aware defaults.** A doctor never sees revenue tiles. Support never sees an approve button. Hide, do not gate.
3. **Progressive disclosure.** Power features (saved views, bulk select, search syntax) exist but do not crowd the default view. They appear when invoked.
4. **Sort is never random.** Default `created_at DESC` everywhere. Click headers to change.
5. **Status as a dot, not a pill.** Pills are reserved for exception states only (Refunded, Disputed, Escalated, Payment Failed).
6. **Empty states are diagnostic.** "All caught up, 12m since last clear" beats a generic checkmark.
7. **No whole-page scroll on operator surfaces.** Fixed-height layouts. Side panels for detail.

## Three dashboards, one shell

| Role | URL | Renders | Hidden |
|---|---|---|---|
| Admin | `/dashboard` | Clinical queue + KPI strip + system health rail + dismissible setup cards | Nothing |
| Doctor | `/dashboard` | Clinical queue + "Open Next Case" hero + my-stats-today + availability toggle | KPI strip, peer activity, setup cards, system health detail, revenue |
| Support | `/admin/ops` (auto-redirect from `/dashboard`) | Recovery counter cards + recent recoveries list | Clinical queue, approve/decline, scripts, prescribing, finance, analytics |

Same `OperatorShell` wrapper. Role-aware composition in the page component, not in toggles or hidden menus.

## Admin dashboard

```
┌────────────────────────────────────────────────────────────────────┐
│  [Avail toggle]              [Test data] [Health pill] [Profile]   │
├────────────────────────────────────────────────────────────────────┤
│  Today          $XXX revenue · N queue · SLA green · N volume      │  ← KPI strip
├────────────────────────────────────────────────┬───────────────────┤
│                                                │  Up next          │
│   <CaseTable>                                  │  ┌─────────────┐  │
│   Review and scripts                           │  │ Open next   │  │
│   ┌──────────────────────────────────────────┐ │  │ case  →  O  │  │
│   │ ⚪ RN  Reabal Najjar  · IM-...90CF3E    │ │  └─────────────┘  │
│   │ 🟢 KB  Kylee Bullivant · cert · 20m ago │ │                   │
│   │ 🔵 DC  Darryn Curran · consult · 1h ago │ │  System health    │
│   └──────────────────────────────────────────┘ │  • 1 webhook DLQ  │
│   [All] [Review] [Info] [Scripts]              │  • All green else │
│                                                │                   │
│                                                │  My today: 12 ·   │
│                                                │  avg 23m          │
└────────────────────────────────────────────────┴───────────────────┘
```

KPI strip tiles: today's revenue, queue depth, SLA pulse (median review time with green/amber/red dot), today's volume. Each tile is click-to-filter the queue below.

Setup cards (Parchment connected, doctors hired, Stripe live) collapse into a single "Setup status: 3 of 4" pill once first dismissed. Not in the main flow once dismissed.

## Doctor dashboard

```
┌────────────────────────────────────────────────────────────────────┐
│  [Avail toggle]                              [Health pill] [Profile]│
├────────────────────────────────────────────────┬───────────────────┤
│  Your queue                                    │  Open next case   │
│                                                │  ┌─────────────┐  │
│  <CaseTable>                                   │  │   →   O     │  │
│   ┌──────────────────────────────────────────┐ │  └─────────────┘  │
│   │ rows                                     │ │                   │
│   └──────────────────────────────────────────┘ │  My today         │
│   [All] [Review] [Info] [Scripts]              │  12 cases · 23m   │
└────────────────────────────────────────────────┴───────────────────┘
```

No KPI strip. No peer activity. No setup cards. The doctor's day is the queue plus what they have already done.

Empty state: `"All caught up. You reviewed 12 today (avg 23m). Nothing in the queue. Last cleared 12 min ago."`

## Support dashboard `/admin/ops`

```
┌────────────────────────────────────────────────────────────────────┐
│  Operations                                  [Health pill] [Profile]│
│  Resolve payment, sync, and identity issues.                       │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ 3            │ │ 0            │ │ 1            │ │ 0          │ │
│  │ Payment      │ │ Webhook DLQ  │ │ Parchment    │ │ Missing    │ │
│  │ failures     │ │              │ │ unsynced     │ │ identity   │ │
│  │ ⚠ 1 stale    │ │ All clear    │ │ Action need  │ │ All clear  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│  RECENT (last 24h)                                                 │
│  ⚠  R*** N**** · payment failed · IM-...90CF3E · 2h · [Resolve]   │
│  ⚠  G**** J**** · parchment failed · IM-...8A8728 · 5h · [Resolve]│
└────────────────────────────────────────────────────────────────────┘
```

PHI masked at the row level (initial + asterisks for names, last 4 digits for phones). Read-only patient context. Ops actions only (retry webhook, mark recovered, request identity).

Empty state: `"Nothing to recover. All systems clear."`

## Ledger `/admin/intakes`

```
Intake ledger                                            N results

🔍  status:approved service:cert ...           [Density]  [Export]

▸ Express  ▸ Stale > 4h  ▸ Awaiting script  ▸ Failed pay  ▸ Mine

TODAY (8)
  rows...
YESTERDAY (12)
  rows...
THIS WEEK (24)
  ⬇ Show 18 more
```

Default sort `created_at DESC`. Headers click-to-sort, persisted to URL. Saved views appear only after the user saves one. Bulk select hidden until shift-click. Real-time `+N new` pill anchors top-center when fresh intakes arrive (30s poll).

Five quick filter chips, not ten. Search syntax supported (`status:approved service:cert from:today`) with plain-text fallback.

## People `/admin/patients`

```
Patients                                       109 patients · 41 unique

[search] [states v] [statuses v] [services v]

⚠ Needs attention (2)
  Reabal Najjar · failed payment · merge candidate
  Glenn James · parchment unsynced

PATIENTS
  rows... (sorted by recent activity, default)
```

Smart "Needs attention" group only renders when there are items. Smart group rolls up: failed payments, stale > 24h, parchment unsynced, duplicate flags. The duplicate-merge banner from the current page collapses into this group.

## Shared primitives

Five new components carry the entire visual language across all surfaces. Build once, reuse everywhere. This is what makes Phase 2 (patient profiles, case details, med cert, prescribing) cheap.

### `<CaseRow>`

- 56px default height (calm Vercel, not cramped). 40px compact, 72px spacious.
- 28px avatar (subdued).
- Identity column: name 14/500, secondary line 12/400 muted.
- Service column: 14px lucide icon + label + ID in `font-mono text-xs tabular-nums`.
- Status: 8px filled dot + status label as inline text. No pill backdrop.
- Time: relative ("2h ago"), `tabular-nums`. Full timestamp on hover.
- Actions: ghost-button cluster revealed on hover, right-aligned.
- States: idle, hover (bg 4% darker), selected (1px inset ring), focused (2px coral ring), pressed.

### `<CaseTable>`

- Sticky header row with sortable column chevrons.
- Section headers between time groups (`TODAY`, `YESTERDAY`, `THIS WEEK`, `EARLIER`). 11px / 600 / tracked / muted.
- Multi-select with checkbox column (visible only on hover or when any row selected).
- Density toggle in header chrome.
- Empty / loading / error variants.

### `<FilterBar>`

- Row 1: saved-view tabs. Active tab gets coral underline. Empty by default; only shows the active view name as a label.
- Row 2: search input + density/columns/export controls.
- Row 3: quick-filter chips (5 max). Toggle state; chip stays lit when active.

### `<StatusDot>`

- 8px filled circle. Semantic color (ready: emerald, in_review: blue, awaiting_script: violet, approved: green, declined: red, payment_failed: amber, expired: slate).
- Pill variant reserved for exceptions only: Refunded, Disputed, Escalated, Payment Failed.

### `<HoverActions>`

- Right-edge ghost-button cluster, max 5 actions.
- Cmd+click opens slide-over panel without leaving the page.
- Tooltip with keyboard hint on each action.

## Visual language

Adds to `app/globals.css`:

```css
--row-compact: 40px
--row-comfortable: 56px      /* default */
--row-spacious: 72px
--status-dot: 8px
--ledger-group-gap: 32px
--hover-row-bg: oklch(98% 0 0)
--selected-ring: 1px inset coral/50%
```

Type:
- IDs and times: `font-mono` + `tabular-nums`.
- Section headers: 11px / 600 / `tracking-[0.08em]` / `text-muted-foreground`.
- Row name: 14/500. Secondary: 12/400/muted. No third level.

Color discipline:
- One accent (coral) for: active filter chip, selected row ring, "Open next case" CTA, KPI breach indicator. Nothing else.
- Status indicators are dots, not pills.
- Three background levels: page `bg-background`, cards `bg-card`, hover `bg-accent/30`.

Motion:
- Row hover: 80ms fade.
- Real-time pill: spring entry (stiffness 180, damping 22). Respects `useReducedMotion()`.
- Section group: no animation. Calm.

## Data layer changes

**Critical bug fix** at [lib/data/intakes/queries.ts:597](../../lib/data/intakes/queries.ts):

```ts
// before: no .order()
// after:
.order('created_at', { ascending: false })
```

**Extend `getAllIntakesForAdmin()`** to accept:

- `orderBy: "created_at" | "submitted_at" | "paid_at" | "status"`
- `direction: "asc" | "desc"`
- `assignedTo?: string`
- `staleSeconds?: number`
- `paymentStatus?: PaymentStatus[]`

**New endpoint** `/api/admin/intakes/since?timestamp=...` returning `{ count, latestCreatedAt }` for the real-time poll.

**URL state schema** for saved views (v1):

```
?view=stuck&sort=created_at:desc&filter=stale>14400,payment:failed,assignee:me
```

DB-backed saved views (table `staff_saved_views`) deferred to v2.

No new DB tables in v1. Density + column visibility live in localStorage.

## Keyboard layer

Extends the existing j/k/a/d in [app/doctor/queue/queue-client.tsx:638-698](../../app/doctor/queue/queue-client.tsx):

- `j` / `↓` row navigation
- `k` / `↑` row navigation
- `a` approve (existing)
- `d` decline (existing)
- `e` assign
- `o` open next case
- `/` focus search
- `Shift+a/d/e` bulk variants when selection active
- `g` then `l` go to Ledger
- `g` then `d` go to Dashboard
- `g` then `p` go to People
- `Cmd+K` command palette (existing)
- `v` then `1/2/3` density toggle (compact/comfortable/spacious)

## Phasing (10 working days, one branch, staged commits)

| Day | Scope | Verify |
|---|---|---|
| 1 | Primitives: `CaseRow`, `CaseTable`, `StatusDot`. Demo route `/admin/_design/cases`. | Visual review |
| 2 | Primitives: `FilterBar`, `HoverActions`, density toggle, saved-view URL state, time grouping | Visual review |
| 3 | Ledger refactor: fix ORDER BY, sortable headers, time groups | E2E happy path |
| 4 | Ledger quick filters + bulk select (hidden by default) + floating action bar | E2E bulk decline |
| 5 | Ledger search syntax + `+N new` poll endpoint + saved views (URL only) | Unit + E2E |
| 6 | Admin dashboard: three-zone layout + KPI strip + dismissible setup cards | Visual + E2E |
| 7 | Doctor dashboard: simplified shell, hide admin-only blocks, "Open next case" hero | E2E open-next-case |
| 8 | Support dashboard: rebuild `/admin/ops` to counter-card layout + recent recoveries list | Visual + E2E |
| 9 | People page: smart attention group + reskin to CaseTable + card view alternate | Visual review |
| 10 | Cross-cutting polish (`/audit`, `/emil-design-eng`), dark-mode parity, ship behind `cockpit_v2` flag | Full E2E + manual QA |

Feature flag `cockpit_v2` in [lib/feature-flags.ts](../../lib/feature-flags.ts), default off. Opt-in for admin first, broaden once stable. Old dashboard remains accessible as `/dashboard?legacy=1` for one sprint.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Visual overhaul collides with active brand rehaul (coral + Plus Jakarta lock) | Use BRAND.md v1.0.0 tokens as floor; do not invent new palette |
| Real-time poll inflates DB load | 30s interval, indexed `created_at` lookup, server-cached count |
| Density toggle breaks existing E2E | All `data-testid` stable across densities |
| Saved views orphaned in URLs | URL-only v1; DB-backed v2 only after usage proves it |
| Bulk decline misuse | `TypedConfirmDialog` with case-count token (type `4` to confirm a 4-case decline) |
| Refund flow regression | Refund path unchanged; ledger only surfaces and filters, never mutates refund logic |
| Support sees data they should not | Application-layer `hasSupportAccess()` checks every render path; PHI masked via existing `lib/data/seeded-e2e-data.ts` style row redaction |
| Doctor capability flags miss new gates | All approve/decline/script actions already gate via `doctorHasCapability()` and `requiredCapabilityForService()` per CLAUDE.md Phase 7 |

## What I am NOT doing in this scope

- Not touching intake creation, patient profile, case detail, med cert PDF, or prescribing flow. Those are the next four cycles.
- Not changing `sortForReviewNext()` in [lib/doctor/review-next.ts](../../lib/doctor/review-next.ts). It works.
- Not adding column resize, column reorder, board view, or timeline view. Overshoot for a 2-3 person team.
- Not migrating to TanStack Table. Custom row primitive is leaner and matches Morning Canvas.
- Not introducing Supabase realtime subscriptions. 30s poll is sufficient.
- Not changing the doctor mobile bottom-tab nav (`DoctorMobileNav`).
- Not adding analytics or revenue charts to the doctor dashboard. Doctors see their own numbers, not the business numbers.
- Not touching the global command palette beyond consuming the new saved-view registry.

## Doc maintenance

When this ships, the following CLAUDE.md sections need updates per the doc maintenance policy:

- "Staff dashboard" Key Workflows entry: note `cockpit_v2` flag and the three role-aware compositions.
- "Staff cockpit shell" gotcha: note that `<CaseRow>` / `<CaseTable>` are now the canonical list primitives across all staff surfaces.
- New gotcha: "Default sort is `created_at DESC` everywhere; never ship a `getAll*` query without an explicit `.order()` clause" (the ledger bug was instructive).

## Next step

Invoke `superpowers:writing-plans` to convert this design into a sequenced implementation plan with concrete file-by-file changes, sub-agents to dispatch, and verification gates per phase.

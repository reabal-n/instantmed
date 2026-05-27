# Staff Cockpit Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Reference `superpowers:test-driven-development` for every component task. Reference `superpowers:verification-before-completion` before marking any task done.

**Goal:** Rebuild the InstantMed staff cockpit (admin, doctor, support dashboards + Ledger + People) to a calm, role-aware, sortable design behind a `cockpit_v2` feature flag.

**Architecture:** Five new shared primitives (`CaseRow`, `CaseTable`, `FilterBar`, `StatusDot`, `HoverActions`) compose three role-aware dashboards plus the Ledger and People pages. URL-state for sort and saved views. localStorage for density. 30-second poll for real-time updates. No new DB tables in v1.

**Tech stack:** Next.js 15.5 App Router, React 18.3, TypeScript 5.9 strict, Tailwind v4, Supabase Postgres, Vitest, Playwright, Framer Motion v11, Zod, react-hook-form.

**Design source:** [docs/plans/2026-05-20-staff-cockpit-overhaul-design.md](2026-05-20-staff-cockpit-overhaul-design.md)

**Stack pin reminder:** Do not bump Next, React, Tailwind, or Framer Motion. Stack pins enforced by `scripts/check-stack-pins.sh`. See CLAUDE.md "Stack Pin Policy".

**No em dashes anywhere** (user preference per memory `feedback_no_em_dashes.md`).

---

## Phase 0: Setup (30 min)

### Task 0.1: Create worktree and branch

**Files:** none

**Step 1:** Use `superpowers:using-git-worktrees` to create an isolated worktree.

**Step 2:** Branch name: `cockpit-v2`.

**Step 3:** Verify clean state:

```bash
git status
```

Expected: clean working tree on `cockpit-v2`.

---

### Task 0.2: Add `cockpit_v2` feature flag

**Files:**
- Modify: `lib/feature-flags.ts`
- Test: `lib/__tests__/feature-flags-cockpit-v2.test.ts` (create)

**Step 1: Write the failing test**

```ts
// lib/__tests__/feature-flags-cockpit-v2.test.ts
import { describe, it, expect } from "vitest"
import { FEATURE_FLAGS } from "@/lib/feature-flags"

describe("cockpit_v2 flag", () => {
  it("is defined in FEATURE_FLAGS", () => {
    expect(FEATURE_FLAGS).toHaveProperty("cockpit_v2")
  })

  it("defaults to false", () => {
    expect(FEATURE_FLAGS.cockpit_v2.default).toBe(false)
  })

  it("has a human description", () => {
    expect(FEATURE_FLAGS.cockpit_v2.description.length).toBeGreaterThan(20)
  })
})
```

**Step 2: Run the test**

```bash
pnpm test feature-flags-cockpit-v2 --run
```

Expected: FAIL — flag not yet defined.

**Step 3: Add the flag**

Open `lib/feature-flags.ts`, add to the `FEATURE_FLAGS` record:

```ts
cockpit_v2: {
  default: false,
  description:
    "New role-aware staff cockpit: redesigned Dashboard, Ledger, People, and Ops surfaces with shared primitives.",
},
```

**Step 4: Verify**

```bash
pnpm test feature-flags-cockpit-v2 --run
```

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/feature-flags.ts lib/__tests__/feature-flags-cockpit-v2.test.ts
git commit -m "feat(cockpit): add cockpit_v2 feature flag"
```

---

### Task 0.3: Create demo route stub

**Files:**
- Create: `app/admin/_design/cases/page.tsx`
- Create: `app/admin/_design/cases/layout.tsx`

**Step 1: Create layout that requires admin**

```tsx
// app/admin/_design/cases/layout.tsx
import { requireRoleOrNull } from "@/lib/auth/require-role"
import { notFound } from "next/navigation"

export default async function DesignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRoleOrNull(["admin"])
  if (!user) notFound()
  return <>{children}</>
}
```

**Step 2: Create stub page**

```tsx
// app/admin/_design/cases/page.tsx
export default function CockpitV2DesignPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Cockpit v2 — Design preview</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Visual gallery of new primitives. Admin-only. Not linked from navigation.
      </p>
      <div className="mt-8 space-y-12">
        <section data-section="status-dot">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Status dot
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Primitives go here.</p>
        </section>
      </div>
    </div>
  )
}
```

**Step 3: Add middleware guard so prod blocks it**

Open `middleware.ts`. Verify `/admin/_design/*` is allowed only when the user is admin. Existing role middleware already covers `/admin/*`, so no change needed. Confirm by hitting `/admin/_design/cases` as a doctor and seeing a 404.

**Step 4: Manual verify**

```bash
pnpm dev
```

Then open `http://localhost:3000/admin/_design/cases` while signed in as admin. Expect the stub page to render.

**Step 5: Commit**

```bash
git add app/admin/_design
git commit -m "chore(cockpit): scaffold admin design-preview route"
```

---

## Phase 1: Shared primitives (Days 1-2)

Apply `@superpowers:test-driven-development` rigorously to each primitive. Apply `@impeccable` and `@emil-design-eng` after the visual review at the end of Phase 1.

### Task 1.1: `StatusDot` component

**Files:**
- Create: `components/cockpit/status-dot.tsx`
- Test: `components/cockpit/__tests__/status-dot.test.tsx`

**Step 1: Failing test**

```tsx
// components/cockpit/__tests__/status-dot.test.tsx
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StatusDot } from "../status-dot"

describe("StatusDot", () => {
  it("renders the status label", () => {
    const { getByText } = render(<StatusDot status="approved" />)
    expect(getByText("Approved")).toBeInTheDocument()
  })

  it("applies semantic color for approved", () => {
    const { container } = render(<StatusDot status="approved" />)
    const dot = container.querySelector('[data-status-dot="approved"]')
    expect(dot).toHaveClass("bg-emerald-500")
  })

  it("applies semantic color for declined", () => {
    const { container } = render(<StatusDot status="declined" />)
    const dot = container.querySelector('[data-status-dot="declined"]')
    expect(dot).toHaveClass("bg-red-500")
  })

  it("renders a 8px dot", () => {
    const { container } = render(<StatusDot status="approved" />)
    const dot = container.querySelector('[data-status-dot]')
    expect(dot).toHaveClass("h-2", "w-2")
  })
})
```

**Step 2: Run test**

```bash
pnpm test status-dot --run
```

Expected: FAIL — component does not exist.

**Step 3: Implement**

```tsx
// components/cockpit/status-dot.tsx
import { cn } from "@/lib/utils"
import { INTAKE_STATUS, type IntakeStatus } from "@/lib/data/status"

type StatusDotProps = {
  status: IntakeStatus
  className?: string
  hideLabel?: boolean
}

const DOT_COLOR: Record<IntakeStatus, string> = {
  draft: "bg-slate-400",
  paid: "bg-blue-500",
  in_review: "bg-blue-500",
  pending_info: "bg-amber-500",
  approved: "bg-emerald-500",
  completed: "bg-emerald-500",
  awaiting_script: "bg-violet-500",
  declined: "bg-red-500",
  escalated: "bg-red-500",
  cancelled: "bg-slate-400",
  expired: "bg-slate-400",
  disputed: "bg-red-500",
  checkout_failed: "bg-red-500",
  refunded: "bg-slate-400",
}

export function StatusDot({ status, className, hideLabel = false }: StatusDotProps) {
  const meta = INTAKE_STATUS[status]
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        data-status-dot={status}
        className={cn(
          "h-2 w-2 rounded-full ring-1 ring-inset ring-black/5",
          DOT_COLOR[status],
        )}
        aria-hidden
      />
      {!hideLabel && (
        <span className="text-sm text-foreground">{meta.label}</span>
      )}
    </span>
  )
}
```

**Step 4: Run test**

```bash
pnpm test status-dot --run
```

Expected: PASS.

**Step 5: Add to design preview**

Open `app/admin/_design/cases/page.tsx`, in the `data-section="status-dot"` section render every status:

```tsx
<div className="grid grid-cols-3 gap-3 mt-4">
  {(["paid","in_review","approved","awaiting_script","declined","pending_info","expired","completed","refunded"] as const).map((s) => (
    <StatusDot key={s} status={s} />
  ))}
</div>
```

**Step 6: Commit**

```bash
git add components/cockpit lib/data/status.ts app/admin/_design
git commit -m "feat(cockpit): add StatusDot primitive"
```

---

### Task 1.2: Time grouping utility

**Files:**
- Create: `lib/cockpit/time-grouping.ts`
- Test: `lib/cockpit/__tests__/time-grouping.test.ts`

**Step 1: Failing test**

```ts
// lib/cockpit/__tests__/time-grouping.test.ts
import { describe, it, expect } from "vitest"
import { groupByTime, type TimeGroup } from "../time-grouping"

const now = new Date("2026-05-20T10:00:00+10:00")

describe("groupByTime", () => {
  it("buckets into TODAY/YESTERDAY/THIS_WEEK/EARLIER", () => {
    const rows = [
      { id: "a", created_at: "2026-05-20T08:00:00+10:00" },
      { id: "b", created_at: "2026-05-19T23:00:00+10:00" },
      { id: "c", created_at: "2026-05-18T12:00:00+10:00" },
      { id: "d", created_at: "2026-05-10T12:00:00+10:00" },
    ]
    const result = groupByTime(rows, "created_at", now)
    expect(result.map((g) => g.label)).toEqual(["TODAY", "YESTERDAY", "THIS WEEK", "EARLIER"])
    expect(result[0].items.map((i) => i.id)).toEqual(["a"])
    expect(result[1].items.map((i) => i.id)).toEqual(["b"])
    expect(result[2].items.map((i) => i.id)).toEqual(["c"])
    expect(result[3].items.map((i) => i.id)).toEqual(["d"])
  })

  it("omits empty groups", () => {
    const rows = [{ id: "a", created_at: "2026-05-20T08:00:00+10:00" }]
    const result = groupByTime(rows, "created_at", now)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe("TODAY")
  })

  it("preserves input order within each group", () => {
    const rows = [
      { id: "a", created_at: "2026-05-20T08:00:00+10:00" },
      { id: "b", created_at: "2026-05-20T09:00:00+10:00" },
    ]
    const result = groupByTime(rows, "created_at", now)
    expect(result[0].items.map((i) => i.id)).toEqual(["a", "b"])
  })
})
```

**Step 2: Run test**

```bash
pnpm test time-grouping --run
```

Expected: FAIL.

**Step 3: Implement**

```ts
// lib/cockpit/time-grouping.ts
export type TimeGroup<T> = {
  label: "TODAY" | "YESTERDAY" | "THIS WEEK" | "EARLIER"
  items: T[]
}

export function groupByTime<T>(
  rows: T[],
  dateField: keyof T,
  now: Date = new Date(),
): TimeGroup<T>[] {
  const today = startOfDayLocal(now)
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const buckets: Record<TimeGroup<T>["label"], T[]> = {
    TODAY: [],
    YESTERDAY: [],
    "THIS WEEK": [],
    EARLIER: [],
  }

  for (const row of rows) {
    const raw = row[dateField]
    const d = typeof raw === "string" ? new Date(raw) : raw instanceof Date ? raw : null
    if (!d) continue
    if (d >= today) buckets.TODAY.push(row)
    else if (d >= yesterday) buckets.YESTERDAY.push(row)
    else if (d >= weekStart) buckets["THIS WEEK"].push(row)
    else buckets.EARLIER.push(row)
  }

  return (Object.keys(buckets) as TimeGroup<T>["label"][])
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ label: k, items: buckets[k] }))
}

function startOfDayLocal(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
```

**Step 4: Verify**

```bash
pnpm test time-grouping --run
```

Expected: PASS.

**Step 5: Commit**

```bash
git add lib/cockpit
git commit -m "feat(cockpit): add time-grouping utility for ledger sections"
```

---

### Task 1.3: `CaseRow` component

**Files:**
- Create: `components/cockpit/case-row.tsx`
- Test: `components/cockpit/__tests__/case-row.test.tsx`
- Types: `lib/cockpit/types.ts` (create)

**Step 1: Define the row shape**

```ts
// lib/cockpit/types.ts
import type { IntakeStatus } from "@/lib/data/status"

export type CaseRowData = {
  id: string
  intakeRef: string
  patientName: string
  patientEmail?: string | null
  patientLocation?: string | null
  avatarInitials: string
  avatarUrl?: string | null
  serviceType: string
  serviceLabel: string
  serviceIcon?: string
  status: IntakeStatus
  paymentStatus?: "paid" | "failed" | "refunded" | "partially_refunded" | null
  createdAt: string
  isPriority?: boolean
  isStale?: boolean
  flags?: Array<{ label: string; tone: "warn" | "danger" | "neutral" }>
  href: string
}

export type Density = "compact" | "comfortable" | "spacious"
export const ROW_HEIGHT: Record<Density, string> = {
  compact: "h-10",
  comfortable: "h-14",
  spacious: "h-[72px]",
}
```

**Step 2: Failing test**

```tsx
// components/cockpit/__tests__/case-row.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { CaseRow } from "../case-row"
import type { CaseRowData } from "@/lib/cockpit/types"

const row: CaseRowData = {
  id: "1",
  intakeRef: "IM-20260520-C65F68",
  patientName: "Ketzia Faisey",
  patientEmail: "k.bon5308@gmail.com",
  avatarInitials: "KF",
  serviceType: "medical_certificate",
  serviceLabel: "Med cert",
  status: "approved",
  createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  href: "/admin/intakes/1",
}

describe("CaseRow", () => {
  it("renders patient name, email, ref, service, status, relative time", () => {
    render(<CaseRow row={row} density="comfortable" />)
    expect(screen.getByText("Ketzia Faisey")).toBeInTheDocument()
    expect(screen.getByText("k.bon5308@gmail.com")).toBeInTheDocument()
    expect(screen.getByText("IM-20260520-C65F68")).toBeInTheDocument()
    expect(screen.getByText("Med cert")).toBeInTheDocument()
    expect(screen.getByText("Approved")).toBeInTheDocument()
    expect(screen.getByText(/min ago/)).toBeInTheDocument()
  })

  it("renders the ref in a font-mono class", () => {
    render(<CaseRow row={row} density="comfortable" />)
    const ref = screen.getByText("IM-20260520-C65F68")
    expect(ref).toHaveClass("font-mono")
  })

  it("renders priority badge when isPriority", () => {
    render(<CaseRow row={{ ...row, isPriority: true }} density="comfortable" />)
    expect(screen.getByLabelText("Express priority")).toBeInTheDocument()
  })

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn()
    render(<CaseRow row={row} density="comfortable" onSelect={onSelect} />)
    screen.getByRole("link").click()
    expect(onSelect).toHaveBeenCalledWith(row.id)
  })

  it("respects density (compact = h-10)", () => {
    const { container } = render(<CaseRow row={row} density="compact" />)
    expect(container.firstChild).toHaveClass("h-10")
  })
})
```

**Step 3: Run test**

```bash
pnpm test case-row --run
```

Expected: FAIL.

**Step 4: Implement**

```tsx
// components/cockpit/case-row.tsx
"use client"

import Link from "next/link"
import { Bolt, AlertTriangle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusDot } from "./status-dot"
import { cn } from "@/lib/utils"
import { type CaseRowData, type Density, ROW_HEIGHT } from "@/lib/cockpit/types"
import { formatRelativeTime } from "@/lib/cockpit/relative-time"

type CaseRowProps = {
  row: CaseRowData
  density: Density
  selected?: boolean
  onSelect?: (id: string) => void
  rightSlot?: React.ReactNode
}

export function CaseRow({ row, density, selected, onSelect, rightSlot }: CaseRowProps) {
  return (
    <Link
      href={row.href}
      data-row-id={row.id}
      data-density={density}
      data-selected={selected || undefined}
      onClick={() => onSelect?.(row.id)}
      className={cn(
        "group grid items-center gap-4 px-4 transition-colors",
        "grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_140px_110px_auto]",
        "hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "data-[selected=true]:ring-1 data-[selected=true]:ring-inset data-[selected=true]:ring-primary/40",
        ROW_HEIGHT[density],
      )}
    >
      <Avatar className="h-7 w-7">
        {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-[10px] font-medium">
          {row.avatarInitials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">
          {row.patientName}
        </div>
        {row.patientEmail ? (
          <div className="truncate text-xs text-muted-foreground">
            {row.patientEmail}
          </div>
        ) : row.patientLocation ? (
          <div className="truncate text-xs text-muted-foreground">
            {row.patientLocation}
          </div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm text-foreground">{row.serviceLabel}</div>
        <div className="truncate font-mono text-xs tabular-nums text-muted-foreground">
          {row.intakeRef}
        </div>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <StatusDot status={row.status} />
        {row.isPriority ? (
          <span aria-label="Express priority" title="Express priority">
            <Bolt className="h-3.5 w-3.5 text-amber-500" />
          </span>
        ) : null}
        {row.isStale ? (
          <span aria-label="Stale > 4h" title="Stale > 4h">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </span>
        ) : null}
      </div>

      <div
        className="text-xs tabular-nums text-muted-foreground"
        title={new Date(row.createdAt).toLocaleString()}
      >
        {formatRelativeTime(row.createdAt)}
      </div>

      <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        {rightSlot}
      </div>
    </Link>
  )
}
```

Also create `lib/cockpit/relative-time.ts`:

```ts
// lib/cockpit/relative-time.ts
export function formatRelativeTime(input: string | Date, now = new Date()): string {
  const d = typeof input === "string" ? new Date(input) : input
  const diff = Math.round((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}
```

Add a quick unit test for the formatter.

**Step 5: Run test**

```bash
pnpm test case-row --run
```

Expected: PASS.

**Step 6: Add a `CaseRow` showcase to design preview**

In `/admin/_design/cases`, render 3 rows (one normal, one priority, one declined). Verify visually at `/admin/_design/cases`.

**Step 7: Commit**

```bash
git add components/cockpit lib/cockpit
git commit -m "feat(cockpit): add CaseRow primitive with density support"
```

---

### Task 1.4: `CaseTable` container

**Files:**
- Create: `components/cockpit/case-table.tsx`
- Create: `components/cockpit/case-table-header.tsx`
- Test: `components/cockpit/__tests__/case-table.test.tsx`

**Step 1: Failing test (excerpt)**

```tsx
// components/cockpit/__tests__/case-table.test.tsx
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { CaseTable } from "../case-table"

const rows = [/* 3 fixtures, see Task 1.3 */]

describe("CaseTable", () => {
  it("renders all rows", () => {
    render(<CaseTable rows={rows} density="comfortable" />)
    expect(screen.getAllByRole("link")).toHaveLength(3)
  })

  it("renders time-group headers when groupByTime prop is true", () => {
    render(<CaseTable rows={rows} density="comfortable" groupByTime />)
    expect(screen.getByText("TODAY")).toBeInTheDocument()
  })

  it("shows sortable column headers when sortable prop is true", () => {
    const onSort = vi.fn()
    render(<CaseTable rows={rows} density="comfortable" sortable onSort={onSort} />)
    fireEvent.click(screen.getByRole("button", { name: /sort by time/i }))
    expect(onSort).toHaveBeenCalledWith({ field: "createdAt", direction: "asc" })
  })

  it("renders empty state when rows is empty", () => {
    render(
      <CaseTable
        rows={[]}
        density="comfortable"
        emptyState={{ title: "All caught up", body: "Nothing to review." }}
      />,
    )
    expect(screen.getByText("All caught up")).toBeInTheDocument()
  })
})
```

**Step 2: Implement** (file-level skeleton; full code below)

```tsx
// components/cockpit/case-table.tsx
"use client"

import { CaseRow } from "./case-row"
import { CaseTableHeader, type SortField, type SortDirection } from "./case-table-header"
import { groupByTime } from "@/lib/cockpit/time-grouping"
import { cn } from "@/lib/utils"
import { type CaseRowData, type Density } from "@/lib/cockpit/types"

type CaseTableProps = {
  rows: CaseRowData[]
  density: Density
  groupByTime?: boolean
  sortable?: boolean
  sortField?: SortField
  sortDirection?: SortDirection
  onSort?: (sort: { field: SortField; direction: SortDirection }) => void
  emptyState?: { title: string; body?: string; cta?: React.ReactNode }
  rowRightSlot?: (row: CaseRowData) => React.ReactNode
}

export function CaseTable(props: CaseTableProps) {
  const { rows, density, groupByTime: doGroup, sortable, emptyState } = props
  if (rows.length === 0 && emptyState) return <EmptyState {...emptyState} />
  const groups = doGroup ? groupByTime(rows, "createdAt") : [{ label: null, items: rows }]
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {sortable ? (
        <CaseTableHeader {...props} />
      ) : null}
      <div className="divide-y divide-border/40">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.label ? (
              <div className="px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground bg-background/40">
                {group.label} <span className="ml-1 text-muted-foreground/60">({group.items.length})</span>
              </div>
            ) : null}
            <div className="divide-y divide-border/30">
              {group.items.map((row) => (
                <CaseRow
                  key={row.id}
                  row={row}
                  density={density}
                  rightSlot={props.rowRightSlot?.(row)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState({ title, body, cta }: { title: string; body?: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/50 py-16 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-emerald-50 grid place-items-center mb-4">
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-emerald-600"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {body ? <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{body}</p> : null}
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  )
}
```

`CaseTableHeader` is a simple grid of buttons with chevron indicators. Field set: `patient`, `service`, `status`, `createdAt`.

**Step 3: Run tests**

```bash
pnpm test case-table --run
```

Expected: PASS.

**Step 4: Update design preview**

Render a `<CaseTable>` with 8 fixtures, group-by-time enabled, sortable headers, and an empty-state variant.

**Step 5: Commit**

```bash
git add components/cockpit
git commit -m "feat(cockpit): add CaseTable container with grouping and sort"
```

---

### Task 1.5: Density toggle (localStorage-persisted)

**Files:**
- Create: `lib/cockpit/use-density.ts`
- Create: `components/cockpit/density-toggle.tsx`
- Test: `lib/cockpit/__tests__/use-density.test.ts`

**Step 1: Failing test**

```ts
// lib/cockpit/__tests__/use-density.test.ts
import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDensity } from "../use-density"

describe("useDensity", () => {
  beforeEach(() => localStorage.clear())

  it("defaults to comfortable", () => {
    const { result } = renderHook(() => useDensity())
    expect(result.current[0]).toBe("comfortable")
  })

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useDensity())
    act(() => result.current[1]("compact"))
    expect(localStorage.getItem("cockpit_density")).toBe("compact")
  })

  it("reads from localStorage on init", () => {
    localStorage.setItem("cockpit_density", "spacious")
    const { result } = renderHook(() => useDensity())
    expect(result.current[0]).toBe("spacious")
  })
})
```

**Step 2: Implement**

```ts
// lib/cockpit/use-density.ts
"use client"

import { useEffect, useState } from "react"
import type { Density } from "./types"

const KEY = "cockpit_density"

export function useDensity(): [Density, (d: Density) => void] {
  const [density, setDensity] = useState<Density>("comfortable")

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as Density | null
    if (stored && ["compact", "comfortable", "spacious"].includes(stored)) {
      setDensity(stored)
    }
  }, [])

  const update = (d: Density) => {
    setDensity(d)
    try {
      localStorage.setItem(KEY, d)
    } catch {
      /* private mode */
    }
  }

  return [density, update]
}
```

```tsx
// components/cockpit/density-toggle.tsx
"use client"

import { Rows2, Rows3, Rows4 } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Density } from "@/lib/cockpit/types"

export function DensityToggle({
  value,
  onValueChange,
}: {
  value: Density
  onValueChange: (d: Density) => void
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as Density)}
      className="h-8"
      aria-label="Row density"
    >
      <ToggleGroupItem value="compact" aria-label="Compact"><Rows4 className="h-3.5 w-3.5" /></ToggleGroupItem>
      <ToggleGroupItem value="comfortable" aria-label="Comfortable"><Rows3 className="h-3.5 w-3.5" /></ToggleGroupItem>
      <ToggleGroupItem value="spacious" aria-label="Spacious"><Rows2 className="h-3.5 w-3.5" /></ToggleGroupItem>
    </ToggleGroup>
  )
}
```

**Step 3: Verify tests pass**

```bash
pnpm test use-density --run
```

**Step 4: Add to design preview**, allow toggling density on the `<CaseTable>` above.

**Step 5: Commit**

```bash
git add components/cockpit lib/cockpit
git commit -m "feat(cockpit): add density toggle hook and component"
```

---

### Task 1.6: `FilterBar` component

**Files:**
- Create: `components/cockpit/filter-bar.tsx`
- Create: `components/cockpit/quick-filter-chip.tsx`
- Create: `components/cockpit/saved-view-tabs.tsx`
- Test: `components/cockpit/__tests__/filter-bar.test.tsx`

**Step 1: Failing test**

Cover: chips render, chip toggle state callback fires, search input fires callback, saved-view tabs render when provided.

**Step 2: Implement** — three sub-components, composed by `FilterBar`. Use existing `Input` from `@/components/ui/input` for the search field. Chips are small ghost buttons with toggled coral border + bg when active. Saved-view tabs use the existing `Tabs` primitive.

**Step 3: Run tests, commit**

```bash
git add components/cockpit
git commit -m "feat(cockpit): add FilterBar, QuickFilterChip, SavedViewTabs"
```

---

### Task 1.7: `HoverActions` component

**Files:**
- Create: `components/cockpit/hover-actions.tsx`
- Test: `components/cockpit/__tests__/hover-actions.test.tsx`

**Step 1: Failing test**

Cover: renders buttons in given order, each has a tooltip with keyboard hint, supports keyboard activation, supports Cmd+click to open slide-over.

**Step 2: Implement** — ghost-button cluster with `Tooltip` wrapper around each button. Keyboard hint shown in tooltip body.

**Step 3: Commit**

```bash
git add components/cockpit
git commit -m "feat(cockpit): add HoverActions cluster"
```

---

### Task 1.8: Phase 1 visual review

**Step 1:** Run dev server, open `/admin/_design/cases`.

**Step 2:** Invoke `@impeccable` skill on the design preview page for a full audit pass.

**Step 3:** Invoke `@emil-design-eng` skill for motion review (row hover, density transition, chip toggle).

**Step 4:** Apply any P0 or P1 fixes recommended.

**Step 5:** Commit any fixes.

```bash
git commit -m "polish(cockpit): apply impeccable + emil-design-eng audit fixes"
```

---

## Phase 2: Ledger refactor (Days 3-5)

### Task 2.1: Fix the ORDER BY bug (TDD)

**Files:**
- Modify: `lib/data/intakes/queries.ts:597-634` (`getAllIntakesForAdmin`)
- Test: `lib/data/intakes/__tests__/get-all-intakes-admin-sort.test.ts`

**Step 1: Failing test**

```ts
// lib/data/intakes/__tests__/get-all-intakes-admin-sort.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const orderSpy = vi.fn().mockReturnThis()
const selectSpy = vi.fn(() => ({ order: orderSpy, range: vi.fn().mockResolvedValue({ data: [], count: 0 }) }))

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: () => ({ select: selectSpy }),
  }),
}))

describe("getAllIntakesForAdmin sort", () => {
  beforeEach(() => orderSpy.mockClear())

  it("orders by created_at DESC by default", async () => {
    const { getAllIntakesForAdmin } = await import("../queries")
    await getAllIntakesForAdmin({ page: 0, pageSize: 25 })
    expect(orderSpy).toHaveBeenCalledWith("created_at", { ascending: false })
  })

  it("respects orderBy and direction args", async () => {
    const { getAllIntakesForAdmin } = await import("../queries")
    await getAllIntakesForAdmin({
      page: 0,
      pageSize: 25,
      orderBy: "submitted_at",
      direction: "asc",
    })
    expect(orderSpy).toHaveBeenCalledWith("submitted_at", { ascending: true })
  })
})
```

**Step 2: Run test**

```bash
pnpm test get-all-intakes-admin-sort --run
```

Expected: FAIL — no `.order()` is called today.

**Step 3: Fix `getAllIntakesForAdmin`**

In `lib/data/intakes/queries.ts`, locate `getAllIntakesForAdmin` (line 555). Add to the args type:

```ts
type GetAllIntakesForAdminArgs = {
  page: number
  pageSize: number
  dateFrom?: string
  dateTo?: string
  status?: IntakeStatus[]
  orderBy?: "created_at" | "submitted_at" | "paid_at" | "status"
  direction?: "asc" | "desc"
  assignedTo?: string
  staleSeconds?: number
  paymentStatus?: Array<"paid" | "failed" | "refunded" | "partially_refunded">
}
```

Add to query builder, before `.range(...)`:

```ts
const sortField = args.orderBy ?? "created_at"
const ascending = (args.direction ?? "desc") === "asc"
query = query.order(sortField, { ascending })
```

Optional filters (only apply when present):

```ts
if (args.assignedTo) query = query.eq("claimed_by", args.assignedTo)
if (args.paymentStatus?.length) query = query.in("payment_status", args.paymentStatus)
if (args.staleSeconds) {
  const cutoff = new Date(Date.now() - args.staleSeconds * 1000).toISOString()
  query = query.lt("updated_at", cutoff)
}
```

**Step 4: Run test**

```bash
pnpm test get-all-intakes-admin-sort --run
```

Expected: PASS.

**Step 5: Verify nothing else regressed**

```bash
pnpm test lib/data/intakes --run
```

Expected: all pass.

**Step 6: Commit**

```bash
git add lib/data/intakes
git commit -m "fix(ledger): default-sort intakes by created_at DESC and accept orderBy args"
```

This single commit is the most important user-visible win of the project. Tag it in the PR description.

---

### Task 2.2: URL state schema for sort + filter

**Files:**
- Create: `lib/cockpit/url-state.ts`
- Test: `lib/cockpit/__tests__/url-state.test.ts`

**Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest"
import { parseCockpitUrlState, serializeCockpitUrlState } from "../url-state"

describe("parseCockpitUrlState", () => {
  it("parses ?sort=created_at:desc&filter=stale,mine", () => {
    const sp = new URLSearchParams("sort=created_at:desc&filter=stale,mine")
    expect(parseCockpitUrlState(sp)).toEqual({
      sort: { field: "created_at", direction: "desc" },
      filters: ["stale", "mine"],
      view: null,
      q: null,
    })
  })

  it("ignores unknown sort fields", () => {
    const sp = new URLSearchParams("sort=email:asc")
    expect(parseCockpitUrlState(sp).sort).toBe(null)
  })
})

describe("serializeCockpitUrlState", () => {
  it("roundtrips", () => {
    const state = {
      sort: { field: "created_at" as const, direction: "desc" as const },
      filters: ["stale", "mine"],
      view: "stuck",
      q: "ed",
    }
    const serialized = serializeCockpitUrlState(state)
    expect(parseCockpitUrlState(new URLSearchParams(serialized))).toEqual(state)
  })
})
```

**Step 2: Implement** parser and serializer with allow-listed sort fields and filter keys.

**Step 3: Run tests, commit**

```bash
git commit -m "feat(cockpit): url-state parser for sort, filters, view, search"
```

---

### Task 2.3: Search syntax parser

**Files:**
- Create: `lib/cockpit/search-syntax.ts`
- Test: `lib/cockpit/__tests__/search-syntax.test.ts`

**Step 1: Failing test**

```ts
import { parseSearchSyntax } from "../search-syntax"

describe("parseSearchSyntax", () => {
  it("parses status:approved", () => {
    expect(parseSearchSyntax("status:approved")).toEqual({
      filters: { status: ["approved"] },
      text: "",
    })
  })

  it("supports multiple values", () => {
    expect(parseSearchSyntax("status:approved,declined")).toEqual({
      filters: { status: ["approved", "declined"] },
      text: "",
    })
  })

  it("preserves free-text and recognised keys", () => {
    expect(parseSearchSyntax("status:approved service:cert najjar")).toEqual({
      filters: { status: ["approved"], service: ["cert"] },
      text: "najjar",
    })
  })

  it("ignores unknown keys (falls back to text)", () => {
    expect(parseSearchSyntax("foo:bar baz")).toEqual({
      filters: {},
      text: "foo:bar baz",
    })
  })
})
```

**Step 2: Implement.** Recognised keys: `status`, `service`, `payment`, `from`, `to`, `assignee`. Everything else becomes free text.

**Step 3: Run tests, commit**

```bash
git commit -m "feat(cockpit): search syntax parser"
```

---

### Task 2.4: Rebuild `AdminIntakesLedgerClient` to use new primitives

**Files:**
- Modify: `app/admin/intakes/intakes-ledger-client.tsx` (full rewrite behind feature flag)
- Keep: `app/admin/intakes/page.tsx` (entry stays, but reads flag and chooses client)
- Create: `app/admin/intakes/ledger-v2-client.tsx`
- Modify: `app/admin/intakes/page.tsx`

**Step 1:** Add a new client `ledger-v2-client.tsx` consuming `CaseTable`, `FilterBar`, `DensityToggle`. Mount the existing `AdminIntakesLedgerClient` as fallback.

**Step 2:** In `page.tsx`, read `cockpit_v2` flag from server. If on, render `LedgerV2Client`; otherwise legacy.

```tsx
// app/admin/intakes/page.tsx (excerpt)
import { isFeatureEnabled } from "@/lib/feature-flags"

const cockpitV2 = await isFeatureEnabled("cockpit_v2")
return cockpitV2 ? (
  <LedgerV2Client initialIntakes={data.data} initialState={initialState} />
) : (
  <AdminIntakesLedgerClient {...legacyProps} />
)
```

**Step 3:** Implement `LedgerV2Client` composition:

```
FilterBar (saved-view tabs hidden if none + search + density toggle + quick chips)
  ↓
CaseTable (sortable + groupByTime)
  ↓
Floating action bar (rendered only when selection.size > 0)
```

State management via `useState` + `useSearchParams`. Sort + filters + search all serialize to URL.

**Step 4:** Reuse `getAllIntakesForAdmin` from Task 2.1 — pass sort + filter args derived from URL state.

**Step 5: Manual verify**

Enable flag in DB, navigate to `/admin/intakes`. Verify default sort is `created_at DESC` (most recent first), headers click to re-sort.

**Step 6: Commit**

```bash
git add app/admin/intakes lib/cockpit
git commit -m "feat(ledger): rebuild ledger behind cockpit_v2 with sortable, time-grouped, filterable CaseTable"
```

---

### Task 2.5: Bulk select + floating action bar

**Files:**
- Create: `components/cockpit/selection-context.tsx`
- Create: `components/cockpit/bulk-action-bar.tsx`
- Modify: `components/cockpit/case-row.tsx` (add checkbox slot)
- Modify: `app/admin/intakes/ledger-v2-client.tsx`
- Test: `components/cockpit/__tests__/bulk-selection.test.tsx`

**Step 1: Failing test**

Cover: clicking a row checkbox toggles selection, shift-click selects range, floating action bar appears only when selection > 0, count badge correct.

**Step 2: Implement** as React Context with `selectedIds: Set<string>`, `lastClickedId: string | null` for shift-click logic.

**Step 3: Bulk action bar** floats bottom-right with `position: fixed`. Buttons: Decline (TypedConfirmDialog), Assign (Select), Export, Clear. Uses `@/components/ui/typed-confirm-dialog`.

**Step 4: Commit**

```bash
git commit -m "feat(ledger): bulk select with floating action bar and TypedConfirmDialog"
```

---

### Task 2.6: Real-time `+N new` poll

**Files:**
- Create: `app/api/admin/intakes/since/route.ts`
- Create: `lib/cockpit/use-new-since.ts`
- Create: `components/cockpit/new-items-pill.tsx`
- Test: `app/api/admin/intakes/since/__tests__/route.test.ts`

**Step 1: Endpoint**

```ts
// app/api/admin/intakes/since/route.ts
import { NextResponse } from "next/server"
import { requireRoleOrNull } from "@/lib/auth/require-role"
import { createServerServiceRoleClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const user = await requireRoleOrNull(["admin", "doctor"])
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const since = url.searchParams.get("since")
  if (!since) return NextResponse.json({ count: 0, latestCreatedAt: null })

  const supabase = createServerServiceRoleClient()
  const { count, data } = await supabase
    .from("intakes")
    .select("created_at", { count: "exact", head: false })
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)

  return NextResponse.json({
    count: count ?? 0,
    latestCreatedAt: data?.[0]?.created_at ?? null,
  })
}
```

**Step 2: Hook**

```ts
// lib/cockpit/use-new-since.ts
export function useNewSince(since: string | null, intervalMs = 30_000) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!since) return
    let cancelled = false
    const fetcher = async () => {
      const r = await fetch(`/api/admin/intakes/since?since=${encodeURIComponent(since)}`)
      if (cancelled) return
      const j = await r.json()
      setCount(j.count ?? 0)
    }
    fetcher()
    const id = setInterval(fetcher, intervalMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [since, intervalMs])
  return count
}
```

**Step 3: Pill component** uses Framer Motion spring entry; respects `useReducedMotion()`.

**Step 4: Wire into `LedgerV2Client`** — sticky at top, click to reload.

**Step 5: Commit**

```bash
git commit -m "feat(ledger): +N new pill with 30s poll endpoint"
```

---

### Task 2.7: Phase 2 verification + commit-push

**Step 1:** Run `pnpm typecheck` and `pnpm test --run`. All green.

**Step 2:** Run E2E focused suite:

```bash
PLAYWRIGHT=1 playwright test e2e/admin.ops-index.spec.ts e2e/doctor.queue.spec.ts
```

Expected: pass.

**Step 3:** Invoke `@audit` skill on `/admin/intakes` (cockpit_v2 flag on).

**Step 4:** Apply fixes, commit.

**Step 5:** Open PR for review (do not merge yet — staged commits inside branch).

---

## Phase 3: Admin dashboard (Day 6)

### Task 3.1: KPI strip component

**Files:**
- Create: `components/cockpit/kpi-strip.tsx`
- Create: `components/cockpit/kpi-tile.tsx`
- Create: `lib/dashboard/today-kpis.ts`
- Test: `components/cockpit/__tests__/kpi-strip.test.tsx`
- Test: `lib/dashboard/__tests__/today-kpis.test.ts`

**Step 1:** `getTodayKpis()` returns `{ revenue, queueDepth, slaMedianSeconds, slaTone, todayVolume }`. Aggregates from `payments`, `intakes`, and `getDoctorQueue()`.

**Step 2:** `KpiTile` renders label + value + optional secondary line + color dot. `KpiStrip` is 4 tiles in a row, click-to-filter (passes a query string to parent).

**Step 3:** Wire to admin dashboard only (Doctor and Support do not see this).

**Step 4: Commit**

```bash
git commit -m "feat(cockpit): KPI strip for admin dashboard"
```

---

### Task 3.2: Three-zone admin dashboard layout

**Files:**
- Create: `app/dashboard/admin-cockpit-v2.tsx`
- Modify: `app/dashboard/page.tsx`

**Step 1:** New client component `AdminCockpitV2` renders:

```
<KpiStrip />
<div className="grid grid-cols-[1fr_320px] gap-4 mt-4">
  <CaseTable rows={queueRows} sortable={false} groupByTime={false} />
  <SideRail>
    <OpenNextCaseCard />
    <SystemHealthBlock />
    <MyTodayBlock />
  </SideRail>
</div>
```

`SideRail` is a stacked column of cards. `OpenNextCaseCard` consumes existing "Open next case" logic.

**Step 2:** In `app/dashboard/page.tsx`, switch on `cockpit_v2` flag AND `profile.role === "admin"`. If true, render `AdminCockpitV2`; else fall through to existing `QueueClient`.

**Step 3:** Dismissible setup cards behaviour: localStorage key `cockpit_setup_dismissed`. Once dismissed, show a small "Setup: 3 of 4" pill in the header.

**Step 4: Manual verify**

Sign in as admin, open `/dashboard`. Verify the new layout. Click each KPI tile, confirm filter applies to the case table.

**Step 5: Commit**

```bash
git commit -m "feat(cockpit): admin three-zone dashboard with KPI strip, side rail, dismissible setup"
```

---

## Phase 4: Doctor dashboard (Day 7)

### Task 4.1: Doctor variant of cockpit

**Files:**
- Create: `app/dashboard/doctor-cockpit-v2.tsx`
- Modify: `app/dashboard/page.tsx`

**Step 1:** `DoctorCockpitV2` is admin minus the KPI strip, minus system health detail, minus setup cards. Includes:

- Availability toggle (existing)
- `<CaseTable>` of the doctor's queue
- Side rail with `OpenNextCaseCard` and `MyTodayBlock` only

**Step 2:** Smart empty state. Compose one of three messages:

```ts
function emptyMessage(ctx: {
  availability: "available" | "paused"
  todayCount: number
  todayAvgMinutes: number
  minutesSinceLastClear: number | null
}): { title: string; body: string }
```

- paused → `"Availability paused"`, body `"Resume to receive cases."`
- todayCount > 0 → `"All caught up"`, body `"You reviewed N today (avg Xm). Last cleared Ym ago."`
- todayCount === 0 → `"Quiet morning"`, body `"0 new in the last 2h. You're on call."`

**Step 3:** Switch in `app/dashboard/page.tsx` based on role.

**Step 4:** Manual verify as doctor.

**Step 5: Commit**

```bash
git commit -m "feat(cockpit): doctor-focused cockpit v2 with smart empty state"
```

---

## Phase 5: Support dashboard (Day 8)

### Task 5.1: PHI masking utility

**Files:**
- Create: `lib/cockpit/phi-mask.ts`
- Test: `lib/cockpit/__tests__/phi-mask.test.ts`

**Step 1: Failing test**

```ts
import { maskName, maskPhone, maskEmail } from "../phi-mask"

describe("PHI masking", () => {
  it("masks names to initials + asterisks", () => {
    expect(maskName("Reabal Najjar")).toBe("R*** N****")
  })
  it("masks phone to last 4 digits", () => {
    expect(maskPhone("0450722549")).toBe("******2549")
  })
  it("masks email username before @", () => {
    expect(maskEmail("me@reabal.ai")).toBe("m*@reabal.ai")
  })
})
```

**Step 2: Implement, run, commit**

```bash
git commit -m "feat(cockpit): PHI masking utilities for support views"
```

---

### Task 5.2: Recovery counter card + recent list

**Files:**
- Create: `components/cockpit/recovery-counter.tsx`
- Create: `components/cockpit/recovery-row.tsx`
- Create: `app/admin/ops/ops-cockpit-v2.tsx`
- Modify: `app/admin/ops/page.tsx`
- Create: `lib/dashboard/recovery-snapshot.ts`

**Step 1:** `getRecoverySnapshot()` returns counts for:

- payment failures (intakes where `payment_status = "failed"` in last 24h)
- webhook DLQ (existing endpoint)
- parchment sync failures (existing helper)
- missing prescribing identity (existing helper)

**Step 2:** `RecoveryCounter` card: large number, label, secondary stale flag.

**Step 3:** `RecoveryRow`: uses `<CaseRow>` shape but with masked PHI via `maskName`, `maskPhone`. Status pill replaced with a "Why" reason (e.g. "Stripe declined: insufficient funds").

**Step 4:** `OpsCockpitV2` composes 4 counter cards + "Recent (last 24h)" list. Empty state: "Nothing to recover. All systems clear."

**Step 5:** In `app/admin/ops/page.tsx`, flag-switch between legacy and v2.

**Step 6: Manual verify as support user**

Create test support user. Sign in. Confirm `/dashboard` redirects to `/admin/ops`. Confirm only the support cockpit renders. Confirm no approve/decline buttons. Confirm PHI is masked.

**Step 7: Commit**

```bash
git commit -m "feat(cockpit): support ops cockpit with counter cards, masked PHI, recovery list"
```

---

## Phase 6: People page (Day 9)

### Task 6.1: `NeedsAttentionGroup` component

**Files:**
- Create: `components/cockpit/needs-attention-group.tsx`
- Create: `lib/dashboard/needs-attention.ts`
- Test: `lib/dashboard/__tests__/needs-attention.test.ts`

**Step 1:** `getNeedsAttention()` returns patients with: failed payment OR stale > 24h OR parchment unsynced OR duplicate flag. Returns `Array<{ patientId, name, reasons: Array<"payment"|"stale"|"parchment"|"duplicate"> }>`.

**Step 2:** Component renders only when array is non-empty. Each row has a chip per reason and a primary CTA per reason type.

**Step 3:** Commit.

---

### Task 6.2: Reskin patients page to `CaseTable`

**Files:**
- Create: `app/admin/patients/patients-cockpit-v2.tsx`
- Modify: `app/admin/patients/page.tsx`

**Step 1:** Flag-switch the page to the v2 client. New client renders `NeedsAttentionGroup` above a `<CaseTable>` of patients.

**Step 2:** Map `Patient` to `CaseRowData`: `intakeRef` = `lastIntakeRef`, `serviceLabel` = last service, `status` = patient activity status (`profile_partial` etc).

**Step 3:** Card view alternate. Toggle in `FilterBar`. Cards: 280px wide, 120px tall, avatar + name + last activity.

**Step 4:** Manual verify, commit.

---

## Phase 7: Polish + ship (Day 10)

### Task 7.1: Accessibility audit (`@audit`)

**Step 1:** Invoke `@audit` skill on `/admin/intakes`, `/dashboard` (admin and doctor variants), `/admin/ops`, `/admin/patients`.

**Step 2:** Apply all P0 and P1 fixes. Common ones likely:

- Sortable headers need `aria-sort`
- Status dots need `aria-label` on the dot + role on the parent
- Bulk action bar needs `role="region"` and `aria-label="N selected"`
- Floating `+N new` pill needs `aria-live="polite"`
- Density toggle needs `aria-label` and the active value announced

**Step 3:** Re-run audit. Confirm WCAG AA pass.

**Step 4: Commit**

```bash
git commit -m "polish(cockpit): WCAG AA fixes from audit pass"
```

---

### Task 7.2: Motion review (`@emil-design-eng`)

**Step 1:** Invoke `@emil-design-eng` on every animated component: row hover, density transition, chip toggle, `+N new` pill spring, bulk action bar entry, time-group expand/collapse.

**Step 2:** Apply `| Before | After | Why |` spring physics fixes. Defaults to avoid:

- Linear easing on density transition (use cubic-bezier(0.2, 0.8, 0.2, 1))
- Spring stiffness 100/damping 10 (Framer default) feels mechanical — use stiffness 180/damping 22

**Step 3:** Commit.

---

### Task 7.3: Performance check (`@optimize`)

**Step 1:** Invoke `@optimize` on `/admin/intakes` (the heaviest surface).

**Step 2:** Likely findings:

- `CaseRow` re-renders on every sibling hover — wrap in `React.memo`
- `CaseTable` recomputes groups on every render — `useMemo` on group output
- Real-time poll triggers re-render — split into separate component so only the pill re-renders

**Step 3:** Apply fixes, commit.

---

### Task 7.4: Dark mode parity

**Step 1:** Toggle dark mode on each surface. Verify:

- `--hover-row-bg` reads as a dark shade
- `--selected-ring` is visible against dark backgrounds
- Status dots are visible against dark backgrounds
- Empty-state icon background reads correctly

**Step 2:** Apply Tailwind `dark:` variants. Commit.

---

### Task 7.5: Final polish (`@polish`)

**Step 1:** Invoke `@polish` skill on every cockpit surface.

**Step 2:** Apply alignment, spacing, focus-ring fixes. Commit.

---

### Task 7.6: E2E suite

**Files:**
- Modify or add: `e2e/cockpit-v2.spec.ts`

Tests:

1. Default sort is `created_at DESC` (asserts row order on `/admin/intakes`).
2. Click `created_at` header twice and verify ascending order.
3. Toggle density to compact, verify row height changes, reload, verify persisted.
4. Apply `Stale > 4h` chip, verify URL updates and rows filter.
5. Save a view via the `+` button, verify it appears as a tab on reload.
6. Shift-click two rows, bulk action bar appears, declining requires typed confirmation.
7. Doctor sees no KPI strip, no system health detail, no setup cards.
8. Support is redirected from `/dashboard` to `/admin/ops`.
9. Support cannot see approve / decline buttons anywhere.
10. Support sees PHI masked (`R*** N****`).

**Step 1:** Add to e2e suite, run locally, fix flakiness, commit.

```bash
git commit -m "test(cockpit): e2e coverage for sort, density, filters, role boundaries"
```

---

### Task 7.7: Documentation updates

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md` (auto-synced from CLAUDE.md)
- Modify: `docs/ARCHITECTURE.md`
- Modify: `DESIGN.md` (new tokens)

**Step 1:** CLAUDE.md additions:

- Under "Staff cockpit shell" gotcha: note `<CaseRow>` / `<CaseTable>` are canonical list primitives.
- New gotcha: **"Default sort is `created_at DESC` everywhere. Never ship a `getAll*` query without an explicit `.order()` clause."**
- Under "Staff dashboard": note `cockpit_v2` flag and the three role-aware compositions.

**Step 2:** Run sync:

```bash
bash scripts/sync-agent-doc.sh
```

Expected: AGENTS.md updated. Commit both.

**Step 3:** DESIGN.md: add new CSS tokens (`--row-*`, `--status-dot`, `--ledger-group-gap`).

**Step 4: Commit**

```bash
git commit -m "docs(cockpit): update CLAUDE.md, AGENTS.md, DESIGN.md for cockpit v2"
```

---

### Task 7.8: Ship behind flag

**Step 1:** Confirm `cockpit_v2` flag is **default false** in `lib/feature-flags.ts`.

**Step 2:** Enable flag for admin in DB only:

```sql
update feature_flags set value = 'true' where key = 'cockpit_v2_admin_only';
```

(Use the existing `feature_flags` DB table.)

**Step 3:** Final smoke pass at `/dashboard`, `/admin/intakes`, `/admin/ops`, `/admin/patients`.

**Step 4:** Open PR with:

- Title: `feat(cockpit): role-aware staff cockpit v2 (admin, doctor, support)`
- Body links to the design doc and this plan.
- Test plan checklist.

**Step 5:** Code review via `@superpowers:requesting-code-review`.

**Step 6:** Merge after review approval.

**Step 7:** Monitor production for 48 hours with Sentry + PostHog dashboards filtered to `cockpit_v2:true`.

**Step 8:** Once stable, flip default to `true` in `lib/feature-flags.ts` and remove the legacy clients in a follow-up PR.

---

## Verification gates (per phase)

After each phase, before moving to the next:

1. `pnpm typecheck` — green
2. `pnpm test --run` — green
3. `pnpm lint` — zero warnings
4. Manual visual check at the surface(s) modified
5. Invoke `@superpowers:verification-before-completion` to confirm evidence before claiming completion

---

## What is explicitly NOT in this plan

- Patient profile page redesign
- Intake case detail page redesign
- Med cert PDF flow changes
- Prescribing workflow changes
- New analytics/charting
- Mobile-specific work beyond responsive table collapse
- DB-backed saved views (deferred to v2 after URL-state usage data)
- Supabase realtime subscriptions (poll is sufficient)
- Column resize, column reorder, board view, timeline view
- TanStack Table migration
- Cross-cutting Tailwind/Framer Motion upgrades

These come in the four follow-on cycles.

---

## Skill references

- `@superpowers:test-driven-development` — every component task
- `@superpowers:verification-before-completion` — before marking any task done
- `@superpowers:subagent-driven-development` — dispatching task execution
- `@superpowers:requesting-code-review` — Phase 7 ship
- `@impeccable` — Phase 1 + Phase 7 visual reviews
- `@emil-design-eng` — Phase 1 + Phase 7 motion reviews
- `@audit` — Phase 7 accessibility
- `@optimize` — Phase 7 performance
- `@polish` — Phase 7 final pass
- `@clarify` — any copy changes inside the work (empty states, tooltips, dialog text)

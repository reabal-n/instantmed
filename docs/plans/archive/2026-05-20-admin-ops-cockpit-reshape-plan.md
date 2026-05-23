# /admin/ops Cockpit Reshape Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 9-block `/admin/ops` surface with two scannable blocks (4 counter cards + recent recoveries list), drop 12 unused parallel queries, retire colored-background StatusPill chrome, unify admin and support views.

**Architecture:** Server component fetches 9 categories of failure data via the existing `buildOperationalFailureOverview` helper. Client renders a fixed 2-block layout using new `CounterCard` and `RecoveryRow` primitives. Counter card clicks deep-link to the ledger or workshop page. Recent list rows are themselves the link. Identical view for admin and support; gating happens at `requireRole(["admin", "support"])` only.

**Tech Stack:** Next.js 15.5 App Router · React 18.3 · Tailwind v4 · Vitest (jsdom for `.tsx` tests, node for `.ts` tests) · Playwright E2E.

**Design source:** [docs/plans/2026-05-20-admin-ops-cockpit-reshape-design.md](2026-05-20-admin-ops-cockpit-reshape-design.md).

**Refinements from the design doc:**

1. **No PHI on recovery rows.** The design doc specified `maskPatientName()` for support and raw names for admin. While planning I concluded that severity + category title + diagnostic detail + time + click-through give support everything they need to triage, and showing patient names on every row adds PHI surface area for zero workflow gain. The recovery row therefore consumes `OperationalFailureItem` directly with no patient join. No `mask-phi.ts` utility, no `Recovery` builder file.
2. **One client view for both roles.** No `supportMode` / `maskPhi` prop. The page is identical for admin and support; role gating happens once via `requireRole(["admin", "support"])`.
3. **`buildOperationalFailureOverview` gets a minor type relaxation.** `incompleteRequests` becomes optional because we no longer pass it.

**Out of scope (do not touch):** Stripe price config banner relocation, Telegram alert config banner relocation, auth-email health relocation, refund logic, `OperatorShell`, `OperatorPageHeader`, staff navigation, sub-workshop pages (`/admin/ops/parchment`, `/admin/ops/prescribing-identity`, etc.), `/admin/intakes`, `/admin/patients`, `/dashboard`.

---

### Task 1: CounterCard primitive (TDD)

**Files:**
- Create: `components/operator/counter-card.tsx`
- Create: `lib/__tests__/cockpit-counter-card.test.tsx`
- Modify: `components/operator/index.ts:9` (add export after `StatusDot,`)

**Step 1: Write the failing test**

```tsx
// lib/__tests__/cockpit-counter-card.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CounterCard } from "@/components/operator/counter-card"

describe("CounterCard", () => {
  it("renders count, label, and helper text", () => {
    render(<CounterCard count={3} label="Payment failures" helperText="1 stale" tone="critical" />)
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Payment failures")).toBeInTheDocument()
    expect(screen.getByText("1 stale")).toBeInTheDocument()
  })

  it("exposes tone via data-tone for the calm-chrome test", () => {
    render(<CounterCard count={0} label="Webhook DLQ" helperText="All clear" tone="neutral" />)
    expect(screen.getByTestId("counter-card").dataset.tone).toBe("neutral")
  })

  it("wraps in a link when href is provided", () => {
    render(<CounterCard count={1} label="Test" helperText="x" tone="warning" href="/admin/x" />)
    const card = screen.getByTestId("counter-card")
    expect(card.tagName).toBe("A")
    expect(card.getAttribute("href")).toBe("/admin/x")
  })

  it("renders as a div when no href is provided", () => {
    render(<CounterCard count={1} label="Test" helperText="x" tone="warning" />)
    expect(screen.getByTestId("counter-card").tagName).toBe("DIV")
  })

  it("uses no colored backgrounds on routine status (calm-chrome contract)", () => {
    const { container } = render(
      <CounterCard count={2} label="X" helperText="y" tone="warning" />
    )
    const html = container.innerHTML
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky)-(50|100)/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/cockpit-counter-card.test.tsx`
Expected: FAIL with `Cannot find module '@/components/operator/counter-card'`.

**Step 3: Write minimal implementation**

```tsx
// components/operator/counter-card.tsx
import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type CounterCardTone = "neutral" | "warning" | "critical"

const TONE_DOT: Record<CounterCardTone, string> = {
  neutral: "bg-slate-400",
  warning: "bg-amber-500",
  critical: "bg-red-500",
}

const TONE_BORDER: Record<CounterCardTone, string> = {
  neutral: "border-border/50",
  warning: "border-amber-200/60 dark:border-amber-500/30",
  critical: "border-red-200/60 dark:border-red-500/30",
}

type CounterCardProps = {
  count: number
  label: string
  helperText: string
  tone: CounterCardTone
  href?: string
  className?: string
}

export function CounterCard({
  count,
  label,
  helperText,
  tone,
  href,
  className,
}: CounterCardProps) {
  const inner: ReactNode = (
    <>
      <div className="text-3xl font-semibold tabular-nums text-foreground">{count}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span
          aria-hidden="true"
          className={cn(
            "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
            TONE_DOT[tone],
          )}
        />
        <span>{helperText}</span>
      </div>
    </>
  )

  const baseClass = cn(
    "flex min-h-[140px] flex-col rounded-xl border bg-card p-4 shadow-sm shadow-primary/[0.04] transition-colors",
    TONE_BORDER[tone],
    href && "hover:border-primary/30 hover:bg-accent/30",
    className,
  )

  if (href) {
    return (
      <Link
        href={href}
        data-testid="counter-card"
        data-tone={tone}
        className={baseClass}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div data-testid="counter-card" data-tone={tone} className={baseClass}>
      {inner}
    </div>
  )
}
```

**Step 4: Export from the operator barrel**

Modify `components/operator/index.ts` — add after line 9 (after the `StatusDot,` line in the `./cases` export block, add a separate export):

```ts
export { CounterCard, type CounterCardTone } from "./counter-card"
```

**Step 5: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/cockpit-counter-card.test.tsx`
Expected: PASS, 5/5 tests green.

**Step 6: Commit**

```bash
git add components/operator/counter-card.tsx components/operator/index.ts lib/__tests__/cockpit-counter-card.test.tsx
git commit -m "$(cat <<'EOF'
feat(cockpit): CounterCard primitive

Generic counter tile for the operator cockpit. Number, label, helper
text, semantic dot tone (neutral/warning/critical), optional href.
Calm-chrome compliant: no colored backgrounds on routine status.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: RecoveryRow primitive (TDD)

**Files:**
- Create: `components/operator/cases/recovery-row.tsx`
- Create: `lib/__tests__/cockpit-recovery-row.test.tsx`
- Modify: `components/operator/cases/index.ts:6` (add export after `StatusDot`)
- Modify: `components/operator/index.ts` (re-export RecoveryRow from `./cases`)

**Step 1: Write the failing test**

```tsx
// lib/__tests__/cockpit-recovery-row.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RecoveryRow } from "@/components/operator/cases/recovery-row"

const ISO_NOW = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago

describe("RecoveryRow", () => {
  it("renders title, detail, and relative time", () => {
    render(
      <RecoveryRow
        title="Payment webhook failed"
        detail="checkout.session.completed"
        occurredAt={ISO_NOW}
        severity="critical"
        href="/admin/webhook-dlq"
      />,
    )
    expect(screen.getByText("Payment webhook failed")).toBeInTheDocument()
    expect(screen.getByText("checkout.session.completed")).toBeInTheDocument()
    expect(screen.getByText(/2h/)).toBeInTheDocument()
  })

  it("makes the whole row a link to href", () => {
    render(
      <RecoveryRow
        title="X"
        detail="y"
        occurredAt={ISO_NOW}
        severity="warning"
        href="/admin/ops/parchment"
      />,
    )
    const row = screen.getByTestId("recovery-row")
    expect(row.tagName).toBe("A")
    expect(row.getAttribute("href")).toBe("/admin/ops/parchment")
  })

  it("exposes severity via data-severity", () => {
    render(
      <RecoveryRow title="X" detail="y" occurredAt={ISO_NOW} severity="critical" href="/" />,
    )
    expect(screen.getByTestId("recovery-row").dataset.severity).toBe("critical")
  })

  it("uses no colored backgrounds (calm-chrome contract)", () => {
    const { container } = render(
      <RecoveryRow title="X" detail="y" occurredAt={ISO_NOW} severity="warning" href="/" />,
    )
    const html = container.innerHTML
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky)-(50|100)/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/__tests__/cockpit-recovery-row.test.tsx`
Expected: FAIL with `Cannot find module '@/components/operator/cases/recovery-row'`.

**Step 3: Write minimal implementation**

```tsx
// components/operator/cases/recovery-row.tsx
import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { formatRelativeTime } from "@/lib/operator/cases/time-grouping"
import { cn } from "@/lib/utils"

export type RecoverySeverity = "warning" | "critical"

const SEVERITY_DOT: Record<RecoverySeverity, string> = {
  warning: "bg-amber-500",
  critical: "bg-red-500",
}

type RecoveryRowProps = {
  title: string
  detail: string
  occurredAt: string
  severity: RecoverySeverity
  href: string
  className?: string
}

export function RecoveryRow({
  title,
  detail,
  occurredAt,
  severity,
  href,
  className,
}: RecoveryRowProps) {
  const fullTimestamp = (() => {
    const d = new Date(occurredAt)
    if (Number.isNaN(d.getTime())) return occurredAt
    return d.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  })()

  return (
    <Link
      href={href}
      data-testid="recovery-row"
      data-severity={severity}
      className={cn(
        "group flex items-center gap-3 border-b border-border/40 px-4 py-3 transition-colors last:border-b-0",
        "hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/5",
          SEVERITY_DOT[severity],
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{detail}</div>
      </div>
      <div
        className="shrink-0 text-right text-xs tabular-nums text-muted-foreground"
        title={fullTimestamp}
      >
        {formatRelativeTime(occurredAt)}
      </div>
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60"
        aria-hidden="true"
      />
    </Link>
  )
}
```

**Step 4: Wire up the exports**

Modify `components/operator/cases/index.ts` — append after the `StatusDot` export on line 6:

```ts
export { RecoveryRow, type RecoverySeverity } from "./recovery-row"
```

Modify `components/operator/index.ts` — within the existing `export { ... } from "./cases"` block, add `RecoveryRow,` and `type RecoverySeverity,`.

**Step 5: Run test to verify it passes**

Run: `pnpm vitest run lib/__tests__/cockpit-recovery-row.test.tsx`
Expected: PASS, 4/4 tests green.

**Step 6: Commit**

```bash
git add components/operator/cases/recovery-row.tsx components/operator/cases/index.ts components/operator/index.ts lib/__tests__/cockpit-recovery-row.test.tsx
git commit -m "$(cat <<'EOF'
feat(cockpit): RecoveryRow primitive

Two-line scannable row for the /admin/ops recent list. Severity dot,
title, diagnostic detail, relative time, hover chevron. Whole row is
the link target — no separate action button. Calm-chrome compliant.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Relax `buildOperationalFailureOverview` input

The helper currently requires `incompleteRequests` on its input. We are no longer surfacing incomplete requests on `/admin/ops`, so the field becomes optional. This is a tiny ergonomic change in one file.

**Files:**
- Modify: `lib/admin/ops-failures.ts:80` (make `incompleteRequests` optional)
- Modify: `lib/admin/ops-failures.ts:154` (default to `[]` inside the helper)
- Modify: `lib/admin/ops-failures.ts:226-234` (guard against undefined when building recent)

**Step 1: Edit the input type**

Change line 80 from:

```ts
  incompleteRequests: IncompleteRequestRow[]
```

to:

```ts
  incompleteRequests?: IncompleteRequestRow[]
```

**Step 2: Default the field inside `buildOperationalFailureOverview`**

Inside the function, near the top of the body, add:

```ts
const incompleteRequests = input.incompleteRequests ?? []
```

Replace the two existing references (`input.incompleteRequests.length` in the categories array and `...input.incompleteRequests.map(...)` in the recent array) with `incompleteRequests.length` and `...incompleteRequests.map(...)`.

**Step 3: Run existing tests to confirm no regression**

Run: `pnpm vitest run lib/__tests__ --reporter=verbose`
Expected: all existing tests still pass. The helper is consumed by the ops page; the surface contract is unchanged for current callers.

**Step 4: Commit**

```bash
git add lib/admin/ops-failures.ts
git commit -m "$(cat <<'EOF'
refactor(ops): make incompleteRequests optional in failure overview

/admin/ops no longer surfaces abandoned checkout requests as recovery
work, so callers shouldn't have to pass an empty array. Existing
callers continue to work; the new ops client omits the field.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Rewrite `ops-client.tsx`

Replace the current 9-block client with the two-block layout. The page server component (Task 5) will hand the client a much smaller props shape.

**Files:**
- Modify: `app/admin/ops/ops-client.tsx` (full rewrite — current 492 lines down to ~120)

**Step 1: Write the new client**

Replace the entire contents of `app/admin/ops/ops-client.tsx` with:

```tsx
"use client"

import {
  CounterCard,
  type CounterCardTone,
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
  RecoveryRow,
  type RecoverySeverity,
} from "@/components/operator"
import {
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildStaffLedgerHref,
} from "@/lib/dashboard/routes"

type CounterCellData = {
  count: number
  helperText: string
  tone: CounterCardTone
}

export interface OpsDashboardClientProps {
  counters: {
    paymentFailures: CounterCellData
    webhookDlq: CounterCellData
    parchmentUnsynced: CounterCellData
    missingIdentity: CounterCellData
  }
  recoveries: Array<{
    id: string
    title: string
    detail: string
    occurredAt: string
    severity: RecoverySeverity
    href: string
  }>
}

export function OpsDashboardClient({ counters, recoveries }: OpsDashboardClientProps) {
  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Operations"
        description="Resolve payment, sync, and identity issues."
      />
      <OperatorScrollArea>
        <section
          aria-label="Recovery counters"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <CounterCard
            count={counters.paymentFailures.count}
            label="Payment failures"
            helperText={counters.paymentFailures.helperText}
            tone={counters.paymentFailures.tone}
            href={buildStaffLedgerHref({})}
          />
          <CounterCard
            count={counters.webhookDlq.count}
            label="Webhook DLQ"
            helperText={counters.webhookDlq.helperText}
            tone={counters.webhookDlq.tone}
            href={ADMIN_WEBHOOK_DLQ_HREF}
          />
          <CounterCard
            count={counters.parchmentUnsynced.count}
            label="Parchment unsynced"
            helperText={counters.parchmentUnsynced.helperText}
            tone={counters.parchmentUnsynced.tone}
            href={ADMIN_PARCHMENT_OPS_HREF}
          />
          <CounterCard
            count={counters.missingIdentity.count}
            label="Missing identity"
            helperText={counters.missingIdentity.helperText}
            tone={counters.missingIdentity.tone}
            href={ADMIN_PRESCRIBING_IDENTITY_HREF}
          />
        </section>

        <section
          aria-label="Recent recoveries"
          className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]"
        >
          <header className="border-b border-border/40 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Recent (last 24h)
            </h2>
          </header>
          {recoveries.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Nothing to recover. All systems clear.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {recoveries.map((r) => (
                <li key={r.id}>
                  <RecoveryRow
                    title={r.title}
                    detail={r.detail}
                    occurredAt={r.occurredAt}
                    severity={r.severity}
                    href={r.href}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </OperatorScrollArea>
    </OperatorPage>
  )
}
```

**Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS. The new file imports `CounterCard`, `RecoveryRow`, and `RecoverySeverity` from the barrel exports added in Tasks 1 and 2.

If typecheck fails on the page side, that's expected — the server component still passes the old shape. Task 5 fixes that.

**Step 3: Hold the commit until Task 5**

Do NOT commit yet — the page still passes the old shape, so the app won't build cleanly between Task 4 and Task 5. Stage the change and proceed to Task 5.

```bash
git add app/admin/ops/ops-client.tsx
```

---

### Task 5: Trim `page.tsx` data layer + wire to the new client

Drop the 12 unused parallel queries, build the 4 counter cells from `failureOverview` totals plus `prescribingIdentity`, slice the recent list to 10, hand it all to the new client.

**Files:**
- Modify: `app/admin/ops/page.tsx` (full rewrite — current 516 lines down to ~140)

**Step 1: Replace the page contents**

Replace the entire contents of `app/admin/ops/page.tsx` with:

```tsx
import { buildOperationalFailureOverview } from "@/lib/admin/ops-failures"
import { requireRole } from "@/lib/auth/helpers"
import { getStuckIntakes } from "@/lib/data/intake-ops"
import { getPrescribingIdentityBlockerReport } from "@/lib/doctor/patient-identity-report"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { OpsDashboardClient, type OpsDashboardClientProps } from "./ops-client"

export const dynamic = "force-dynamic"

type AuditRow = {
  id: string
  action: string
  created_at: string
  metadata: Record<string, unknown> | null
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function isNonActionableParchmentSandboxError(row: AuditRow): boolean {
  return (
    row.action === "webhook_failed"
    && metadataString(row.metadata, "eventType") === "parchment:prescription.created"
    && metadataString(row.metadata, "error") === "no_awaiting_script_intake"
  )
}

function helperTextForPayment(count: number, refundFailedCount: number): string {
  if (count === 0) return "All clear"
  if (refundFailedCount > 0) return `${refundFailedCount} refund failed`
  return `${count} to resolve`
}

function helperTextForParchment(count: number, staleCount: number): string {
  if (count === 0) return "All clear"
  if (staleCount > 0) return `${staleCount} stale`
  return "Action needed"
}

function helperTextForIdentity(count: number): string {
  if (count === 0) return "All clear"
  return `${count} to chase`
}

function helperTextForWebhook(count: number): string {
  if (count === 0) return "All clear"
  return "Action needed"
}

export default async function OpsDashboardPage() {
  await requireRole(["admin", "support"])

  const supabase = createServiceRoleClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)
  const fortyEightHrsAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const [
    webhookDlqResult,
    emailFailuresResult,
    checkoutFailuresResult,
    certificateFailuresResult,
    prescriptionWebhookFailuresResult,
    staleScriptIntakesResult,
    refundFailuresResult,
    stuckIntakesResult,
    prescribingIdentityResult,
  ] = await Promise.all([
    supabase
      .from("stripe_webhook_dead_letter")
      .select("id, created_at, event_type")
      .is("resolved_at", null)
      .order("created_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("email_outbox")
      .select("id, email_type, status, error_message, delivery_status, created_at")
      .or("status.eq.failed,delivery_status.eq.bounced,delivery_status.eq.complained")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype, checkout_error")
      .eq("status", "checkout_failed")
      .gte("updated_at", weekAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("issued_certificates")
      .select("id, intake_id, updated_at, email_failed_at, email_failure_reason")
      .not("email_failed_at", "is", null)
      .gte("email_failed_at", weekAgo.toISOString())
      .order("email_failed_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("audit_logs")
      .select("id, action, created_at, metadata")
      .eq("action", "webhook_failed")
      .gte("created_at", weekAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(50)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("intakes")
      .select("id, created_at, updated_at, category, subtype")
      .eq("status", "awaiting_script")
      .eq("payment_status", "paid")
      .lt("updated_at", fortyEightHrsAgo.toISOString())
      .order("updated_at", { ascending: true })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    supabase
      .from("payments")
      .select("id, intake_id, created_at, updated_at, refund_reason")
      .eq("refund_status", "failed")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then((r) => (r.error ? { data: [] } : r)),
    getStuckIntakes({}),
    getPrescribingIdentityBlockerReport(supabase),
  ])
  // `thirtyMinAgo` is reserved for a future "incomplete requests" surfacing decision;
  // currently unused so the linter ignores it via the prefix. If unused at lint time,
  // drop the binding.
  void thirtyMinAgo

  const prescriptionWebhookFailures = ((prescriptionWebhookFailuresResult.data || []) as AuditRow[])
    .filter((row) => !isNonActionableParchmentSandboxError(row))
    .filter((row) => metadataString(row.metadata, "eventType") === "parchment:prescription.created")

  const failureOverview = buildOperationalFailureOverview({
    stripeDlq: webhookDlqResult.data || [],
    emailFailures: emailFailuresResult.data || [],
    checkoutFailures: checkoutFailuresResult.data || [],
    certificateFailures: certificateFailuresResult.data || [],
    prescriptionWebhookFailures,
    staleScriptIntakes: staleScriptIntakesResult.data || [],
    refundFailures: refundFailuresResult.data || [],
  })

  const countByCategory = new Map(failureOverview.categories.map((c) => [c.id, c.count]))
  const checkoutCount = countByCategory.get("checkout") ?? 0
  const refundFailedCount = countByCategory.get("refund_failures") ?? 0
  const paymentFailuresCount = checkoutCount + refundFailedCount
  const webhookDlqCount = countByCategory.get("stripe_webhooks") ?? 0
  const prescriptionCount = countByCategory.get("prescription_delivery") ?? 0
  const staleScriptCount = countByCategory.get("stale_scripts") ?? 0
  const parchmentUnsyncedCount = prescriptionCount + staleScriptCount
  const missingIdentityCount = prescribingIdentityResult.blockedCount

  const counters: OpsDashboardClientProps["counters"] = {
    paymentFailures: {
      count: paymentFailuresCount,
      tone: paymentFailuresCount > 0 ? "critical" : "neutral",
      helperText: helperTextForPayment(paymentFailuresCount, refundFailedCount),
    },
    webhookDlq: {
      count: webhookDlqCount,
      tone: webhookDlqCount > 0 ? "critical" : "neutral",
      helperText: helperTextForWebhook(webhookDlqCount),
    },
    parchmentUnsynced: {
      count: parchmentUnsyncedCount,
      tone: parchmentUnsyncedCount > 0 ? "warning" : "neutral",
      helperText: helperTextForParchment(parchmentUnsyncedCount, staleScriptCount),
    },
    missingIdentity: {
      count: missingIdentityCount,
      tone: missingIdentityCount > 0 ? "warning" : "neutral",
      helperText: helperTextForIdentity(missingIdentityCount),
    },
  }
  void stuckIntakesResult // not surfaced in v2; intentionally retained for future helperText callouts

  const recoveries: OpsDashboardClientProps["recoveries"] = failureOverview.recent
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      title: item.title,
      detail: item.detail,
      occurredAt: item.occurredAt,
      severity: item.severity,
      href: item.href,
    }))

  return <OpsDashboardClient counters={counters} recoveries={recoveries} />
}
```

**Step 2: Typecheck and build**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm build` (optional but recommended on this task only — confirms App Router compiles the new server component end-to-end).
Expected: PASS.

**Step 3: Manual visual smoke**

Run: `pnpm dev`
Visit: `http://localhost:3000/admin/ops` while logged in as an admin (use the E2E auth bypass if needed: see `docs/TESTING.md`).
Expected:
- Header reads "Operations" with the description "Resolve payment, sync, and identity issues."
- 4 counter cards visible across the top.
- "Recent (last 24h)" section below with either rows or the "Nothing to recover. All systems clear." empty state.
- No "Needs attention" / "System checks" / "Recovery paths" / "Refunds" headings remain.

Stop the dev server.

**Step 4: Commit Tasks 4 + 5 together**

```bash
git add app/admin/ops/ops-client.tsx app/admin/ops/page.tsx
git commit -m "$(cat <<'EOF'
feat(ops): collapse /admin/ops to two-block scannable cockpit

4 counter cards (Payment failures, Webhook DLQ, Parchment unsynced,
Missing identity) + recent recoveries list. Page drops from 21 to 9
parallel queries; client drops from 492 to ~120 lines. Identical view
for admin and support; role gating stays at requireRole.

Env/config signals (Stripe prices, Telegram, auth-email config) are
intentionally not surfaced here. They will move to /admin/features
as inline banners in a follow-up task.

Design: docs/plans/2026-05-20-admin-ops-cockpit-reshape-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Calm-chrome contract test

A unit test that guards the cockpit against re-introduction of colored-background pills on routine status. Greps the source for forbidden patterns within `app/admin/ops/**` and the new primitives.

**Files:**
- Create: `lib/__tests__/admin-ops-calm-chrome.test.ts`

**Step 1: Write the test**

```ts
// lib/__tests__/admin-ops-calm-chrome.test.ts
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const REPO_ROOT = join(__dirname, "..", "..")

const FORBIDDEN_BG_CLASS_RE = /bg-(emerald|orange|red|amber|sky)-(50|100)\b/

const FILES_UNDER_TEST = [
  "app/admin/ops/page.tsx",
  "app/admin/ops/ops-client.tsx",
  "components/operator/counter-card.tsx",
  "components/operator/cases/recovery-row.tsx",
]

describe("Calm-chrome contract: /admin/ops surface", () => {
  it.each(FILES_UNDER_TEST)(
    "%s does not use colored-background pills on routine status",
    (relativePath) => {
      const contents = readFileSync(join(REPO_ROOT, relativePath), "utf8")
      const match = contents.match(FORBIDDEN_BG_CLASS_RE)
      expect(
        match,
        match
          ? `Calm-chrome violation in ${relativePath}: found "${match[0]}". Use StatusDot + plain text for routine status; colored-background Badge variants are reserved for exception states (Refunded, Express, etc.) on row chrome, not this surface.`
          : "no match",
      ).toBeNull()
    },
  )
})
```

**Step 2: Run test**

Run: `pnpm vitest run lib/__tests__/admin-ops-calm-chrome.test.ts`
Expected: PASS, 4/4 files clear (because Tasks 1, 2, and 5 produced calm-chrome-compliant code).

If FAIL: read the violation message, find the offending class in the named file, replace with `StatusDot` + plain text. Re-run.

**Step 3: Commit**

```bash
git add lib/__tests__/admin-ops-calm-chrome.test.ts
git commit -m "$(cat <<'EOF'
test(ops): calm-chrome contract for /admin/ops surface

Greps page.tsx, ops-client.tsx, CounterCard, and RecoveryRow for
forbidden bg-{emerald,orange,red,amber,sky}-{50,100} on routine
status. Fails the build if the loud pill chrome creeps back.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Update E2E

The current `e2e/admin.ops-index.spec.ts` asserts headings ("Needs attention", "System checks", "Recovery paths") and system-check labels that no longer exist. Replace with assertions against the new layout.

**Files:**
- Modify: `e2e/admin.ops-index.spec.ts` (rewrite the assertion bodies, keep the auth setup)
- Modify (only if assertions break): `e2e/admin.ops-visibility.spec.ts`, `e2e/support-ops-boundary.spec.ts`

**Step 1: Read the existing visibility + boundary specs to see what they assert**

Run: `cat e2e/admin.ops-visibility.spec.ts e2e/support-ops-boundary.spec.ts | head -200`

If those specs assert against the old layout (System Checks rows, Refunds card, Needs Attention block), update them too in this task. If they only assert role gating (e.g., a support user cannot reach `/admin/intakes/[id]/clinical`), leave them alone.

**Step 2: Rewrite the assertion body of `e2e/admin.ops-index.spec.ts`**

Replace the existing `test("page loads and displays current ops health signals", ...)` and `test("routes ops recovery links to current destinations", ...)` bodies (keep the `test.describe` wrapper, the `beforeEach` auth, and the `afterEach` logout):

```ts
  test("page loads with two-block cockpit layout", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 10_000 })

    // 4 counter cards
    const counterCards = page.getByTestId("counter-card")
    await expect(counterCards).toHaveCount(4)
    await expect(page.getByText("Payment failures")).toBeVisible()
    await expect(page.getByText("Webhook DLQ")).toBeVisible()
    await expect(page.getByText("Parchment unsynced")).toBeVisible()
    await expect(page.getByText("Missing identity")).toBeVisible()

    // Recent block visible. Either rows or empty state.
    await expect(page.getByRole("heading", { name: /Recent \(last 24h\)/ })).toBeVisible()

    // Retired headings must not appear.
    await expect(page.getByRole("heading", { name: "Needs attention" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "System checks" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Recovery paths" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Refunds" })).toHaveCount(0)
  })

  test("counter cards deep-link to the appropriate workshop", async ({ page }) => {
    await page.goto("/admin/ops")
    await page.waitForLoadState("networkidle")

    const cards = page.getByTestId("counter-card")
    await expect(cards.nth(0)).toHaveAttribute("href", /\/admin\/intakes/)
    await expect(cards.nth(1)).toHaveAttribute("href", "/admin/webhook-dlq")
    await expect(cards.nth(2)).toHaveAttribute("href", "/admin/ops/parchment")
    await expect(cards.nth(3)).toHaveAttribute("href", "/admin/ops/prescribing-identity")
  })
```

**Step 3: Update visibility / boundary specs if they break**

Run: `pnpm exec playwright test admin.ops-visibility.spec.ts support-ops-boundary.spec.ts --reporter=line` (with `PLAYWRIGHT=1`).
If anything breaks against the retired layout, update the assertions to point at the new selectors (counter card data-testids, the Recent heading). If the spec only asserts role-gating (forbidden paths, redirects), it should still pass — don't touch it.

**Step 4: Run the focused ops E2E**

Run: `PLAYWRIGHT=1 pnpm exec playwright test admin.ops-index.spec.ts --reporter=line`
Expected: PASS, both tests green.

If the dev server isn't running, Playwright will start it via `playwright.config.ts`. If that fails, run `pnpm dev` in a separate terminal first.

**Step 5: Commit**

```bash
git add e2e/admin.ops-index.spec.ts
# add the other two specs only if you modified them
git commit -m "$(cat <<'EOF'
test(ops): rewrite E2E for two-block cockpit layout

Asserts 4 counter cards (Payment failures, Webhook DLQ, Parchment
unsynced, Missing identity), Recent (last 24h) heading, deep-link
targets, and explicitly that the retired Needs-Attention / System-
Checks / Recovery-Paths / Refunds headings no longer render.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Doc updates (CLAUDE.md + AGENTS.md sync)

**Files:**
- Modify: `CLAUDE.md` (add a gotcha for the new primitives + update the Operational Controls workflow note)
- Run: `scripts/sync-agent-doc.sh` to project CLAUDE.md -> AGENTS.md

**Step 1: Add the new primitives gotcha to CLAUDE.md**

Find the existing gotcha block (start near "**Status chrome on staff lists is calm, not loud**"). Append a new gotcha immediately after it:

```md
- **Cockpit counter + recovery primitives (2026-05-20)**: `CounterCard` and `RecoveryRow` in `components/operator/` are the canonical primitives for any staff surface that needs a 4-up KPI / counter strip or a scannable "what just broke" list. Both follow the calm-chrome rule (no colored-background pills on routine status). `/admin/ops` is the reference implementation; the `/dashboard` KPI strip and any future operator alert feed should consume the same primitives, not hand-roll new ones. Calm-chrome contract test: `lib/__tests__/admin-ops-calm-chrome.test.ts`.
```

**Step 2: Update the Operational Controls workflow note**

Find the `**Operational controls:**` block under Key Workflows (~line 130 in CLAUDE.md). Append after the existing sentence about `/admin/features`:

```md
`/admin/ops` is the support cockpit: 4 counter cards (Payment failures · Webhook DLQ · Parchment unsynced · Missing identity) and a recent recoveries list. Env/config signals (Stripe price config, Telegram alerts, auth-email health) belong on `/admin/features`, not `/admin/ops`.
```

**Step 3: Sync AGENTS.md**

Run: `bash scripts/sync-agent-doc.sh`
Expected: AGENTS.md updated to match.

**Step 4: Confirm drift check passes**

Run: `bash scripts/sync-agent-doc.sh --check`
Expected: exit 0, no drift.

**Step 5: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "$(cat <<'EOF'
docs(cockpit): codify CounterCard + RecoveryRow primitives

CLAUDE.md gotcha + Operational Controls workflow note reflect the
two-block /admin/ops cockpit shape and point future operator
surfaces at the shared primitives.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Final verification gate

**Step 1: Full unit suite**

Run: `pnpm test`
Expected: PASS. New tests added: `cockpit-counter-card`, `cockpit-recovery-row`, `admin-ops-calm-chrome`. Existing tests unchanged.

**Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

**Step 3: Lint**

Run: `pnpm lint`
Expected: PASS. Watch for `no-console`, `no-unused-vars` (the `void thirtyMinAgo` and `void stuckIntakesResult` lines are intentional; if the linter flags them, remove the unused bindings instead — they were placeholders for follow-up helper text).

**Step 4: Focused E2E set**

Run: `PLAYWRIGHT=1 pnpm exec playwright test admin.ops-index.spec.ts admin.ops-visibility.spec.ts support-ops-boundary.spec.ts --reporter=line`
Expected: PASS, all three specs green.

**Step 5: Stack pin check**

Run: `bash scripts/check-stack-pins.sh`
Expected: exit 0.

**Step 6: Route conflict check**

Run: `bash scripts/check-route-conflicts.sh`
Expected: exit 0.

**Step 7: PR-ready summary**

Confirm `git log --oneline origin/main..HEAD` shows the 7 commits in order:

1. `feat(cockpit): CounterCard primitive`
2. `feat(cockpit): RecoveryRow primitive`
3. `refactor(ops): make incompleteRequests optional in failure overview`
4. `feat(ops): collapse /admin/ops to two-block scannable cockpit`
5. `test(ops): calm-chrome contract for /admin/ops surface`
6. `test(ops): rewrite E2E for two-block cockpit layout`
7. `docs(cockpit): codify CounterCard + RecoveryRow primitives`

Plus the two docs commits (design + plan) that already landed.

If any step fails, stop and fix the named violation before continuing. Do not paper over with `// eslint-disable` or `it.skip`.

---

## Out of scope (do not touch in this branch)

- `/admin/features` env/config banner relocation (separate follow-up task; surface stays today as it is).
- `/admin/intakes`, `/admin/patients`, `/dashboard`, `/admin/emails/hub`.
- Refund logic, role gates, capacity checks, `app/doctor/queue/actions.ts`.
- `OperatorShell`, `OperatorPageHeader`, staff navigation, system-health pill.
- Sub-workshops: `/admin/ops/parchment`, `/admin/ops/prescribing-identity`, `/admin/ops/intakes-stuck`, `/admin/ops/reconciliation`, `/admin/ops/patient-merge-audit`, `/admin/webhook-dlq`.

## Risk recap

| Risk | Mitigation |
|---|---|
| Counter math diverges from recent list | Both derive from the same `failureOverview` result. Calm-chrome test covers visual; manual smoke covers correctness. |
| Visibility + boundary E2E breaks | Task 7 Step 3 reads and updates them if needed. |
| Loud pills creep back during future edits | Calm-chrome contract test (Task 6) greps the four files and fails CI. |
| Helper text feels wrong on edge cases (zero refund failed but non-zero checkout) | Helpers are simple branches; covered implicitly by `pnpm test`. Tweak in-place if a specific phrasing reads poorly. |
| Stripe price config / Telegram / auth-email health goes invisible | Documented as out-of-scope follow-up; CLAUDE.md gotcha names `/admin/features` as the new home so the next operator can find it. |

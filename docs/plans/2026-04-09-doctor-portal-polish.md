# Doctor Portal Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the doctor portal for daily clinical use — reduce prop drilling, fix mobile gaps, add resilience to real-time features, and cover core logic with tests.

**Architecture:** The portal is a unified dashboard+queue at `/doctor/dashboard` with stats (IntakeMonitor), a filterable queue (QueueClient → QueueFilters + QueueTable), and an intake detail page (`/doctor/intakes/[id]`). Real-time updates come via Supabase postgres_changes channel. The refactor extracts business logic into testable hooks/modules, fixes mobile nav gaps, and adds a visible reconnection banner. No functional changes to clinical workflows.

**Tech Stack:** Next.js 15.5 App Router, React 18.3, Supabase Realtime, Framer Motion 11, Tailwind v4, Vitest (unit), Playwright (E2E)

---

## Audit Summary

| Area | Issue | Severity |
|------|-------|----------|
| `QueueTable` | **40+ props** drilled from QueueClient — 4 dialog state bundles passed as individual props | High |
| `IntakeDetailHeader` | **26 props** — 3 AlertDialogs + preview + PDF viewer state all passed individually | High |
| `queue-client.tsx` | **20+ useState calls** — real-time, dialogs, search, filters, sound all interleaved | Medium |
| Dashboard page | `getDoctorIdentity` + `getTodayEarnings` fetched in **both** DoctorStatsSection AND DoctorQueueSection — 2 redundant DB calls | Medium |
| Mobile nav | `DoctorMobileNav` missing **Certificates** page — exists in sidebar but not bottom tabs or "More" menu | Medium |
| Reconnection UX | Real-time CHANNEL_ERROR/TIMED_OUT sets `isReconnecting` but **no visible banner** — user sees the green "Live" dot vanish with no explanation | Medium |
| Queue utilities | `calculateWaitTime`, `getWaitTimeSeverity`, `calculateSlaCountdown` are **inline** in queue-client.tsx — zero test coverage | Medium |
| Mobile queue rows | Badge row (`Priority` + `AI ready` + `Flagged` + subtype) overflows on `<375px` — no `overflow-hidden` or responsive truncation | Low |
| Service type strings | `"med_certs"`, `"common_scripts"`, `"consults"` used as inline literals across 5+ files — no constants | Low |

---

## Task 1: Extract queue utility functions to a testable module

> The wait-time and SLA functions are pure logic trapped inside a React component. Extract them so they're unit-testable.

**Files:**
- Create: `lib/doctor/queue-utils.ts`
- Test: `lib/__tests__/doctor/queue-utils.test.ts`
- Modify: `app/doctor/queue/queue-client.tsx`

**Step 1: Create the utility module**

Create `lib/doctor/queue-utils.ts`:

```ts
/**
 * Queue utility functions — wait time, SLA countdown, severity.
 * Extracted from queue-client.tsx for testability.
 */

export type WaitTimeSeverity = "normal" | "warning" | "critical"

/** Human-readable wait time from a created_at timestamp. */
export function calculateWaitTime(createdAt: string): string {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
  return `${diffMins}m`
}

/** Color-coding severity based on wait time or SLA deadline. */
export function getWaitTimeSeverity(
  createdAt: string,
  slaDeadline?: string | null,
): WaitTimeSeverity {
  if (slaDeadline) {
    const deadline = new Date(slaDeadline)
    const now = new Date()
    const diffMins = Math.floor(
      (deadline.getTime() - now.getTime()) / (1000 * 60),
    )
    if (diffMins < 0) return "critical"
    if (diffMins < 30) return "warning"
    return "normal"
  }
  const created = new Date(createdAt)
  const now = new Date()
  const diffMins = Math.floor(
    (now.getTime() - created.getTime()) / (1000 * 60),
  )
  if (diffMins > 60) return "critical"
  if (diffMins > 30) return "warning"
  return "normal"
}

/** SLA countdown string (e.g. "2h 15m left" or "10m overdue"). */
export function calculateSlaCountdown(
  slaDeadline: string | null | undefined,
): string | null {
  if (!slaDeadline) return null
  const deadline = new Date(slaDeadline)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  if (diffMins < 0) {
    const overdueMins = Math.abs(diffMins)
    const overdueHours = Math.floor(overdueMins / 60)
    return overdueHours > 0
      ? `${overdueHours}h ${overdueMins % 60}m overdue`
      : `${overdueMins}m overdue`
  }
  const hours = Math.floor(diffMins / 60)
  return hours > 0 ? `${hours}h ${diffMins % 60}m left` : `${diffMins}m left`
}
```

**Step 2: Write unit tests**

Create `lib/__tests__/doctor/queue-utils.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  calculateWaitTime,
  getWaitTimeSeverity,
  calculateSlaCountdown,
} from "@/lib/doctor/queue-utils"

describe("calculateWaitTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-09T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns minutes for recent submissions", () => {
    expect(calculateWaitTime("2026-04-09T11:45:00Z")).toBe("15m")
  })

  it("returns hours and minutes for older submissions", () => {
    expect(calculateWaitTime("2026-04-09T10:30:00Z")).toBe("1h 30m")
  })

  it("returns 0m for just-submitted", () => {
    expect(calculateWaitTime("2026-04-09T12:00:00Z")).toBe("0m")
  })
})

describe("getWaitTimeSeverity", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-09T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns normal for recent (< 30min)", () => {
    expect(getWaitTimeSeverity("2026-04-09T11:45:00Z")).toBe("normal")
  })

  it("returns warning for 30-60min wait", () => {
    expect(getWaitTimeSeverity("2026-04-09T11:20:00Z")).toBe("warning")
  })

  it("returns critical for > 60min wait", () => {
    expect(getWaitTimeSeverity("2026-04-09T10:30:00Z")).toBe("critical")
  })

  it("uses SLA deadline when provided — normal", () => {
    expect(
      getWaitTimeSeverity("2026-04-09T10:00:00Z", "2026-04-09T13:00:00Z"),
    ).toBe("normal")
  })

  it("uses SLA deadline — warning when < 30min left", () => {
    expect(
      getWaitTimeSeverity("2026-04-09T10:00:00Z", "2026-04-09T12:20:00Z"),
    ).toBe("warning")
  })

  it("uses SLA deadline — critical when past", () => {
    expect(
      getWaitTimeSeverity("2026-04-09T10:00:00Z", "2026-04-09T11:30:00Z"),
    ).toBe("critical")
  })
})

describe("calculateSlaCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-09T12:00:00Z"))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns null for null/undefined deadline", () => {
    expect(calculateSlaCountdown(null)).toBeNull()
    expect(calculateSlaCountdown(undefined)).toBeNull()
  })

  it("returns time remaining for future deadline", () => {
    expect(calculateSlaCountdown("2026-04-09T14:30:00Z")).toBe("2h 30m left")
  })

  it("returns minutes only when < 1h left", () => {
    expect(calculateSlaCountdown("2026-04-09T12:45:00Z")).toBe("45m left")
  })

  it("returns overdue for past deadline", () => {
    expect(calculateSlaCountdown("2026-04-09T11:30:00Z")).toBe("30m overdue")
  })

  it("returns hours overdue for long breaches", () => {
    expect(calculateSlaCountdown("2026-04-09T10:00:00Z")).toBe("2h 0m overdue")
  })
})
```

**Step 3: Run tests to verify they pass**

Run: `pnpm vitest run lib/__tests__/doctor/queue-utils.test.ts`
Expected: PASS — all tests green (we extracted existing working logic)

**Step 4: Update queue-client.tsx to import from the module**

In `app/doctor/queue/queue-client.tsx`:
- Remove the inline `calculateWaitTime`, `getWaitTimeSeverity`, `calculateSlaCountdown` functions (lines ~172-212)
- Add import: `import { calculateWaitTime, getWaitTimeSeverity, calculateSlaCountdown } from "@/lib/doctor/queue-utils"`

**Step 5: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean (zero errors from our changes)

**Step 6: Commit**

```bash
git add lib/doctor/queue-utils.ts lib/__tests__/doctor/queue-utils.test.ts app/doctor/queue/queue-client.tsx
git commit -m "refactor(doctor): extract queue wait-time utilities to testable module"
```

---

## Task 2: Fix duplicate data fetching in dashboard

> `getDoctorIdentity` and `getTodayEarnings` are called in both `DoctorStatsSection` AND `DoctorQueueSection` — 2 redundant DB round-trips per page load.

**Files:**
- Modify: `app/doctor/dashboard/page.tsx`

**Step 1: Hoist shared fetches to the parent**

In `app/doctor/dashboard/page.tsx`, the page component `DoctorDashboardPage` should fetch `getDoctorIdentity` and `getTodayEarnings` once and pass results to both children.

Modify the page component:

```tsx
export default async function DoctorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>
}) {
  const { profile } = (await getAuthenticatedUserWithProfile())!
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(params.pageSize || "50", 10)))

  // Fetch shared data once — used by both stats and queue sections
  const [identityResult, earningsResult] = await Promise.allSettled([
    getDoctorIdentity(profile.id),
    getTodayEarnings(),
  ])
  const doctorIdentity = identityResult.status === "fulfilled" ? identityResult.value : null
  const todayEarnings = earningsResult.status === "fulfilled" ? earningsResult.value : 0

  if (identityResult.status === "rejected") {
    log.error("Failed to fetch identity data", { profileId: profile.id }, identityResult.reason)
  }
  if (earningsResult.status === "rejected") {
    log.error("Failed to fetch today-earnings data", { profileId: profile.id }, earningsResult.reason)
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground font-sans">Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Patient requests awaiting your review</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/60 font-mono">
          <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">j</kbd>
          <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">k</kbd>
          <span className="text-muted-foreground/40">navigate</span>
          <span className="mx-1 text-muted-foreground/20">&middot;</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">a</kbd>
          <span className="text-muted-foreground/40">approve</span>
          <span className="mx-1 text-muted-foreground/20">&middot;</span>
          <kbd className="px-1.5 py-0.5 rounded border border-border/40 bg-muted/40">d</kbd>
          <span className="text-muted-foreground/40">decline</span>
        </div>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <DoctorStatsSection profileId={profile.id} doctorIdentity={doctorIdentity} todayEarnings={todayEarnings} />
      </Suspense>

      <Suspense fallback={<QueueSkeleton />}>
        <DoctorQueueSection profileId={profile.id} page={page} pageSize={pageSize} doctorIdentity={doctorIdentity} todayEarnings={todayEarnings} />
      </Suspense>
    </div>
  )
}
```

Update `DoctorStatsSection` to accept `doctorIdentity` and `todayEarnings` as props and remove its own fetch of those. Same for `DoctorQueueSection`.

**Step 2: Run typecheck + test**

Run: `pnpm typecheck && pnpm test`
Expected: Both clean

**Step 3: Commit**

```bash
git add app/doctor/dashboard/page.tsx
git commit -m "perf(doctor): deduplicate identity + earnings fetches in dashboard"
```

---

## Task 3: Add Certificates to doctor mobile nav

> The Certificates page exists at `/doctor/certificates` and is in the sidebar, but the bottom tab bar + "More" sheet don't include it. Doctors on mobile can't access it.

**Files:**
- Modify: `components/ui/mobile-nav.tsx`

**Step 1: Add Certificates to doctorMoreItems**

In `components/ui/mobile-nav.tsx`, add the Certificates entry to `doctorMoreItems` array:

```ts
import { ..., FileCheck, ... } from "lucide-react"

const doctorMoreItems: NavItem[] = [
  {
    label: "Repeat Rx",
    icon: ClipboardList,
    href: "/doctor/repeat-rx",
  },
  {
    label: "Certificates",
    icon: FileCheck,
    href: "/doctor/certificates",
  },
  {
    label: "All Requests",
    icon: Shield,
    href: "/admin",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/doctor/analytics",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/doctor/settings/identity",
  },
]
```

**Step 2: Import FileCheck icon**

Add `FileCheck` to the lucide-react import at the top of the file.

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean

**Step 4: Commit**

```bash
git add components/ui/mobile-nav.tsx
git commit -m "fix(doctor): add Certificates to mobile nav 'More' menu"
```

---

## Task 4: Add visible reconnection banner

> When the real-time channel drops (CHANNEL_ERROR / TIMED_OUT), the green "Live" dot disappears silently. The doctor has no idea their queue is stale. Add a visible warning banner.

**Files:**
- Modify: `app/doctor/queue/queue-filters.tsx`

**Step 1: Add the stale/reconnecting banner**

In `QueueFilters`, add a visible banner above the header when `isStale` or `isReconnecting`:

```tsx
return (
  <>
    {/* Connection warning */}
    {(isStale || isReconnecting) && (
      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning-light border border-warning-border animate-in fade-in-0 slide-in-from-top-1 duration-300">
        <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
        <span className="text-sm text-warning font-medium">
          {isReconnecting
            ? "Reconnecting to live updates..."
            : "Queue may be stale \u2014 new requests might not appear automatically."}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs text-warning hover:text-warning"
          onClick={onRefresh}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh now
        </Button>
      </div>
    )}

    {/* Header + Search (existing code below) */}
    ...
  </>
)
```

Add `AlertTriangle` to the lucide-react import.

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean

**Step 3: Commit**

```bash
git add app/doctor/queue/queue-filters.tsx
git commit -m "feat(doctor): visible stale-connection banner in queue"
```

---

## Task 5: Add exponential backoff to real-time reconnection

> Currently, Supabase reconnection fires at whatever interval the client library uses internally. If the server is down, this hammers it. Add a backoff wrapper.

**Files:**
- Create: `lib/doctor/use-queue-realtime.ts`
- Modify: `app/doctor/queue/queue-client.tsx`

**Step 1: Create the real-time hook**

Create `lib/doctor/use-queue-realtime.ts` that encapsulates:
- Supabase channel subscription
- Stale detection (90s without sync)
- Exponential backoff on CHANNEL_ERROR/TIMED_OUT (1s → 2s → 4s → 8s → 16s → max 30s)
- Background soft-refresh every 60s
- Notification sound on INSERT
- Returns `{ isStale, isReconnecting }` state

```ts
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { IntakeWithPatient } from "@/types/db"

interface UseQueueRealtimeOptions {
  onInsert: (intake: IntakeWithPatient) => void
  onUpdate: (intake: Partial<IntakeWithPatient> & { id: string }) => void
  onDelete: (id: string) => void
  playNotificationSound: () => void
}

interface UseQueueRealtimeResult {
  isStale: boolean
  isReconnecting: boolean
}

const MAX_BACKOFF_MS = 30_000
const STALE_THRESHOLD_MS = 90_000
const SOFT_REFRESH_MS = 60_000
const STALE_CHECK_MS = 30_000

export function useQueueRealtime({
  onInsert,
  onUpdate,
  onDelete,
  playNotificationSound,
}: UseQueueRealtimeOptions): UseQueueRealtimeResult {
  const router = useRouter()
  const [isStale, setIsStale] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const lastSyncTimeRef = useRef<Date>(new Date())
  const backoffRef = useRef(1000) // Start at 1s

  useEffect(() => {
    const supabase = createClient()
    let reconnectTimer: NodeJS.Timeout | null = null

    const staleCheckInterval = setInterval(() => {
      const timeSinceSync = Date.now() - lastSyncTimeRef.current.getTime()
      if (timeSinceSync > STALE_THRESHOLD_MS) {
        setIsStale(true)
      }
    }, STALE_CHECK_MS)

    const softRefreshInterval = setInterval(() => {
      router.refresh()
    }, SOFT_REFRESH_MS)

    function subscribe() {
      const channel = supabase
        .channel("queue-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "intakes",
            filter: "status=in.(paid,in_review,pending_info,awaiting_script)",
          },
          (payload) => {
            lastSyncTimeRef.current = new Date()
            setIsStale(false)

            if (payload.eventType === "INSERT") {
              const newRow = payload.new as IntakeWithPatient
              const serviceData = newRow.service as { short_name?: string } | undefined
              const serviceName = serviceData?.short_name || "New request"
              const patientName = newRow.patient?.full_name
              playNotificationSound()
              toast.info(
                patientName
                  ? `${serviceName} from ${patientName}`
                  : `${serviceName} added to queue`,
                { duration: 5000 },
              )
              onInsert(newRow)
            } else if (payload.eventType === "UPDATE") {
              onUpdate(payload.new as Partial<IntakeWithPatient> & { id: string })
            } else if (payload.eventType === "DELETE") {
              onDelete(payload.old.id as string)
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            lastSyncTimeRef.current = new Date()
            setIsStale(false)
            setIsReconnecting(false)
            backoffRef.current = 1000 // Reset on success
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT"
          ) {
            setIsStale(true)
            setIsReconnecting(true)

            // Exponential backoff reconnect
            const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS)
            backoffRef.current = delay * 2
            supabase.removeChannel(channel)
            reconnectTimer = setTimeout(subscribe, delay)
          }
        })

      return channel
    }

    const channel = subscribe()

    return () => {
      supabase.removeChannel(channel)
      clearInterval(staleCheckInterval)
      clearInterval(softRefreshInterval)
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [router, playNotificationSound, onInsert, onUpdate, onDelete])

  return { isStale, isReconnecting }
}
```

**Step 2: Update queue-client.tsx to use the hook**

In `app/doctor/queue/queue-client.tsx`:
- Remove the entire `useEffect` block that creates the Supabase channel (~lines 100-170)
- Remove `lastSyncTimeRef`, `isStale`, `isReconnecting` useState/useRef declarations
- Import and call `useQueueRealtime`:

```tsx
import { useQueueRealtime } from "@/lib/doctor/use-queue-realtime"

// Inside the component:
const handleInsert = useCallback((newRow: IntakeWithPatient) => {
  setIntakes((prev) => {
    if (prev.some((r) => r.id === newRow.id)) return prev
    return [newRow, ...prev]
  })
}, [])

const handleUpdate = useCallback((updated: Partial<IntakeWithPatient> & { id: string }) => {
  setIntakes((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
}, [])

const handleDelete = useCallback((id: string) => {
  setIntakes((prev) => prev.filter((r) => r.id !== id))
}, [])

const { isStale, isReconnecting } = useQueueRealtime({
  onInsert: handleInsert,
  onUpdate: handleUpdate,
  onDelete: handleDelete,
  playNotificationSound,
})
```

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean

**Step 4: Commit**

```bash
git add lib/doctor/use-queue-realtime.ts app/doctor/queue/queue-client.tsx
git commit -m "refactor(doctor): extract real-time queue subscription to hook with exponential backoff"
```

---

## Task 6: Mobile-responsive queue rows

> Badge clusters overflow on narrow screens. The wait time and badges need wrapping.

**Files:**
- Modify: `app/doctor/queue/queue-table.tsx`

**Step 1: Fix the collapsed row layout**

In the `CardHeader` section of each queue row, change the inner flex container:

```tsx
{/* Before */}
<div className="flex items-center justify-between gap-3">
  <div className="flex items-center gap-3 min-w-0">
    ...badges...
  </div>
  <div className="flex items-center gap-2 shrink-0">
    ...wait time...
  </div>
</div>

{/* After */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
    {/* Chevron + UserCard stay inline */}
    {isExpanded ? (
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground hidden sm:block" />
    ) : (
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground hidden sm:block" />
    )}
    <UserCard ... />
    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
      {/* Badges — wrap naturally on mobile */}
      ...
    </div>
  </div>
  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
    ...wait time...
  </div>
</div>
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean

**Step 3: Commit**

```bash
git add app/doctor/queue/queue-table.tsx
git commit -m "fix(doctor): responsive queue rows — badges wrap on mobile"
```

---

## Task 7: Extract IntakeDetailHeader dialog state to a hook

> 26 props is a code smell. The 3 dialog state bundles (decline, script, refund) can be managed by a single hook.

**Files:**
- Create: `app/doctor/intakes/[id]/use-intake-dialogs.ts`
- Modify: `app/doctor/intakes/[id]/intake-detail-header.tsx`
- Modify: `app/doctor/intakes/[id]/intake-detail-client.tsx`

**Step 1: Create the hook**

Create `app/doctor/intakes/[id]/use-intake-dialogs.ts`:

```ts
"use client"

import { useState, useCallback } from "react"
import type { DeclineReasonCode } from "@/types/db"
import { DECLINE_REASONS } from "./intake-detail-header"

export interface IntakeDialogState {
  // Decline
  showDeclineDialog: boolean
  openDeclineDialog: () => void
  closeDeclineDialog: () => void
  declineReason: string
  setDeclineReason: (val: string) => void
  declineReasonCode: DeclineReasonCode
  onDeclineReasonCodeChange: (code: DeclineReasonCode) => void

  // Script
  showScriptDialog: boolean
  openScriptDialog: () => void
  closeScriptDialog: () => void
  parchmentReference: string
  setParchmentReference: (val: string) => void

  // Refund
  showRefundDialog: boolean
  openRefundDialog: () => void
  closeRefundDialog: () => void
}

export function useIntakeDialogs(): IntakeDialogState {
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [declineReasonCode, setDeclineReasonCode] = useState<DeclineReasonCode>("requires_examination")

  const [showScriptDialog, setShowScriptDialog] = useState(false)
  const [parchmentReference, setParchmentReference] = useState("")

  const [showRefundDialog, setShowRefundDialog] = useState(false)

  const openDeclineDialog = useCallback(() => setShowDeclineDialog(true), [])
  const closeDeclineDialog = useCallback(() => {
    setShowDeclineDialog(false)
    setDeclineReason("")
    setDeclineReasonCode("requires_examination")
  }, [])

  const onDeclineReasonCodeChange = useCallback((code: DeclineReasonCode) => {
    setDeclineReasonCode(code)
    const template = DECLINE_REASONS.find((r) => r.code === code)
    if (template?.template) {
      setDeclineReason(template.template)
    }
  }, [])

  const openScriptDialog = useCallback(() => setShowScriptDialog(true), [])
  const closeScriptDialog = useCallback(() => {
    setShowScriptDialog(false)
    setParchmentReference("")
  }, [])

  const openRefundDialog = useCallback(() => setShowRefundDialog(true), [])
  const closeRefundDialog = useCallback(() => setShowRefundDialog(false), [])

  return {
    showDeclineDialog,
    openDeclineDialog,
    closeDeclineDialog,
    declineReason,
    setDeclineReason,
    declineReasonCode,
    onDeclineReasonCodeChange,
    showScriptDialog,
    openScriptDialog,
    closeScriptDialog,
    parchmentReference,
    setParchmentReference,
    showRefundDialog,
    openRefundDialog,
    closeRefundDialog,
  }
}
```

**Step 2: Update IntakeDetailHeader to accept the hook's state object**

Change `IntakeDetailHeaderProps` to accept a `dialogs: IntakeDialogState` prop instead of 10+ individual dialog props. This reduces the prop count from 26 to ~16.

**Step 3: Update intake-detail-client.tsx to use the hook**

Replace the 6 individual `useState` calls for dialog state with:

```tsx
import { useIntakeDialogs } from "./use-intake-dialogs"

// Inside the component:
const dialogs = useIntakeDialogs()
```

And pass `dialogs={dialogs}` to `IntakeDetailHeader`.

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean

**Step 5: Commit**

```bash
git add app/doctor/intakes/\[id\]/use-intake-dialogs.ts app/doctor/intakes/\[id\]/intake-detail-header.tsx app/doctor/intakes/\[id\]/intake-detail-client.tsx
git commit -m "refactor(doctor): extract dialog state to useIntakeDialogs hook, reduce prop drilling"
```

---

## Task 8: Service type constants

> Inline `"med_certs"`, `"common_scripts"`, `"consults"`, `"repeat_rx"` appear across 5+ files. One typo = silent failure.

**Files:**
- Create: `lib/doctor/service-types.ts`
- Modify: `app/doctor/intakes/[id]/intake-detail-header.tsx` (use constants)
- Modify: `app/doctor/queue/queue-table.tsx` (use constants)

**Step 1: Create the constants module**

Create `lib/doctor/service-types.ts`:

```ts
/**
 * Canonical service type strings used in doctor portal logic.
 * Matches the `service.type` field on intake rows.
 */
export const SERVICE_TYPES = {
  MED_CERTS: "med_certs",
  REPEAT_RX: "repeat_rx",
  COMMON_SCRIPTS: "common_scripts",
  CONSULTS: "consults",
} as const

export type ServiceTypeValue = (typeof SERVICE_TYPES)[keyof typeof SERVICE_TYPES]
```

**Step 2: Replace inline strings in intake-detail-header.tsx**

Find-replace `"med_certs"` → `SERVICE_TYPES.MED_CERTS`, etc. Add import at top.

**Step 3: Replace inline strings in queue-table.tsx**

Same pattern.

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: Clean

**Step 5: Commit**

```bash
git add lib/doctor/service-types.ts app/doctor/intakes/\[id\]/intake-detail-header.tsx app/doctor/queue/queue-table.tsx
git commit -m "refactor(doctor): extract service type constants, eliminate inline strings"
```

---

## Task 9: Run full verification

**Step 1: Full test suite**

Run: `pnpm test`
Expected: All tests pass (1136+ existing + new queue-utils tests)

**Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: Clean

**Step 3: Production build**

Run: `pnpm build`
Expected: Builds successfully

**Step 4: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore: doctor portal polish verification pass"
```

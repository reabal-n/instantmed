"use client"

import { RotateCcw } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { IntakeRefundDialog } from "@/app/doctor/intakes/[id]/intake-refund-dialog"
import { issueRefundAction } from "@/app/doctor/queue/actions"
import { IntakeReviewPanel } from "@/components/doctor"
import { CaseTable } from "@/components/operator/cases/case-table"
import { FilterBar, type QuickFilter } from "@/components/operator/cases/filter-bar"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import { parseIntakeFlags } from "@/lib/clinical/intake-flags"
import {
  ADMIN_STATUS_PRIORITY,
  type AdminIntakeStatusFilterValue,
  type AdminWorkLaneFilterValue,
  matchesAdminStatusFilter,
  matchesAdminWorkLaneFilter,
} from "@/lib/dashboard/admin-work-lanes"
import { buildAdminIntakeHref, STAFF_LEDGER_HREF } from "@/lib/dashboard/routes"
import { type IntakeStatus } from "@/lib/data/status"
import {
  formatRenewalMatchTitle,
  type RenewalMatch,
} from "@/lib/doctor/renewal-format"
import { computeLedgerDailyAggregate } from "@/lib/operator/cases/daily-aggregate"
import {
  type CaseRowData,
  DEFAULT_SORT,
  type RefundIndicator,
  type SortField,
  type SortState,
} from "@/lib/operator/cases/types"
import { useDensity } from "@/lib/operator/cases/use-density"
import {
  type AdminServiceFilterValue,
  getServicePresentation,
  matchesAdminServiceFilter,
} from "@/lib/services/service-presentation"
import type { IntakeWithPatient } from "@/types/db"

export interface AdminIntakesLedgerInitialFilters {
  q?: string
  service?: AdminServiceFilterValue
  status?: AdminIntakeStatusFilterValue
  workLane?: AdminWorkLaneFilterValue
}

type LedgerRow = IntakeWithPatient

type AdminIntakesLedgerClientProps = {
  allIntakes: LedgerRow[]
  initialFilters?: AdminIntakesLedgerInitialFilters
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: "priority", label: "Priority" },
  { id: "stale", label: "Stale > 4h" },
  { id: "awaiting_script", label: "Awaiting script" },
  { id: "failed_payment", label: "Failed payment" },
  { id: "refunded", label: "Refunded" },
  { id: "refund_failed", label: "Refund failed" },
  { id: "mine", label: "Mine" },
]

function normalizeQuickFilterId(filterId: string): string {
  return filterId === "express" ? "priority" : filterId
}

function parseQuickFilterParams(raw: string | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .filter(Boolean)
      .map(normalizeQuickFilterId),
  )
}

const VALID_SORT_FIELDS: SortField[] = [
  "createdAt",
  "status",
  "patient",
  "service",
]

function isSortField(value: string | null): value is SortField {
  return value !== null && (VALID_SORT_FIELDS as string[]).includes(value)
}

function getPatient(intake: LedgerRow) {
  return intake.patient as
    | {
        id?: string
        full_name?: string
        suburb?: string
        state?: string
        email?: string
        phone?: string
      }
    | undefined
}

function getService(intake: LedgerRow) {
  return intake.service as
    | { name?: string; short_name?: string; type?: string }
    | undefined
}

function getServiceDisplay(intake: LedgerRow) {
  const service = getService(intake)
  return getServicePresentation({
    type: service?.type,
    category: intake.category,
    name: service?.name,
    shortName: service?.short_name,
  })
}

function getInitials(name: string | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase()
}

function getRefundIndicator(intake: LedgerRow): RefundIndicator | null {
  const row = intake as {
    payment_status?: string | null
    refund_status?: string | null
  }
  if (row.payment_status === "refunded") return "refunded"
  if (row.payment_status === "partially_refunded") return "partially_refunded"
  if (row.refund_status === "failed") return "refund_failed"
  if (row.refund_status === "pending") return "refund_processing"
  return null
}

function mapToCaseRow(intake: LedgerRow): CaseRowData {
  const patient = getPatient(intake)
  const service = getServiceDisplay(intake)
  const location = [patient?.suburb, patient?.state]
    .filter(Boolean)
    .join(", ")
  const renewalMatch =
    (intake as { renewal_match?: RenewalMatch | null }).renewal_match ?? null
  return {
    id: intake.id,
    intakeRef: intake.reference_number || `IM-${intake.id.slice(0, 8)}`,
    patientName: patient?.full_name || "Unknown patient",
    patientEmail: patient?.email || null,
    patientLocation: location || null,
    avatarInitials: getInitials(patient?.full_name),
    serviceLabel: service.shortLabel || service.label,
    status: intake.status as IntakeStatus,
    createdAt: intake.created_at,
    href: buildAdminIntakeHref(intake.id),
    isPriority: Boolean((intake as { is_priority?: boolean }).is_priority),
    isStale: isStale(intake),
    refundIndicator: getRefundIndicator(intake),
    isRenewal: Boolean((intake as { is_renewal?: boolean }).is_renewal),
    renewalMatchTitle: renewalMatch ? formatRenewalMatchTitle(renewalMatch) : null,
    intakeFlags: parseIntakeFlags((intake as { risk_flags?: unknown }).risk_flags),
    paymentStatus: (intake as { payment_status?: string | null }).payment_status ?? null,
    amountCents: (intake as { amount_cents?: number | null }).amount_cents ?? null,
    refundAmountCents: (intake as { refund_amount_cents?: number | null }).refund_amount_cents ?? null,
  }
}

function isStale(intake: LedgerRow): boolean {
  const updated = (intake as { updated_at?: string }).updated_at
  if (!updated) return false
  const updatedTime = new Date(updated).getTime()
  if (Number.isNaN(updatedTime)) return false
  return Date.now() - updatedTime > 4 * 60 * 60 * 1000
}

function sortIntakes(
  rows: LedgerRow[],
  sort: SortState,
  smart: boolean,
): LedgerRow[] {
  const direction = sort.direction === "asc" ? 1 : -1

  return [...rows].sort((a, b) => {
    if (smart) {
      const priorityDelta =
        (ADMIN_STATUS_PRIORITY[a.status] ?? 99) -
        (ADMIN_STATUS_PRIORITY[b.status] ?? 99)
      if (priorityDelta !== 0) return priorityDelta
    }

    switch (sort.field) {
      case "createdAt":
        return (
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) *
          direction
        )
      case "status":
        return a.status.localeCompare(b.status) * direction
      case "patient": {
        const an = getPatient(a)?.full_name ?? ""
        const bn = getPatient(b)?.full_name ?? ""
        return an.localeCompare(bn) * direction
      }
      case "service": {
        const al = getServiceDisplay(a).label
        const bl = getServiceDisplay(b).label
        return al.localeCompare(bl) * direction
      }
      default:
        return 0
    }
  })
}

function intakeMatchesQuickFilter(
  intake: LedgerRow,
  filterId: string,
): boolean {
  switch (filterId) {
    case "priority":
    case "express":
      return Boolean((intake as { is_priority?: boolean }).is_priority)
    case "stale":
      return isStale(intake)
    case "awaiting_script":
      return intake.status === "awaiting_script"
    case "failed_payment":
      return (
        intake.status === "checkout_failed" ||
        (intake as { payment_status?: string }).payment_status === "failed"
      )
    case "refunded": {
      const status = (intake as { payment_status?: string }).payment_status
      return status === "refunded" || status === "partially_refunded"
    }
    case "refund_failed":
      return (intake as { refund_status?: string }).refund_status === "failed"
    case "mine":
      // "mine" means assigned to current admin. With one admin today this is
      // always true; future hire path will compare claimed_by to current user.
      return Boolean((intake as { reviewed_by?: string }).reviewed_by)
    default:
      return true
  }
}

export function AdminIntakesLedgerClient({
  allIntakes,
  initialFilters,
}: AdminIntakesLedgerClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openPanel } = usePanel()
  const searchRef = useRef<HTMLInputElement>(null)

  const [intakes, setIntakes] = useState(allIntakes)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [refundTarget, setRefundTarget] = useState<CaseRowData | null>(null)
  const [isRefundPending, startRefundTransition] = useTransition()

  const handleRefund = useCallback(() => {
    if (!refundTarget) return
    startRefundTransition(async () => {
      const result = await issueRefundAction(refundTarget.id)
      if (result.success) {
        setRefundTarget(null)
        const amountText = result.amount ? ` ($${(result.amount / 100).toFixed(2)})` : ""
        toast.success(`Refund processed${amountText}`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Failed to process refund")
      }
    })
  }, [refundTarget, router])
  const [searchQuery, setSearchQuery] = useState(initialFilters?.q ?? "")
  const [statusFilter] = useState<AdminIntakeStatusFilterValue>(
    initialFilters?.status ?? "all",
  )
  const [serviceFilter] = useState<AdminServiceFilterValue>(
    (initialFilters?.service as AdminServiceFilterValue) ?? "all",
  )
  const [workLaneFilter] = useState<AdminWorkLaneFilterValue>(
    initialFilters?.workLane ?? "all",
  )

  const initialSort: SortState = useMemo(() => {
    const field = searchParams.get("sort")
    const dir = searchParams.get("dir")
    if (isSortField(field) && (dir === "asc" || dir === "desc")) {
      return { field, direction: dir }
    }
    return DEFAULT_SORT
  }, [searchParams])

  const initialQuickFilters = useMemo(() => {
    const raw = searchParams.get("chips")
    return parseQuickFilterParams(raw)
  }, [searchParams])

  const initialSmart = searchParams.get("smart") === "1"

  const [sortState, setSortState] = useState<SortState>(initialSort)
  const [activeChips, setActiveChips] = useState<Set<string>>(initialQuickFilters)
  const [smartSort, setSmartSort] = useState<boolean>(initialSmart)
  const [density, setDensity] = useDensity()

  // Sync URL params → state on SPA navigation (e.g. deep-linked filter views).
  // Uses functional setState that returns `prev` when unchanged so React bails out
  // and the state→URL write-back effect doesn't re-fire (no infinite loop).
  useEffect(() => {
    const field = searchParams.get("sort")
    const dir = searchParams.get("dir")
    const newSort: SortState = isSortField(field) && (dir === "asc" || dir === "desc")
      ? { field, direction: dir }
      : DEFAULT_SORT
    setSortState(prev =>
      prev.field === newSort.field && prev.direction === newSort.direction ? prev : newSort
    )

    const raw = searchParams.get("chips")
    const newChipValues = [...parseQuickFilterParams(raw)]
    setActiveChips(prev => {
      if (prev.size === newChipValues.length && newChipValues.every(c => prev.has(c))) return prev
      return new Set(newChipValues)
    })

    const newSmart = searchParams.get("smart") === "1"
    setSmartSort(prev => prev === newSmart ? prev : newSmart)
   
  }, [searchParams])

  // Mirror state → URL so the view is shareable.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (sortState.field === DEFAULT_SORT.field && sortState.direction === DEFAULT_SORT.direction) {
      params.delete("sort")
      params.delete("dir")
    } else {
      params.set("sort", sortState.field)
      params.set("dir", sortState.direction)
    }
    if (activeChips.size > 0) {
      params.set("chips", [...activeChips].join(","))
    } else {
      params.delete("chips")
    }
    if (smartSort) params.set("smart", "1")
    else params.delete("smart")
    const queryString = params.toString()
    const next = queryString ? `?${queryString}` : ""
    router.replace(`${STAFF_LEDGER_HREF}${next}`, { scroll: false })
  }, [sortState, activeChips, smartSort, router, searchParams])

  // Keep local list in sync if server-side data refreshes (e.g. revalidation).
  useEffect(() => {
    setIntakes(allIntakes)
  }, [allIntakes])

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = intakes.filter((intake) => {
      const patient = getPatient(intake)
      const service = getService(intake)
      const serviceDisplay = getServiceDisplay(intake)
      const normalizedPhone = patient?.phone?.replace(/\s+/g, "").toLowerCase()
      const normalizedQueryPhone = query.replace(/\s+/g, "")

      const matchesSearch =
        !query ||
        patient?.full_name?.toLowerCase().includes(query) ||
        patient?.suburb?.toLowerCase().includes(query) ||
        patient?.email?.toLowerCase().includes(query) ||
        normalizedPhone?.includes(normalizedQueryPhone) ||
        intake.id.toLowerCase().includes(query) ||
        intake.reference_number?.toLowerCase().includes(query) ||
        serviceDisplay.label.toLowerCase().includes(query) ||
        serviceDisplay.shortLabel.toLowerCase().includes(query)

      const matchesStatus = matchesAdminStatusFilter(intake.status, statusFilter)
      const matchesLane = matchesAdminWorkLaneFilter(intake.status, workLaneFilter)
      const matchesService = matchesAdminServiceFilter(
        { type: service?.type, category: intake.category },
        serviceFilter,
      )

      const matchesChips =
        activeChips.size === 0 ||
        [...activeChips].every((chipId) =>
          intakeMatchesQuickFilter(intake, chipId),
        )

      return (
        matchesSearch &&
        matchesLane &&
        matchesStatus &&
        matchesService &&
        matchesChips
      )
    })

    return sortIntakes(filtered, sortState, smartSort)
  }, [
    intakes,
    searchQuery,
    statusFilter,
    serviceFilter,
    workLaneFilter,
    activeChips,
    sortState,
    smartSort,
  ])

  const caseRows = useMemo(
    () => filteredAndSorted.map(mapToCaseRow),
    [filteredAndSorted],
  )

  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const filter of QUICK_FILTERS) {
      counts[filter.id] = intakes.filter((intake) =>
        intakeMatchesQuickFilter(intake, filter.id),
      ).length
    }
    return counts
  }, [intakes])

  const quickFiltersWithCounts: QuickFilter[] = QUICK_FILTERS.map((filter) => ({
    ...filter,
    count: chipCounts[filter.id] ?? 0,
  }))

  // Today's daily volume (unfiltered) so operators see real workload before
  // any chip/search trims the visible rows. Hidden when the day is empty;
  // renewal count omitted when zero so we never show misleading "0 renewals".
  const dailyAggregate = useMemo(
    () =>
      computeLedgerDailyAggregate(
        intakes.map((intake) => ({
          created_at: intake.created_at,
          isRenewal: Boolean(
            (intake as { is_renewal?: boolean }).is_renewal,
          ),
        })),
      ),
    [intakes],
  )

  const dailyAggregateLabel = (() => {
    if (dailyAggregate.total === 0) return null
    const intakesLabel = `${dailyAggregate.total} ${dailyAggregate.total === 1 ? "intake" : "intakes"}`
    if (dailyAggregate.renewals === 0) {
      return `Today: ${intakesLabel}`
    }
    const renewalsLabel = `${dailyAggregate.renewals} ${dailyAggregate.renewals === 1 ? "renewal" : "renewals"}`
    return `Today: ${intakesLabel} · ${renewalsLabel}`
  })()

  const handleSortChange = useCallback((next: SortState) => {
    setSortState(next)
  }, [])

  const toggleChip = useCallback((id: string) => {
    setActiveChips((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const openCaseSlideover = useCallback(
    (intakeId: string) => {
      const list = caseRows
      const currentIndex = list.findIndex((row) => row.id === intakeId)
      setSelectedRowId(intakeId)
      openPanel({
        id: `admin-intake-review-${intakeId}`,
        type: "sheet",
        component: (
          <IntakeReviewPanel
            intakeId={intakeId}
            caseIndex={currentIndex >= 0 ? currentIndex : undefined}
            totalCases={list.length > 0 ? list.length : undefined}
            profileMode="admin"
            onActionComplete={() => {
              setIntakes((prev) => prev.filter((i) => i.id !== intakeId))
              setSelectedRowId((current) => (current === intakeId ? null : current))
            }}
          />
        ),
      })
    },
    [caseRows, openPanel],
  )

  // Keyboard: "/" focuses search; ArrowDown/Up move selection through the
  // visible list; Enter opens the slide-over for the highlighted row.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      const isInsideDialog =
        target instanceof Element && Boolean(target.closest("[role='dialog']"))
      if (isInsideDialog) return

      if (event.key === "/" && !isTyping) {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }

      if (event.key === "ArrowDown" && !isTyping) {
        event.preventDefault()
        setSelectedRowId((current) => {
          const ids = caseRows.map((row) => row.id)
          if (ids.length === 0) return current
          const idx = current ? ids.indexOf(current) : -1
          const nextIdx = Math.min(idx + 1, ids.length - 1)
          return ids[nextIdx] ?? null
        })
        return
      }

      if (event.key === "ArrowUp" && !isTyping) {
        event.preventDefault()
        setSelectedRowId((current) => {
          const ids = caseRows.map((row) => row.id)
          if (ids.length === 0) return current
          const idx = current ? ids.indexOf(current) : 0
          const nextIdx = Math.max(idx - 1, 0)
          return ids[nextIdx] ?? null
        })
        return
      }

      if (event.key === "Enter" && !isTyping && selectedRowId) {
        event.preventDefault()
        openCaseSlideover(selectedRowId)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [caseRows, openCaseSlideover, selectedRowId])

  const totalLabel = `${caseRows.length} of ${allIntakes.length}`

  const sortIsDefault =
    sortState.field === DEFAULT_SORT.field &&
    sortState.direction === DEFAULT_SORT.direction &&
    !smartSort

  return (
    <div className="flex flex-col gap-4">
      {dailyAggregateLabel ? (
        <div
          className="text-xs tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {dailyAggregateLabel}
        </div>
      ) : null}

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        density={density}
        onDensityChange={setDensity}
        quickFilters={quickFiltersWithCounts}
        activeFilters={activeChips}
        onToggleFilter={toggleChip}
        totalLabel={totalLabel}
        rightSlot={
          <Button
            type="button"
            variant={smartSort ? "default" : "outline"}
            size="sm"
            onClick={() => setSmartSort((v) => !v)}
            className="h-9"
            title="Group by work priority before time"
          >
            {smartSort ? "Smart sort: on" : "Smart sort: off"}
          </Button>
        }
      />

      <CaseTable
        rows={caseRows}
        density={density}
        sortable
        sortState={sortState}
        onSortChange={handleSortChange}
        groupByTime={sortIsDefault}
        onRowPrimary={openCaseSlideover}
        selectedRowId={selectedRowId}
        rowActions={(row) => {
          const isEligible =
            row.paymentStatus === "paid" || row.paymentStatus === "partially_refunded"
          if (!isEligible) return null
          return (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Issue refund"
              aria-label={`Issue refund for ${row.patientName}`}
              onClick={(e) => {
                e.stopPropagation()
                setRefundTarget(row)
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )
        }}
        emptyState={{
          title: "No matches",
          body:
            activeChips.size > 0 || searchQuery.trim().length > 0
              ? "Try clearing filters or the search box."
              : "No requests in the last 30 days.",
        }}
      />

      <IntakeRefundDialog
        open={refundTarget !== null}
        onOpenChange={(open) => { if (!open) setRefundTarget(null) }}
        onConfirmRefund={handleRefund}
        isPending={isRefundPending}
        paidAmountCents={refundTarget?.amountCents ?? 0}
        alreadyRefundedCents={refundTarget?.refundAmountCents ?? 0}
        patientName={refundTarget?.patientName ?? "the patient"}
      />
    </div>
  )
}

"use client"

import { ChevronLeft, ChevronRight, Copy, Loader2, RotateCcw, X } from "lucide-react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import type { LedgerFilterSelectsProps } from "@/app/admin/intakes/ledger-filter-selects"
import { buildPaymentRescueAction } from "@/app/admin/intakes/payment-rescue-action"
import {
  type AdminLedgerSearchData,
  searchAdminLedgerAction,
} from "@/app/admin/intakes/search-actions"
import { issueRefundAction } from "@/app/doctor/queue/actions"
import { CaseMobileList } from "@/components/operator/cases/case-mobile-list"
import { CaseTable } from "@/components/operator/cases/case-table"
import { FilterBar, type QuickFilter } from "@/components/operator/cases/filter-bar"
import { usePanel } from "@/components/panels/panel-provider"
import { Button } from "@/components/ui/button"
import { parseIntakeFlags } from "@/lib/clinical/intake-flags"
import {
  ADMIN_LEDGER_QUICK_FILTER_OPTIONS,
  type AdminLedgerQuickFilterValue,
  sanitizeAdminLedgerSearchTerm,
} from "@/lib/dashboard/admin-ledger-filters"
import {
  ADMIN_WORK_LANE_FILTER_OPTIONS,
  type AdminIntakeStatusFilterValue,
  type AdminWorkLaneFilterValue,
} from "@/lib/dashboard/admin-work-lanes"
import { buildAdminIntakeHref, STAFF_LEDGER_HREF } from "@/lib/dashboard/routes"
import type { IntakeStatus } from "@/lib/data/status"
import {
  formatRenewalMatchTitle,
  type RenewalMatch,
} from "@/lib/doctor/renewal-format"
import { useDebounce } from "@/lib/hooks/use-debounce"
import type { CaseRowAttribution } from "@/lib/operator/cases/case-attribution"
import { getPaymentRecoveryIndicator } from "@/lib/operator/cases/payment-recovery-indicator"
import {
  type CaseRowData,
  type RefundIndicator,
} from "@/lib/operator/cases/types"
import { useDensity } from "@/lib/operator/cases/use-density"
import {
  type AdminServiceFilterValue,
  getServicePresentation,
} from "@/lib/services/service-presentation"
import type { IntakeWithPatient } from "@/types/db"

export interface AdminIntakesLedgerInitialFilters {
  service?: AdminServiceFilterValue
  status?: AdminIntakeStatusFilterValue
  workLane?: AdminWorkLaneFilterValue
  chips?: AdminLedgerQuickFilterValue[]
}

type LedgerRow = IntakeWithPatient & {
  attribution?: CaseRowAttribution | null
}

type ActiveAdminLedgerSearchView = AdminLedgerSearchData & {
  query: string
}

type AdminIntakesLedgerClientProps = {
  rows: LedgerRow[]
  total: number | null
  page: number
  pageSize: number
  degraded?: boolean
  patientSearchUnavailable?: boolean
  patientSearchSaturated?: boolean
  viewerRole: "admin" | "support"
  initialFilters?: AdminIntakesLedgerInitialFilters
}

type LazyIntakeReviewPanelProps = {
  intakeId: string
  caseIndex?: number
  totalCases?: number
  profileMode?: "doctor" | "admin"
  onActionComplete?: (options?: { advance?: boolean }) => void
}

type LazyIntakeRefundDialogProps = {
  alreadyRefundedCents: number
  isPending: boolean
  onConfirmRefund: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  paidAmountCents: number
  patientName: string
}

function IntakeReviewPanelLoading() {
  const { closePanel } = usePanel()

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel()
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [closePanel])

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close case review"
        onClick={closePanel}
      />
      <div
        className="absolute inset-y-0 right-0 w-full max-w-[1040px] border-l border-border/60 bg-background p-6 shadow-2xl"
        aria-busy="true"
        aria-label="Loading case review"
        aria-modal="true"
        role="dialog"
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close case review"
          onClick={closePanel}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-4 pr-10 motion-safe:animate-pulse">
          <div className="h-7 w-56 rounded-md bg-muted" />
          <div className="h-4 w-32 rounded-full bg-muted" />
          <div className="h-28 rounded-xl bg-muted/70" />
          <div className="h-40 rounded-xl bg-muted/70" />
        </div>
      </div>
    </div>
  )
}

const IntakeReviewPanel = dynamic<LazyIntakeReviewPanelProps>(
  () => import("@/components/doctor/intake-review-panel").then(
    (module) => module.IntakeReviewPanel,
  ),
  { loading: () => <IntakeReviewPanelLoading /> },
)

const IntakeRefundDialog = dynamic<LazyIntakeRefundDialogProps>(
  () => import("@/components/doctor/intake-refund-dialog").then(
    (module) => module.IntakeRefundDialog,
  ),
)

function LedgerFilterSelectsLoading() {
  return (
    <div
      className="grid grid-cols-2 gap-2 lg:mb-[35px] lg:flex"
      aria-label="Loading service and status filters"
      role="status"
    >
      <span className="sr-only">Loading filters</span>
      <span className="min-h-10 rounded-md border border-border bg-muted/40 motion-safe:animate-pulse lg:w-[190px]" />
      <span className="min-h-10 rounded-md border border-border bg-muted/40 motion-safe:animate-pulse lg:w-[175px]" />
    </div>
  )
}

const LedgerFilterSelects = dynamic<LedgerFilterSelectsProps>(
  () => import("@/app/admin/intakes/ledger-filter-selects").then(
    (module) => module.LedgerFilterSelects,
  ),
  { loading: () => <LedgerFilterSelectsLoading />, ssr: false },
)

const QUICK_FILTERS: QuickFilter[] = ADMIN_LEDGER_QUICK_FILTER_OPTIONS.map(
  ({ value, label }) => ({ id: value, label }),
)

function getPatient(intake: LedgerRow) {
  return intake.patient as
    | {
        id?: string
        full_name?: string
        suburb?: string
        state?: string
        email?: string
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

function mapToCaseRow(
  intake: LedgerRow,
  viewerRole: "admin" | "support",
): CaseRowData {
  const patient = getPatient(intake)
  const service = getServiceDisplay(intake)
  const paymentStatus = (intake as { payment_status?: string | null }).payment_status ?? null
  const location = [patient?.suburb, patient?.state].filter(Boolean).join(", ")
  const renewalMatch = (intake as { renewal_match?: RenewalMatch | null }).renewal_match ?? null

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
    href: viewerRole === "admin" ? buildAdminIntakeHref(intake.id) : null,
    isPriority: Boolean((intake as { is_priority?: boolean }).is_priority),
    refundIndicator: getRefundIndicator(intake),
    paymentRecoveryIndicator: getPaymentRecoveryIndicator({
      status: intake.status,
      paymentStatus,
    }),
    isRenewal: viewerRole === "admin" && Boolean((intake as { is_renewal?: boolean }).is_renewal),
    renewalMatchTitle: renewalMatch ? formatRenewalMatchTitle(renewalMatch) : null,
    intakeFlags: viewerRole === "admin"
      ? parseIntakeFlags((intake as { risk_flags?: unknown }).risk_flags)
      : [],
    paymentStatus,
    amountCents: (intake as { amount_cents?: number | null }).amount_cents ?? null,
    refundAmountCents: (intake as { refund_amount_cents?: number | null }).refund_amount_cents ?? null,
    attribution: viewerRole === "admin" ? intake.attribution ?? null : null,
  }
}

export function AdminIntakesLedgerClient({
  rows: initialRows,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
  degraded: initialDegraded = false,
  patientSearchUnavailable: initialPatientSearchUnavailable = false,
  patientSearchSaturated: initialPatientSearchSaturated = false,
  viewerRole,
  initialFilters,
}: AdminIntakesLedgerClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { openPanel } = usePanel()
  const searchRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 350)
  const [activeSearchView, setActiveSearchView] = useState<ActiveAdminLedgerSearchView | null>(null)
  const [isSearchPending, setIsSearchPending] = useState(false)
  const searchRequestSequenceRef = useRef(0)
  const previousDebouncedQueryRef = useRef("")
  const lastSearchEffectKeyRef = useRef("")
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [refundTarget, setRefundTarget] = useState<CaseRowData | null>(null)
  const [isRefundPending, startRefundTransition] = useTransition()
  const [paymentRescueTargetId, setPaymentRescueTargetId] = useState<string | null>(null)
  const [isPaymentRescuePending, startPaymentRescueTransition] = useTransition()
  const [isFilterPending, startFilterTransition] = useTransition()
  const [density, setDensity] = useDensity()
  const isAdmin = viewerRole === "admin"
  const rows = activeSearchView?.data ?? initialRows
  const total = activeSearchView ? activeSearchView.total : initialTotal
  const page = activeSearchView?.page ?? initialPage
  const pageSize = activeSearchView?.pageSize ?? initialPageSize
  const degraded = activeSearchView?.degraded ?? initialDegraded
  const patientSearchUnavailable = activeSearchView?.patientSearchUnavailable
    ?? initialPatientSearchUnavailable
  const patientSearchSaturated = activeSearchView?.patientSearchSaturated
    ?? initialPatientSearchSaturated

  const activeChips = useMemo(
    () => new Set(initialFilters?.chips ?? []),
    [initialFilters?.chips],
  )
  const caseRows = useMemo(
    () => rows.map((intake) => mapToCaseRow(intake, viewerRole)),
    [rows, viewerRole],
  )

  const replaceParams = useCallback((
    updates: Record<string, string | null>,
    options: { resetPage?: boolean } = {},
  ) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("q")
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    if (options.resetPage !== false) params.delete("page")
    const query = params.toString()
    startFilterTransition(() => {
      router.replace(query ? `${STAFF_LEDGER_HREF}?${query}` : STAFF_LEDGER_HREF, {
        scroll: false,
      })
    })
  }, [router, searchParams])

  const runLedgerSearch = useCallback(async (query: string, requestedPage: number) => {
    const normalizedQuery = sanitizeAdminLedgerSearchTerm(query)
    if (!normalizedQuery) return

    const sequence = ++searchRequestSequenceRef.current
    setIsSearchPending(true)
    try {
      const result = await searchAdminLedgerAction({
        query: normalizedQuery,
        page: requestedPage,
        pageSize: initialPageSize,
        service: initialFilters?.service,
        status: initialFilters?.status,
        workLane: initialFilters?.workLane,
        chips: initialFilters?.chips,
      })
      if (sequence !== searchRequestSequenceRef.current) return

      if (result.success) {
        setActiveSearchView({ ...result.data, query: normalizedQuery })
        return
      }

      setActiveSearchView({
        query: normalizedQuery,
        data: [],
        total: null,
        page: requestedPage,
        pageSize: initialPageSize,
        degraded: true,
        patientSearchUnavailable: false,
        patientSearchSaturated: false,
      })
      toast.error(result.error)
    } catch {
      if (sequence !== searchRequestSequenceRef.current) return
      setActiveSearchView({
        query: normalizedQuery,
        data: [],
        total: null,
        page: requestedPage,
        pageSize: initialPageSize,
        degraded: true,
        patientSearchUnavailable: false,
        patientSearchSaturated: false,
      })
      toast.error("The request-ledger lookup could not be completed.")
    } finally {
      if (sequence === searchRequestSequenceRef.current) setIsSearchPending(false)
    }
  }, [
    initialFilters?.chips,
    initialFilters?.service,
    initialFilters?.status,
    initialFilters?.workLane,
    initialPageSize,
  ])

  useEffect(() => {
    const normalizedSearch = sanitizeAdminLedgerSearchTerm(debouncedSearch)
    const queryChanged = normalizedSearch !== previousDebouncedQueryRef.current
    previousDebouncedQueryRef.current = normalizedSearch

    if (!normalizedSearch) {
      searchRequestSequenceRef.current += 1
      lastSearchEffectKeyRef.current = ""
      setIsSearchPending(false)
      setActiveSearchView(null)
      return
    }

    const requestedPage = queryChanged ? 1 : initialPage
    const effectKey = [
      normalizedSearch,
      requestedPage,
      initialPageSize,
      initialFilters?.service ?? "all",
      initialFilters?.status ?? "all",
      initialFilters?.workLane ?? "all",
      (initialFilters?.chips ?? []).join(","),
    ].join("\u0000")
    if (effectKey === lastSearchEffectKeyRef.current) return
    lastSearchEffectKeyRef.current = effectKey

    if (queryChanged && initialPage !== 1) {
      replaceParams({ page: null }, { resetPage: false })
    }
    void runLedgerSearch(normalizedSearch, requestedPage)
  }, [
    debouncedSearch,
    initialFilters?.chips,
    initialFilters?.service,
    initialFilters?.status,
    initialFilters?.workLane,
    initialPage,
    initialPageSize,
    replaceParams,
    runLedgerSearch,
  ])

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

  const handleCopyPaymentRescue = useCallback((row: CaseRowData) => {
    setPaymentRescueTargetId(row.id)
    startPaymentRescueTransition(async () => {
      try {
        const result = await buildPaymentRescueAction(row.id)
        if (!result.success) {
          toast.error(result.error)
          return
        }
        await navigator.clipboard.writeText(result.data.clipboardText)
        toast.success("Payment reply copied")
      } catch {
        toast.error("Couldn't prepare the reply. Try again.")
      } finally {
        setPaymentRescueTargetId(null)
      }
    })
  }, [])

  const toggleChip = useCallback((id: string) => {
    const next = new Set(activeChips)
    if (next.has(id as AdminLedgerQuickFilterValue)) {
      next.delete(id as AdminLedgerQuickFilterValue)
    } else {
      next.add(id as AdminLedgerQuickFilterValue)
    }
    replaceParams({ chips: next.size > 0 ? [...next].join(",") : null })
  }, [activeChips, replaceParams])

  const openCaseSlideover = useCallback((intakeId: string) => {
    if (!isAdmin) return
    const currentIndex = caseRows.findIndex((row) => row.id === intakeId)
    setSelectedRowId(intakeId)
    openPanel({
      id: `admin-intake-review-${intakeId}`,
      type: "sheet",
      component: (
        <IntakeReviewPanel
          intakeId={intakeId}
          caseIndex={currentIndex >= 0 ? currentIndex : undefined}
          totalCases={caseRows.length || undefined}
          profileMode="admin"
          onActionComplete={() => {
            setSelectedRowId(null)
            router.refresh()
          }}
        />
      ),
    })
  }, [caseRows, isAdmin, openPanel, router])

  useEffect(() => {
    if (!isAdmin) return
    const handler = (event: KeyboardEvent) => {
      const target = event.target
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      const isInsideDialog = target instanceof Element && Boolean(target.closest("[role='dialog']"))
      if (isInsideDialog) return

      if (event.key === "/" && !isTyping) {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !isTyping) {
        event.preventDefault()
        const ids = caseRows.map((row) => row.id)
        if (ids.length === 0) return
        const currentIndex = selectedRowId ? ids.indexOf(selectedRowId) : -1
        const nextIndex = event.key === "ArrowDown"
          ? Math.min(currentIndex + 1, ids.length - 1)
          : Math.max(currentIndex < 0 ? 0 : currentIndex - 1, 0)
        setSelectedRowId(ids[nextIndex] ?? null)
        return
      }
      if (event.key === "Enter" && !isTyping && selectedRowId) {
        event.preventDefault()
        openCaseSlideover(selectedRowId)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [caseRows, isAdmin, openCaseSlideover, selectedRowId])

  const firstVisible = rows.length > 0 ? (page - 1) * pageSize + 1 : 0
  const lastVisible = rows.length > 0 ? firstVisible + rows.length - 1 : 0
  const totalLabel = patientSearchSaturated
    ? "Narrow search to continue"
    : total === null
      ? `${rows.length.toLocaleString("en-AU")} shown · total unavailable`
      : rows.length === 0
        ? `${total.toLocaleString("en-AU")} requests`
        : `${firstVisible.toLocaleString("en-AU")}–${lastVisible.toLocaleString("en-AU")} of ${total.toLocaleString("en-AU")}`
  const hasNextPage = total === null ? rows.length === pageSize : lastVisible < total
  const hasFilters = Boolean(
    sanitizeAdminLedgerSearchTerm(searchQuery) ||
    (initialFilters?.service && initialFilters.service !== "all") ||
    (initialFilters?.status && initialFilters.status !== "all") ||
    (initialFilters?.workLane && initialFilters.workLane !== "all") ||
    activeChips.size > 0,
  )
  const isLedgerPending = isFilterPending || isSearchPending
  const clearFilters = () => {
    searchRequestSequenceRef.current += 1
    setSearchQuery("")
    setActiveSearchView(null)
    setIsSearchPending(false)
    router.replace(STAFF_LEDGER_HREF, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3">
      {patientSearchSaturated ? (
        <div className="rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-sm text-warning" role="status">
          <p className="font-medium">Too many patient profiles match this search.</p>
          <p>Add more of the name, email, suburb, or state to narrow it.</p>
        </div>
      ) : degraded ? (
        <div className="rounded-lg border border-warning-border bg-warning-light px-3 py-2 text-xs text-warning" role="status">
          {patientSearchUnavailable
            ? "Patient search is temporarily unavailable. Request reference and ID search still work."
            : "Some ledger evidence could not be read. Visible rows are preserved, but totals may be unavailable."}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Work lane">
        {ADMIN_WORK_LANE_FILTER_OPTIONS.map((option) => {
          const active = (initialFilters?.workLane ?? "all") === option.value
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className="min-h-9"
              aria-pressed={active}
              onClick={() => replaceParams({ workLane: option.value === "all" ? null : option.value })}
            >
              {option.label}
            </Button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <FilterBar
          className="min-w-0 flex-1"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchRef}
          searchPlaceholder={isAdmin
            ? "Search patient, request ID, email, suburb, or state..."
            : "Search request ID or reference..."}
          density={density}
          onDensityChange={setDensity}
          quickFilters={QUICK_FILTERS}
          activeFilters={activeChips}
          onToggleFilter={toggleChip}
          totalLabel={totalLabel}
        />

        <LedgerFilterSelects
          service={initialFilters?.service ?? "all"}
          status={initialFilters?.status ?? "all"}
          onServiceChange={(value) => replaceParams({ service: value === "all" ? null : value })}
          onStatusChange={(value) => replaceParams({ status: value === "all" ? null : value })}
        />
      </div>

      {isLedgerPending ? (
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {isSearchPending ? "Searching ledger…" : "Updating ledger…"}
        </div>
      ) : null}

      {!patientSearchSaturated ? (
        <>
          <div className="sm:hidden">
            <CaseMobileList
              rows={caseRows}
              groupByTime
              onRowPrimary={isAdmin ? openCaseSlideover : undefined}
              selectedRowId={isAdmin ? selectedRowId : null}
              rowActions={(row) => {
                const canRefund = row.paymentStatus === "paid" || row.paymentStatus === "partially_refunded"
                const canCopyPaymentRescue = row.paymentRecoveryIndicator === "payment_pending" || row.paymentRecoveryIndicator === "payment_retry"
                if (!canRefund && !canCopyPaymentRescue) return null
                return (
                  <>
                    {canCopyPaymentRescue ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 flex-1 px-3 text-sm"
                        aria-label={`Copy payment recovery reply for ${row.patientName}`}
                        disabled={isPaymentRescuePending}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleCopyPaymentRescue(row)
                        }}
                      >
                        {isPaymentRescuePending && paymentRescueTargetId === row.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Copy className="h-4 w-4" />}
                        Copy payment reply
                      </Button>
                    ) : null}
                    {canRefund ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11 flex-1 px-3 text-sm"
                        aria-label={`Issue refund for ${row.patientName}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setRefundTarget(row)
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Issue refund
                      </Button>
                    ) : null}
                  </>
                )
              }}
              emptyState={{
                title: hasFilters ? "No matching requests" : "No recent requests",
                body: hasFilters
                  ? "Clear one or more filters to broaden the server search."
                  : "No requests were created in the last 30 days.",
                action: hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined,
              }}
            />
          </div>

          <div className="hidden overflow-x-auto rounded-xl sm:block">
            <CaseTable
              rows={caseRows}
              density={density}
              groupByTime
              className="min-w-[760px]"
              onRowPrimary={isAdmin ? openCaseSlideover : undefined}
              selectedRowId={isAdmin ? selectedRowId : null}
              rowActions={(row) => {
                const canRefund = row.paymentStatus === "paid" || row.paymentStatus === "partially_refunded"
                const canCopyPaymentRescue = row.paymentRecoveryIndicator === "payment_pending" || row.paymentRecoveryIndicator === "payment_retry"
                if (!canRefund && !canCopyPaymentRescue) return null
                return (
                  <>
                    {canCopyPaymentRescue ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 sm:h-8 sm:w-8"
                        title="Copy payment reply"
                        aria-label={`Copy payment recovery reply for ${row.patientName}`}
                        disabled={isPaymentRescuePending}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleCopyPaymentRescue(row)
                        }}
                      >
                        {isPaymentRescuePending && paymentRescueTargetId === row.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    ) : null}
                    {canRefund ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 sm:h-8 sm:w-8"
                        title="Issue refund"
                        aria-label={`Issue refund for ${row.patientName}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setRefundTarget(row)
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </>
                )
              }}
              emptyState={{
                title: hasFilters ? "No matching requests" : "No recent requests",
                body: hasFilters
                  ? "Clear one or more filters to broaden the server search."
                  : "No requests were created in the last 30 days.",
                action: hasFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined,
              }}
            />
          </div>
        </>
      ) : null}

      {!patientSearchSaturated ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <span className="text-xs tabular-nums text-muted-foreground">{totalLabel}</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={page <= 1 || isLedgerPending}
              onClick={() => replaceParams({ page: String(page - 1) }, { resetPage: false })}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">Page {page}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
              disabled={!hasNextPage || isLedgerPending}
              onClick={() => replaceParams({ page: String(page + 1) }, { resetPage: false })}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {refundTarget ? (
        <IntakeRefundDialog
          open
          onOpenChange={(open) => { if (!open) setRefundTarget(null) }}
          onConfirmRefund={handleRefund}
          isPending={isRefundPending}
          paidAmountCents={refundTarget.amountCents ?? 0}
          alreadyRefundedCents={refundTarget.refundAmountCents ?? 0}
          patientName={refundTarget.patientName}
        />
      ) : null}
    </div>
  )
}

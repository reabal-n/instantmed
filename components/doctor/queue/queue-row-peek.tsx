"use client"

import { AlertTriangle, FileText, Sparkles, Stethoscope } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { ReviewData } from "@/components/doctor/review/intake-review-context"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { consumePrefetchedData, prefetchReviewData } from "@/lib/doctor/review-data-cache"

/**
 * QueueRowPeek — hover-triggered AI summary on the queue row.
 *
 * Phase 8 of dashboard remaster (2026-05-12). Surfaces a compact AI
 * summary + risk + chief complaint on row hover, before the operator
 * commits to opening the case. Reduces decision-cost-per-row.
 *
 * Behaviour:
 * - 300ms hover delay before the peek opens (matches Radix Tooltip
 *   default; below threshold for accidental triggers).
 * - Fetches the same `/api/doctor/intakes/[id]/review-data` payload the
 *   slide-over uses, then reads the AI clinical draft summary + risk
 *   reasons + chief complaint. No new endpoint.
 * - Uses Radix Popover under the hood for portal-out positioning so the
 *   peek can overflow the queue pane and float over the detail column.
 *
 * Motion budget: `transition-colors duration-150` only (Radix default
 * popover animation is opt-out via no animation classes). Respect-
 * Reduced-Motion is honoured by the Tailwind classes — no transforms,
 * no scale animations. Renders nothing if the operator opens the case
 * (selection drives detail; peek is for pre-selection scanning).
 */

const HOVER_OPEN_DELAY_MS = 300
// Slightly generous close delay so the cursor can bridge the 12px
// sideOffset gap to the popover content without flickering.
const HOVER_CLOSE_DELAY_MS = 150

interface QueueRowPeekProps {
  intakeId: string
  /** When true (row is selected/open), the peek is suppressed. */
  suppressed?: boolean
  children: React.ReactNode
}

interface PeekData {
  patientName: string | null
  serviceLabel: string | null
  chiefComplaint: string | null
  aiSummary: string | null
  riskTier: string | null
  riskFlags: string[]
  hasRedFlags: boolean
}

function extractPeekData(review: ReviewData): PeekData {
  const intake = review.intake
  const service = intake.service as { name?: string; short_name?: string; type?: string } | undefined
  const intakeAnswers = (intake.answers?.answers ?? {}) as Record<string, unknown>

  // AI clinical-note draft. The canonical shape is `clinical_note` with
  // content { presentingComplaint, historyOfPresentIllness, ... } (see
  // `app/actions/drafts/types.ts:ClinicalNoteContent`). Fall back through a
  // couple of less-canonical content keys for older draft revisions.
  const draftEntry = (review.aiDrafts ?? []).find(
    (entry) => entry.type === "clinical_note" || entry.type === "med_cert",
  )
  let aiSummary: string | null = null
  if (draftEntry?.content) {
    const content = draftEntry.content as Record<string, unknown>
    aiSummary = (
      (typeof content.presentingComplaint === "string" && content.presentingComplaint) ||
      (typeof content.historyOfPresentIllness === "string" && content.historyOfPresentIllness) ||
      (typeof content.impression === "string" && content.impression) ||
      (typeof content.assessment === "string" && content.assessment) ||
      (typeof content.summary === "string" && content.summary) ||
      (typeof content.plan === "string" && content.plan) ||
      null
    ) as string | null
  }

  const chiefComplaint =
    (typeof intakeAnswers.chief_complaint === "string" && intakeAnswers.chief_complaint) ||
    (typeof intakeAnswers.symptomDetails === "string" && intakeAnswers.symptomDetails) ||
    (typeof intakeAnswers.symptoms_description === "string" && intakeAnswers.symptoms_description) ||
    null

  const riskFlags = Array.isArray(intake.risk_flags)
    ? (intake.risk_flags as unknown[]).filter((v): v is string => typeof v === "string")
    : []

  return {
    patientName: intake.patient?.full_name ?? null,
    serviceLabel: service?.short_name ?? service?.name ?? null,
    chiefComplaint,
    aiSummary,
    riskTier: intake.risk_tier ?? null,
    riskFlags,
    hasRedFlags:
      intake.risk_tier === "high" ||
      intake.requires_live_consult === true ||
      riskFlags.length > 0,
  }
}

function truncate(text: string, max = 180): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + "..."
}

export function QueueRowPeek({ intakeId, suppressed = false, children }: QueueRowPeekProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<PeekData | null>(null)
  const [loading, setLoading] = useState(false)
  const openTimeoutRef = useRef<number | null>(null)
  const closeTimeoutRef = useRef<number | null>(null)
  const fetchSequenceRef = useRef(0)

  // Clean up timers on unmount.
  useEffect(() => {
    return () => {
      if (openTimeoutRef.current != null) window.clearTimeout(openTimeoutRef.current)
      if (closeTimeoutRef.current != null) window.clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  // Fetch peek data lazily, when the popover opens.
  useEffect(() => {
    if (!open || data || loading) return
    const sequence = fetchSequenceRef.current + 1
    fetchSequenceRef.current = sequence
    setLoading(true)
    // Reuse prefetched cache when warm; otherwise prefetch + read it back.
    prefetchReviewData(intakeId)
    const cached = consumePrefetchedData(intakeId)
    const promise = cached ?? fetch(`/api/doctor/intakes/${intakeId}/review-data`)
    Promise.resolve(promise)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = (await res.json()) as ReviewData
        if (fetchSequenceRef.current === sequence) {
          setData(extractPeekData(payload))
          setLoading(false)
        }
      })
      .catch(() => {
        if (fetchSequenceRef.current === sequence) setLoading(false)
      })
  }, [open, intakeId, data, loading])

  const handleEnter = () => {
    if (suppressed) return
    if (closeTimeoutRef.current != null) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    if (openTimeoutRef.current != null) return
    openTimeoutRef.current = window.setTimeout(() => {
      openTimeoutRef.current = null
      setOpen(true)
    }, HOVER_OPEN_DELAY_MS)
  }

  const handleLeave = () => {
    if (openTimeoutRef.current != null) {
      window.clearTimeout(openTimeoutRef.current)
      openTimeoutRef.current = null
    }
    if (!open) return
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null
      setOpen(false)
    }, HOVER_CLOSE_DELAY_MS)
  }

  return (
    <Popover open={open && !suppressed} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
          {children}
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        className="pointer-events-none w-80 p-3"
      >
        {loading && !data ? (
          <div className="space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : data ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {data.patientName ?? "Patient"}
                </p>
                {data.serviceLabel ? (
                  <p className="truncate text-[11px] text-muted-foreground">{data.serviceLabel}</p>
                ) : null}
              </div>
              {data.hasRedFlags ? (
                <Badge
                  variant="outline"
                  className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {data.riskTier === "high" ? "High risk" : "Flagged"}
                </Badge>
              ) : data.riskTier ? (
                <Badge variant="outline" className="text-[10px]">
                  {data.riskTier}
                </Badge>
              ) : null}
            </div>
            {data.chiefComplaint ? (
              <div className="rounded-lg bg-muted/40 px-2.5 py-2 text-xs leading-relaxed">
                <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Stethoscope className="h-3 w-3" aria-hidden />
                  Chief complaint
                </div>
                <p className="text-foreground">{truncate(data.chiefComplaint, 200)}</p>
              </div>
            ) : null}
            {data.aiSummary ? (
              <div className="rounded-lg border border-primary/15 bg-primary/[0.04] px-2.5 py-2 text-xs leading-relaxed">
                <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  AI assessment
                </div>
                <p className="text-foreground">{truncate(data.aiSummary, 220)}</p>
              </div>
            ) : null}
            {!data.chiefComplaint && !data.aiSummary ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                <span>No clinical summary yet. Open the case for full intake answers.</span>
              </div>
            ) : null}
            {data.riskFlags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {data.riskFlags.slice(0, 4).map((flag) => (
                  <span
                    key={flag}
                    className="rounded-full border border-warning-border bg-warning-light px-1.5 py-0.5 text-[10px] font-medium text-warning"
                  >
                    {flag}
                  </span>
                ))}
                {data.riskFlags.length > 4 ? (
                  <span className="text-[10px] text-muted-foreground">
                    +{data.riskFlags.length - 4} more
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No preview available.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}

"use client"

import Link from "next/link"

import { buildDoctorIntakeHref } from "@/lib/dashboard/routes"
import { formatServiceType } from "@/lib/format/intake"
import { formatRelativeTime } from "@/lib/operator/cases/time-grouping"
import { cn } from "@/lib/utils"
import type { RecentlyCompletedIntake } from "@/types/db"

const APPROVED_STATUSES = new Set(["approved", "awaiting_script", "completed", "sent"])

/**
 * Compact, read-only list of today's approved requests for the dashboard queue
 * column — the operator's daily scan surface.
 *
 * It can carry two streams: the signed-in clinician's own decisions, and any
 * historical protocol-issued certificates in the selected day (admins only).
 * Protocol-issued rows are labelled and never counted as the clinician's own
 * reviews. Revocation remains available for individual correction.
 */
export function ApprovedTodayList({
  intakes,
  className,
  historyTruncated = false,
}: {
  intakes: RecentlyCompletedIntake[]
  className?: string
  historyTruncated?: boolean
}) {
  const approved = intakes.filter((intake) => APPROVED_STATUSES.has(intake.status))
  if (approved.length === 0) return null

  const now = new Date()
  const autoIssuedCount = approved.filter(
    (intake) => intake.activity_provenance === "auto_issued",
  ).length
  const clinicianCount = approved.length - autoIssuedCount
  const heading = historyTruncated ? "Latest approvals" : "Approved today"

  return (
    <section
      aria-label={heading}
      className={cn(
        "mt-2 flex max-h-[40%] min-h-0 shrink-0 flex-col rounded-2xl border border-border/50 bg-white shadow-sm shadow-primary/[0.04] dark:bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
        <span className="text-sm font-semibold text-foreground">{heading}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {historyTruncated ? `${approved.length} shown` : approved.length}
        </span>
        {autoIssuedCount > 0 ? (
          <span className="ml-auto text-xs text-muted-foreground">
            {clinicianCount} yours · {autoIssuedCount} auto-issued
          </span>
        ) : null}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto">
        {approved.map((intake) => {
          const patientName = intake.patient.full_name.trim() || "Unnamed patient"
          const serviceShortLabel =
            intake.service?.short_name ||
            intake.service?.name ||
            formatServiceType(intake.service?.type || "")
          const isAutoIssued = intake.activity_provenance === "auto_issued"
          return (
            <li key={intake.id}>
              <Link
                href={buildDoctorIntakeHref(intake.id)}
                className="flex items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-muted/40"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      isAutoIssued ? "bg-muted-foreground/50" : "bg-success",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {patientName}
                  </span>
                  {isAutoIssued ? (
                    <span className="shrink-0 text-xs text-muted-foreground">Auto-issued</span>
                  ) : null}
                  {/*
                    The engine recorded an info-severity soft flag. It did not
                    block issuance and this is not an obligation — it is the
                    reason to open this row first. Sorted to the top upstream.
                  */}
                  {intake.flagged ? (
                    <span className="shrink-0 text-xs font-medium text-warning">Flagged</span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="max-w-[9rem] truncate">{serviceShortLabel}</span>
                  <span className="tabular-nums">{formatRelativeTime(intake.activity_at, now)}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

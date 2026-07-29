"use client"

import Link from "next/link"

import { buildDoctorIntakeHref } from "@/lib/dashboard/routes"
import { formatServiceType } from "@/lib/format/intake"
import { formatRelativeTime } from "@/lib/operator/cases/time-grouping"
import { cn } from "@/lib/utils"
import type { GovernanceReviewReceipt, RecentlyCompletedIntake } from "@/types/db"

// `recentlyCompleted` is actor- and Sydney-day-scoped to clinician decisions.
// Post-auto-approval governance is passed separately as an identity-free
// aggregate so a cohort receipt can never become a per-patient approval row.
const APPROVED_STATUSES = new Set(["approved", "awaiting_script", "completed", "sent"])

/**
 * Compact, read-only "Your approvals today" list for the dashboard queue
 * column. Lets the doctor see the day's approved requests at a glance without
 * navigating to a separate page. Self-hides until the first approval of the day.
 */
export function ApprovedTodayList({
  intakes,
  governanceReceipt = null,
  className,
  historyTruncated = false,
}: {
  intakes: RecentlyCompletedIntake[]
  governanceReceipt?: GovernanceReviewReceipt | null
  className?: string
  historyTruncated?: boolean
}) {
  const approved = intakes.filter((intake) => APPROVED_STATUSES.has(intake.status))
  const hasGovernanceReceipt = Boolean(governanceReceipt?.certificateCount)
  if (approved.length === 0 && !hasGovernanceReceipt) return null

  const now = new Date()
  const heading = historyTruncated ? "Your latest approvals" : "Your approvals today"
  const sectionLabel = approved.length > 0 ? heading : "Governance receipt"

  return (
    <section
      aria-label={sectionLabel}
      className={cn(
        "mt-2 flex max-h-[40%] min-h-0 shrink-0 flex-col rounded-2xl border border-border/50 bg-white shadow-sm shadow-primary/[0.04] dark:bg-card",
        className,
      )}
    >
      {approved.length > 0 ? (
        <>
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            <span className="text-sm font-semibold text-foreground">{heading}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {historyTruncated ? `${approved.length} shown` : approved.length}
            </span>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto">
            {approved.map((intake) => {
              const patientName = intake.patient.full_name.trim() || "Unnamed patient"
              const serviceShortLabel =
                intake.service?.short_name ||
                intake.service?.name ||
                formatServiceType(intake.service?.type || "")
              return (
                <li key={intake.id}>
                  <Link
                    href={buildDoctorIntakeHref(intake.id)}
                    className="flex items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {patientName}
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
        </>
      ) : null}
      {governanceReceipt && governanceReceipt.certificateCount > 0 ? (
        <div className="border-t border-border/50 px-4 py-2.5 first:border-t-0">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-foreground">Governance receipt</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatRelativeTime(governanceReceipt.latestActivityAt, now)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {governanceReceipt.certificateCount} auto-issued certificate
            {governanceReceipt.certificateCount === 1 ? "" : "s"} covered
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            Aggregate governance record
          </p>
        </div>
      ) : null}
    </section>
  )
}

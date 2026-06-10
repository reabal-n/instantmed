"use client"

import Link from "next/link"

import { buildDoctorIntakeHref } from "@/lib/dashboard/routes"
import { buildStaffCaseSummary } from "@/lib/doctor/case-summary"
import { formatRelativeTime } from "@/lib/operator/cases/time-grouping"
import { cn } from "@/lib/utils"
import type { IntakeWithPatient } from "@/types/db"

// `recentlyCompleted` is already today-scoped (reviewed_at >= start of today AEST)
// and returns approved/declined/completed. The doctor asked to glance at the
// day's APPROVED requests, so declines are filtered out here.
const APPROVED_STATUSES = new Set(["approved", "awaiting_script", "completed", "sent"])

/**
 * Compact, read-only "Approved today" list for the bottom of the dashboard queue
 * column. Lets the doctor see the day's approved requests at a glance without
 * navigating to a separate page. Self-hides until the first approval of the day.
 */
export function ApprovedTodayList({
  intakes,
  className,
}: {
  intakes: IntakeWithPatient[]
  className?: string
}) {
  const approved = intakes.filter((intake) => APPROVED_STATUSES.has(intake.status))
  if (approved.length === 0) return null

  const now = new Date()

  return (
    <section
      aria-label="Approved today"
      className={cn(
        "mt-2 flex max-h-[40%] min-h-0 shrink-0 flex-col rounded-2xl border border-border/50 bg-white shadow-sm shadow-primary/[0.04] dark:bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
        <span className="text-sm font-semibold text-foreground">Approved today</span>
        <span className="text-xs tabular-nums text-muted-foreground">{approved.length}</span>
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto">
        {approved.map((intake) => {
          const summary = buildStaffCaseSummary({ intake })
          const stamp = intake.reviewed_at ?? intake.completed_at ?? null
          return (
            <li key={intake.id}>
              <Link
                href={buildDoctorIntakeHref(intake.id)}
                className="flex items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {summary.patientName}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="max-w-[9rem] truncate">{summary.serviceShortLabel}</span>
                  {stamp ? <span className="tabular-nums">{formatRelativeTime(stamp, now)}</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

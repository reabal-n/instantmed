"use client"

import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { DOCTOR_QUEUE_REVIEW_HREF } from "@/lib/dashboard/routes"

interface SlaBreachHeroProps {
  breached: number
  approaching: number
}

/**
 * Dashboard-level SLA breach alert.
 *
 * Promoted out of the IntakeMonitor stat cell (Phase 2 doctor portal
 * rebuild) so a missed deadline is the FIRST thing the doctor sees on
 * the dashboard, not a small pill below the stats grid. Doctor portal
 * is the bottleneck for patient turnaround time and SLA visibility is
 * the single highest-leverage UX investment we can make here.
 *
 * Renders nothing when there's no breach or approaching deadline so
 * the dashboard stays calm in the steady state.
 */
export function SlaBreachHero({ breached, approaching }: SlaBreachHeroProps) {
  if (breached > 0) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 shadow-md shadow-destructive/[0.08] dark:bg-destructive/15"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-destructive">
              {breached} case{breached !== 1 ? "s" : ""} past SLA deadline
            </h2>
            <p className="mt-1 text-sm text-destructive/85">
              Review the priority queue now. These patients have been waiting
              longer than the {breached === 1 ? "deadline" : "deadlines"}{" "}
              promised at intake.
            </p>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/15 hover:text-destructive"
            >
              <Link href={DOCTOR_QUEUE_REVIEW_HREF}>
                Review priority cases
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (approaching > 0) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl border border-warning-border/60 bg-warning-light px-4 py-3"
      >
        <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
        <p className="flex-1 text-sm font-medium text-warning">
          {approaching} case{approaching !== 1 ? "s" : ""} approaching SLA
          deadline
        </p>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-warning hover:bg-warning-light hover:text-warning"
        >
          <Link href={DOCTOR_QUEUE_REVIEW_HREF}>Review</Link>
        </Button>
      </div>
    )
  }

  return null
}

"use client"

import { ArrowRight, CheckCircle2, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { DoctorOnboardingStatus } from "@/lib/doctor/onboarding-status-types"

const DISMISS_KEY = "instantmed:doctor-onboarding-dismissed"
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

function getDismissSignature(data: DoctorOnboardingStatus) {
  return data.steps
    .filter((step) => step.required && !step.completed)
    .map((step) => step.id)
    .sort()
    .join("|")
}

export function DoctorOnboardingBanner({ data }: { data: DoctorOnboardingStatus | null }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!data || data.summary.all_required_complete) return

    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (!raw) return
      const stored = JSON.parse(raw) as {
        signature?: string
        dismissedAt?: number
      }
      const isFresh =
        typeof stored.dismissedAt === "number" &&
        Date.now() - stored.dismissedAt < DISMISS_TTL_MS
      if (stored.signature === getDismissSignature(data) && isFresh) {
        setDismissed(true)
      }
    } catch {
      localStorage.removeItem(DISMISS_KEY)
    }
  }, [data])

  const handleDismiss = () => {
    setDismissed(true)
    if (!data) return
    try {
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({
          signature: getDismissSignature(data),
          dismissedAt: Date.now(),
        }),
      )
    } catch {
      // Ignore storage failures, dismissal still applies for this render.
    }
  }

  if (!data || data.summary.all_required_complete || dismissed) {
    return null
  }

  const incompleteSteps = data.steps.filter((s) => !s.completed && s.required)
  const nextStep = incompleteSteps[0]
  const pct = data.summary.completion_percentage
  const completedCount = data.steps.filter((s) => s.completed).length
  const requiredRemaining = data.summary.required_total - data.summary.required_completed

  return (
    <div
      data-testid="doctor-onboarding-banner"
      className="mb-3 rounded-xl border border-border/60 bg-white shadow-sm shadow-primary/[0.04] dark:bg-card dark:border-white/10"
    >
      <div className="grid gap-3 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <CheckCircle2 className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Finish doctor setup
            </h3>
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {completedCount} of {data.steps.length} complete
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(pct, 4)}%` }}
              aria-hidden
            />
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">
              {requiredRemaining} required setup {requiredRemaining === 1 ? "item" : "items"} remaining
            </span>
            {nextStep && (
              <span className="text-foreground">
                Next: <span className="font-medium">{nextStep.label}</span>
              </span>
            )}
          </div>

          {nextStep?.href && (
            <div className="mt-3 sm:hidden">
              <Button asChild size="sm" className="h-8">
                <Link href={nextStep.href}>
                  Continue setup
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          {nextStep?.href && (
            <Button asChild size="sm" className="hidden h-8 sm:inline-flex">
              <Link href={nextStep.href}>
                Continue setup
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss onboarding banner"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

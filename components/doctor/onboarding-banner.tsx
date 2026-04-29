"use client"

import { ArrowRight, CheckCircle2, Circle, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OnboardingStep {
  id: string
  label: string
  description: string
  completed: boolean
  href?: string
  required: boolean
}

interface OnboardingData {
  steps: OnboardingStep[]
  summary: {
    total: number
    completed: number
    required_total: number
    required_completed: number
    all_required_complete: boolean
    completion_percentage: number
    can_approve_intakes: boolean
  }
}

/**
 * Doctor onboarding banner — refreshed in Phase 5 of the doctor +
 * admin portal rebuild (2026-04-29).
 *
 * Why the redesign: the prior warning-yellow alert treatment read as
 * "you're doing something wrong." A doctor with incomplete setup
 * isn't broken — they're new. New state deserves a calm, supportive
 * tone, not an alarm.
 *
 * What changed:
 *   - Sky/info palette instead of warning amber.
 *   - Progress meter shows momentum (e.g. "3 of 5 done").
 *   - "Almost there" compact variant when ≥ 80% complete.
 *   - Single primary CTA ("Continue setup") instead of duplicate
 *     per-step links + footer link.
 *   - 👋 in the heading-adjacent line for warmth (DS §2: ≤1 per
 *     block, never IN headings).
 */
export function DoctorOnboardingBanner() {
  const [data, setData] = useState<OnboardingData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/doctor/onboarding-status")
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {
        // Silently fail — not critical
      }
    }
    fetchStatus()
  }, [])

  if (!data || data.summary.all_required_complete || dismissed) {
    return null
  }

  const incompleteSteps = data.steps.filter((s) => !s.completed && s.required)
  const nextStep = incompleteSteps[0]
  const pct = data.summary.completion_percentage
  const isAlmostThere = pct >= 80
  const completedCount = data.steps.filter((s) => s.completed).length

  return (
    <div className="mx-4 mb-4 rounded-xl border border-border/60 bg-white shadow-sm shadow-primary/[0.04] dark:bg-card dark:border-white/10">
      <div className="flex items-start gap-3 p-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <span className="text-base">👋</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {isAlmostThere ? "Almost there" : "Welcome — let's finish setup"}
            </h3>
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {completedCount} of {data.steps.length}
            </span>
          </div>

          {/* Progress meter */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.max(pct, 4)}%` }}
              aria-hidden
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {isAlmostThere
              ? "Just one or two steps left before you can approve patient requests."
              : "Complete these steps to start approving patient requests."}
          </p>

          {/* Step list — compact when almost done, full otherwise */}
          {!isAlmostThere && (
            <ul className="mt-3 space-y-1.5">
              {data.steps.map((step) => (
                <li
                  key={step.id}
                  className="flex items-center gap-2 text-sm"
                >
                  {step.completed ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-success"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="h-4 w-4 shrink-0 text-muted-foreground/60"
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "flex-1 min-w-0",
                      step.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground",
                    )}
                  >
                    {step.label}
                    {!step.required && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (optional)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {nextStep?.href && (
            <div className="mt-3">
              <Button asChild size="sm" className="h-8">
                <Link href={nextStep.href}>
                  Continue setup
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss onboarding banner"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

"use client"

import { ArrowRight, CheckCircle2, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

const DISMISS_KEY = "instantmed:doctor-onboarding-dismissed"
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

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

function getDismissSignature(data: OnboardingData) {
  return data.steps
    .filter((step) => step.required && !step.completed)
    .map((step) => step.id)
    .sort()
    .join("|")
}

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
  const isAlmostThere = pct >= 80
  const completedCount = data.steps.filter((s) => s.completed).length
  const requiredRemaining = data.summary.required_total - data.summary.required_completed

  return (
    <div className="mx-4 mb-4 rounded-xl border border-border/60 bg-white shadow-sm shadow-primary/[0.04] dark:bg-card dark:border-white/10">
      <div className="flex items-start gap-3 p-3 sm:items-center sm:p-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <CheckCircle2 className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {isAlmostThere ? "Almost there" : "Welcome, finish setup"}
            </h3>
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {completedCount} of {data.steps.length}
              </span>
              {nextStep?.href && (
                <Button asChild size="sm" className="hidden h-8 sm:inline-flex">
                  <Link href={nextStep.href}>
                    Continue setup
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.max(pct, 4)}%` }}
              aria-hidden
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {isAlmostThere
              ? "One or two setup items remain before approvals are available."
              : `${requiredRemaining} required setup ${requiredRemaining === 1 ? "item" : "items"} remaining.`}
          </p>

          {nextStep && (
            <p className="mt-1 text-xs text-foreground">
              Next: <span className="font-medium">{nextStep.label}</span>
            </p>
          )}

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
  )
}

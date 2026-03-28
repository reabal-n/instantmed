"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, AlertTriangle, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

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

  const incompleteSteps = data.steps.filter(s => !s.completed && s.required)

  return (
    <div className="mx-4 mb-4 rounded-xl border border-warning-border bg-warning-light p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-warning text-sm">
            Complete your onboarding ({data.summary.completion_percentage}%)
          </h3>
          <p className="text-xs text-warning mt-1">
            Complete these steps to start approving patient requests.
          </p>

          <div className="mt-3 space-y-2">
            {data.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-2 text-sm">
                {step.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-amber-400 dark:text-amber-500 shrink-0" />
                )}
                <span className={step.completed ? "text-muted-foreground line-through" : "text-foreground"}>
                  {step.label}
                  {!step.required && " (optional)"}
                </span>
                {!step.completed && step.href && (
                  <Link
                    href={step.href}
                    className="ml-auto text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                  >
                    Complete <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>

          {incompleteSteps.length > 0 && incompleteSteps[0].href && (
            <Link
              href={incompleteSteps[0].href}
              className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-warning hover:underline"
            >
              Continue setup <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 shrink-0"
          aria-label="Dismiss onboarding banner"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

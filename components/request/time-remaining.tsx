"use client"

import { useMemo } from "react"
import { Clock } from "lucide-react"

// Estimated time per step type (in seconds)
export const STEP_TIME_ESTIMATES: Record<string, number> = {
  'certificate': 30,
  'symptoms': 45,
  'medication': 60,
  'medication-history': 45,
  'medical-history': 60,
  'consult-reason': 45,
  'ed-goals': 30,
  'ed-assessment': 60,
  'ed-health': 90,
  'ed-preferences': 30,
  'hair-loss-assessment': 60,
  'womens-health-type': 20,
  'womens-health-assessment': 60,
  'weight-loss-assessment': 90,
  'weight-loss-call-scheduling': 30,
  'details': 90,
  'review': 30,
  'checkout': 60,
}

interface TimeRemainingProps {
  steps: { id: string }[]
  currentIndex: number
}

export function TimeRemaining({ steps, currentIndex }: TimeRemainingProps) {
  const remainingTime = useMemo(() => {
    const remainingSteps = steps.slice(currentIndex)
    const totalSeconds = remainingSteps.reduce((acc, step) => {
      return acc + (STEP_TIME_ESTIMATES[step.id] || 30)
    }, 0)
    const minutes = Math.ceil(totalSeconds / 60)
    return minutes
  }, [steps, currentIndex])

  if (remainingTime <= 0) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="w-3 h-3" />
      <span>~{remainingTime} min left</span>
    </div>
  )
}

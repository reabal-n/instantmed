"use client"

import { useEffect } from "react"
import posthog from "posthog-js"

interface CancelledPageTrackerProps {
  intakeId?: string
}

export function CancelledPageTracker({ intakeId }: CancelledPageTrackerProps) {
  useEffect(() => {
    posthog.capture("payment_cancelled", {
      intake_id: intakeId,
    })
  }, [intakeId])

  return null
}

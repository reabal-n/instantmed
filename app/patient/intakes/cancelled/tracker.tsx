"use client"

import { useEffect } from "react"
import { capture } from "@/lib/analytics/capture"

interface CancelledPageTrackerProps {
  intakeId?: string
}

export function CancelledPageTracker({ intakeId }: CancelledPageTrackerProps) {
  useEffect(() => {
    capture("payment_cancelled", {
      intake_id: intakeId,
    })
  }, [intakeId])

  return null
}

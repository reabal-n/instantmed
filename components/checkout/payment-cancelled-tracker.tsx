"use client"

import { useEffect } from "react"

import { capture } from "@/lib/analytics/capture"

interface PaymentCancelledTrackerProps {
  hasResumeToken?: boolean
  intakeId?: string
}

export function PaymentCancelledTracker({
  hasResumeToken = false,
  intakeId,
}: PaymentCancelledTrackerProps) {
  useEffect(() => {
    capture("payment_cancelled", {
      has_resume_token: hasResumeToken,
      intake_id: intakeId,
    })
  }, [hasResumeToken, intakeId])

  return null
}

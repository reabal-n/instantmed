"use client"

import { useEffect } from "react"
import posthog from "posthog-js"

interface PaymentCancelledTrackerProps {
  requestId?: string
}

export function PaymentCancelledTracker({ requestId }: PaymentCancelledTrackerProps) {
  useEffect(() => {
    // Track payment cancelled in PostHog
    posthog.capture('payment_cancelled', {
      request_id: requestId,
    })
  }, [requestId])

  return null
}

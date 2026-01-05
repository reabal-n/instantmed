"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2 } from "lucide-react"
import { retryPaymentForRequestAction } from "@/lib/stripe/checkout"

interface RetryPaymentButtonProps {
  requestId: string
}

export function RetryPaymentButton({ requestId }: RetryPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasClicked, setHasClicked] = useState(false)

  const handleRetryPayment = async () => {
    if (hasClicked) return

    setIsLoading(true)
    setHasClicked(true)
    setError(null)

    try {
      const result = await retryPaymentForRequestAction(requestId)

      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        setError(result.error || "Failed to initiate payment. Please try again.")
        setIsLoading(false)
        setHasClicked(false) // Allow retry on error
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error retrying payment:", err)
      }
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
      setHasClicked(false) // Allow retry on error
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleRetryPayment}
        disabled={isLoading || hasClicked}
        className="w-full rounded-xl btn-glow bg-primary hover:bg-primary/90"
        size="lg"
      >
        {isLoading ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : <CreditCard className="mr-2 w-4 h-4" />}
        Complete Payment Now
      </Button>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  )
}

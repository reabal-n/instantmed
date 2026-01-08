"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2 } from "lucide-react"
import { retryPaymentForRequestAction } from "@/lib/stripe/checkout"
import { toast } from "sonner"

interface RetryPaymentButtonProps {
  requestId: string
}

export function RetryPaymentButton({ requestId }: RetryPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hasClicked, setHasClicked] = useState(false)

  const handleRetryPayment = async () => {
    if (hasClicked) return

    setIsLoading(true)
    setHasClicked(true)

    try {
      const result = await retryPaymentForRequestAction(requestId)

      if (result.error) {
        toast.error(result.error)
        setIsLoading(false)
        setHasClicked(false) // Allow retry on error
        return
      }

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (error) {
      // Log error in development only
      // eslint-disable-next-line no-console
      if (process.env.NODE_ENV === 'development') console.error("Retry payment error:", error)
      toast.error("Failed to initiate payment. Please try again.")
      setIsLoading(false)
      setHasClicked(false) // Allow retry on error
    }
  }

  return (
    <Button
      onClick={handleRetryPayment}
      disabled={isLoading || hasClicked}
      className="rounded-xl btn-premium text-[#0A0F1C] w-full sm:w-auto"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Pay Now
        </>
      )}
    </Button>
  )
}

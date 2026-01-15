"use client"

import { useEffect, useState } from "react"
import { SuccessCelebration } from "@/components/ui/success-celebration"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface SuccessClientProps {
  intakeId?: string
  initialStatus?: string
}

export function SuccessClient({ intakeId, initialStatus }: SuccessClientProps) {
  const [status, setStatus] = useState(initialStatus)
  const [isVerifying, setIsVerifying] = useState(initialStatus === "pending_payment")
  const [verificationFailed, setVerificationFailed] = useState(false)

  useEffect(() => {
    if (!intakeId || initialStatus !== "pending_payment") return

    // Poll for status update if still pending_payment
    let attempts = 0
    const maxAttempts = 10 // 10 attempts * 2s = 20 seconds max wait

    const checkStatus = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("intakes")
          .select("status")
          .eq("id", intakeId)
          .single()

        if (data?.status && data.status !== "pending_payment") {
          setStatus(data.status)
          setIsVerifying(false)
          return true
        }

        attempts++
        if (attempts >= maxAttempts) {
          setVerificationFailed(true)
          setIsVerifying(false)
          return true
        }

        return false
      } catch {
        return false
      }
    }

    const intervalId = setInterval(async () => {
      const done = await checkStatus()
      if (done) {
        clearInterval(intervalId)
      }
    }, 2000)

    // Initial check
    checkStatus()

    return () => clearInterval(intervalId)
  }, [intakeId, initialStatus])

  // Show loading state while verifying payment
  if (isVerifying) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Processing payment...</h2>
          <p className="text-muted-foreground text-sm mt-1">
            This usually takes just a few seconds.
          </p>
        </div>
      </div>
    )
  }

  // Show warning if verification failed but still show success
  // (Webhook might still process, patient can check dashboard)
  if (verificationFailed) {
    return (
      <div className="space-y-6">
        <SuccessCelebration type="request" requestId={intakeId} showConfetti={false} />
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <p>
            <strong>Note:</strong> Payment is being processed. If you don&apos;t see your request 
            in your dashboard within a few minutes, please{" "}
            <a href="/contact" className="underline">contact support</a>.
          </p>
        </div>
      </div>
    )
  }

  // Payment confirmed - show full celebration
  return (
    <SuccessCelebration 
      type="request" 
      requestId={intakeId} 
      showConfetti={status === "paid"} 
    />
  )
}

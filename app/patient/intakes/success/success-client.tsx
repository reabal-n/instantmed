"use client"

import { useEffect, useState } from "react"
import { WhatHappensNext } from "@/components/patient/what-happens-next"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"

interface SuccessClientProps {
  intakeId?: string
  initialStatus?: string
  serviceName?: string
  isPriority?: boolean
  patientEmail?: string
}

export function SuccessClient({ 
  intakeId, 
  initialStatus,
  serviceName,
  isPriority = false,
  patientEmail,
}: SuccessClientProps) {
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

  // Show warning if verification failed but still show the what happens next page
  if (verificationFailed) {
    return (
      <div className="space-y-6">
        <WhatHappensNext
          intakeId={intakeId || ""}
          initialStatus={(status || "paid") as IntakeStatus}
          serviceName={serviceName}
          patientEmail={patientEmail}
          isPriority={isPriority}
          showConfetti={false}
        />
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
          <p>
            <strong>Note:</strong> Payment is being processed. If you don&apos;t see your request 
            in your dashboard within a few minutes, please{" "}
            <a href="/contact" className="underline hover:no-underline">contact support</a>.
          </p>
        </div>
      </div>
    )
  }

  // No intake ID - show generic success
  if (!intakeId) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Request submitted</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Check your dashboard to track progress.
          </p>
        </div>
      </div>
    )
  }

  // Payment confirmed - show the enhanced "What Happens Next" experience
  return (
    <WhatHappensNext
      intakeId={intakeId}
      initialStatus={(status || "paid") as IntakeStatus}
      serviceName={serviceName}
      patientEmail={patientEmail}
      isPriority={isPriority}
      showConfetti={status === "paid"}
    />
  )
}

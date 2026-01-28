"use client"

import { useEffect, useState, useCallback } from "react"
import { WhatHappensNext } from "@/components/patient/what-happens-next"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Mail } from "lucide-react"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"
import { Button } from "@/components/ui/button"

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
  const [pollingError, setPollingError] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [emailResent, setEmailResent] = useState(false)

  // P0 FIX: Fallback to resend confirmation email if not received
  const handleResendConfirmation = useCallback(async () => {
    if (!intakeId || resendingEmail || emailResent) return
    
    setResendingEmail(true)
    try {
      const response = await fetch("/api/patient/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId }),
      })
      const result = await response.json()
      if (result.success) {
        setEmailResent(true)
      }
    } catch {
      // Silently fail - user can try again
    } finally {
      setResendingEmail(false)
    }
  }, [intakeId, resendingEmail, emailResent])

  useEffect(() => {
    if (!intakeId || initialStatus !== "pending_payment") return

    // Poll for status update if still pending_payment
    // Increased timeout to 45 seconds to handle webhook delays
    let attempts = 0
    const maxAttempts = 15 // 15 attempts * 3s = 45 seconds max wait

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
          // Fallback: Call verify-payment endpoint to force check with Stripe
          try {
            const sessionId = new URLSearchParams(window.location.search).get("session_id")
            const verifyRes = await fetch("/api/stripe/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ intakeId, sessionId }),
            })
            const verifyData = await verifyRes.json()
            if (verifyData.success && verifyData.status === "paid") {
              setStatus("paid")
              setIsVerifying(false)
              return true
            }
          } catch {
            // Verification fallback failed, continue to show error
          }
          setVerificationFailed(true)
          setIsVerifying(false)
          return true
        }

        return false
      } catch (err) {
        // P2 FIX: Track polling errors and show fallback after multiple failures
        // eslint-disable-next-line no-console
        console.error("Status polling error:", err)
        attempts++
        if (attempts >= maxAttempts) {
          setPollingError(true)
          setIsVerifying(false)
          return true
        }
        return false
      }
    }

    const intervalId = setInterval(async () => {
      const done = await checkStatus()
      if (done) {
        clearInterval(intervalId)
      }
    }, 3000)

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

  // P2 FIX: Show error state if polling failed due to errors (not just timeout)
  if (pollingError) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Connection issue</h2>
            <p className="text-muted-foreground text-sm mt-1">
              We couldn&apos;t verify your payment status. Don&apos;t worry — if you completed payment, 
              your request is being processed.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
          <p><strong>What to do next:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Check your <a href="/patient" className="underline hover:no-underline">dashboard</a> for your request status</li>
            <li>Look for a confirmation email in your inbox</li>
            <li>If you don&apos;t see your request within 10 minutes, <a href="/contact" className="underline hover:no-underline">contact support</a></li>
          </ul>
        </div>
      </div>
    )
  }

  // Show warning if verification timed out - payment likely succeeded, webhook may be delayed
  if (verificationFailed) {
    return (
      <div className="space-y-6">
        <WhatHappensNext
          intakeId={intakeId || ""}
          initialStatus={(status || "paid") as IntakeStatus}
          serviceName={serviceName}
          patientEmail={patientEmail}
          isPriority={isPriority}
        />
        {/* P0 FIX: Resend confirmation email button */}
        <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-3">
          <p><strong>Still confirming your payment</strong> — This can take a minute or two. Your request has been received.</p>
          <p className="text-muted-foreground">Haven&apos;t received a confirmation email?</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendConfirmation}
            disabled={resendingEmail || emailResent}
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            {emailResent ? "Email sent!" : resendingEmail ? "Sending..." : "Resend confirmation email"}
          </Button>
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

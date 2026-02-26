"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePostHog } from "posthog-js/react"
import { motion } from "framer-motion"
import { WhatHappensNext } from "@/components/patient/what-happens-next"
import { createClient } from "@/lib/supabase/client"
import { Mail, AlertTriangle, Check } from "lucide-react"
import { PulseSpinner } from "@/components/ui/spinner"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"
import { Button } from "@/components/ui/button"

const RESEND_COOLDOWN_SECONDS = 60

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
  const posthog = usePostHog()
  const [status, setStatus] = useState(initialStatus)
  const [isVerifying, setIsVerifying] = useState(initialStatus === "pending_payment")
  const [verificationFailed, setVerificationFailed] = useState(false)
  const [pollingError, setPollingError] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [emailResent, setEmailResent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  // P0 FIX: Fallback to resend confirmation email if not received (with cooldown)
  const handleResendConfirmation = useCallback(async () => {
    if (!intakeId || resendingEmail || resendCooldown > 0) return
    
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
        // Start cooldown timer
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        cooldownRef.current = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              if (cooldownRef.current) clearInterval(cooldownRef.current)
              setEmailResent(false) // Allow re-sending after cooldown
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch {
      // Silently fail - user can try again
    } finally {
      setResendingEmail(false)
    }
  }, [intakeId, resendingEmail, resendCooldown])

  useEffect(() => {
    if (!intakeId || initialStatus !== "pending_payment") return

    // Poll for status update if still pending_payment
    // Extended to 90 seconds to handle webhook delays from Stripe
    let attempts = 0
    const maxAttempts = 30 // 30 attempts * 3s = 90 seconds max wait

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
          posthog?.capture('payment_verified', {
            intake_id: intakeId,
            status: data.status,
            service_name: serviceName,
            poll_attempts: attempts,
            verification_seconds: attempts * 3,
          })
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
          posthog?.capture('payment_verification_timeout', {
            intake_id: intakeId,
            service_name: serviceName,
            poll_attempts: attempts,
          })
          setVerificationFailed(true)
          setIsVerifying(false)
          return true
        }

        return false
      } catch {
        attempts++
        if (attempts >= maxAttempts) {
          posthog?.capture('payment_verification_error', {
            intake_id: intakeId,
            service_name: serviceName,
            poll_attempts: attempts,
          })
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
        <div className="w-16 h-16 mx-auto flex items-center justify-center">
          <PulseSpinner size="lg" />
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center"
          >
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </motion.div>
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
      </motion.div>
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
            disabled={resendingEmail || resendCooldown > 0}
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : resendingEmail 
                ? "Sending..." 
                : emailResent 
                  ? "Email sent!" 
                  : "Resend confirmation email"
            }
          </Button>
        </div>
      </div>
    )
  }

  // No intake ID - show generic success
  if (!intakeId) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="w-16 h-16 mx-auto rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
        </motion.div>
        <div>
          <h2 className="text-xl font-semibold">Request submitted</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Check your dashboard to track progress.
          </p>
        </div>
      </motion.div>
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

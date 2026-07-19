"use client"

import { motion } from "framer-motion"
import { AlertTriangle, Check,Mail } from "lucide-react"
import { useCallback, useEffect, useRef,useState } from "react"

import { HeardAboutUsCard } from "@/components/patient/heard-about-us-card"
import { WhatHappensNext } from "@/components/patient/what-happens-next"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { PulseSpinner } from "@/components/ui/spinner"
import { getAttribution } from "@/lib/analytics/attribution"
import {
  claimBrowserPurchaseCompleted,
  getBrowserPurchaseCompletedInsertId,
} from "@/lib/analytics/browser-purchase-dedup"
import { trackPurchase } from "@/lib/analytics/conversion-tracking"
import type { WaitState } from "@/lib/brand/wait-counter"
import { PATIENT_DASHBOARD_HREF } from "@/lib/dashboard/routes"
import type { IntakeStatus } from "@/lib/data/intake-lifecycle"
import {
  derivePatientSuccessVerificationState,
  PATIENT_SUCCESS_VERIFICATION_DEADLINE_MS,
  type PatientSuccessVerificationState,
} from "@/lib/patient/intake-status-polling"
import { clearDraftAfterPayment } from "@/lib/request/draft-storage"
import { fetchWithCsrf } from "@/lib/security/csrf-client"

const RESEND_COOLDOWN_SECONDS = 60

interface SuccessClientProps {
  intakeId?: string
  initialStatus?: string
  serviceName?: string
  /** DB intakes.category — used to clear the local draft after verified payment */
  serviceCategory?: string
  amountCents?: number
  isPriority?: boolean
  patientEmail?: string
  patientId?: string
  queuePosition?: number | null
  isNewCustomer?: boolean
  waitState?: WaitState
  paymentRetry?: boolean
  heardToken?: string
  intakeSubtype?: string
}

export function SuccessClient({
  intakeId,
  initialStatus,
  serviceName,
  serviceCategory,
  amountCents,
  isPriority = false,
  patientEmail,
  queuePosition: initialQueuePosition,
  isNewCustomer,
  waitState,
  paymentRetry = false,
  heardToken,
}: SuccessClientProps) {
  const prefersReducedMotion = useReducedMotion()
  const posthog = usePostHog()
  const [verificationState, setVerificationState] =
    useState<PatientSuccessVerificationState>({
      isVerifying: initialStatus === "pending_payment",
      pollingError: false,
      resolvedAmountCents: amountCents,
      status: initialStatus,
      verificationFailed: false,
    })
  const {
    isVerifying,
    pollingError,
    resolvedAmountCents,
    status,
    verificationFailed,
  } = verificationState
  const [resendingEmail, setResendingEmail] = useState(false)
  const [emailResent, setEmailResent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendError, setResendError] = useState<string | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const purchaseTrackedRef = useRef(false)
  // Separate latch for the PostHog purchase event so it can wait for posthog to
  // hydrate without blocking (or being blocked by) the one-shot gtag fire.
  const posthogPurchaseFiredRef = useRef(false)

  useEffect(() => {
    setVerificationState((current) =>
      derivePatientSuccessVerificationState(current, {
        amountCents,
        initialStatus,
      }),
    )
  }, [amountCents, initialStatus])

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  // Payment is server-confirmed on this surface — retire the local draft so a
  // "did it go through?" return to /request can't restore straight to Pay and
  // charge again past the 10-minute checkout idempotency bucket.
  const draftClearedRef = useRef(false)
  useEffect(() => {
    if (draftClearedRef.current) return
    if (!status || status === "pending_payment") return
    draftClearedRef.current = true
    clearDraftAfterPayment(serviceCategory)
  }, [status, serviceCategory])

  // P0 FIX: Fallback to resend confirmation email if not received (with cooldown)
  const handleResendConfirmation = useCallback(async () => {
    if (!intakeId || resendingEmail || resendCooldown > 0) return
    
    setResendingEmail(true)
    setResendError(null)
    try {
      // Must use fetchWithCsrf: the endpoint enforces requireValidCsrf, so a raw
      // fetch always 403s and the button silently does nothing (it looked like it
      // worked). This is the only self-serve recovery for a paid patient whose
      // confirmation email didn't arrive.
      const response = await fetchWithCsrf("/api/patient/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intakeId }),
      })
      const result = await response.json().catch(() => ({}))
      if (response.ok && result.success) {
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
      } else {
        setResendError(
          result.error || "We couldn't resend it just now. Please try again in a moment, or contact support@instantmed.com.au."
        )
      }
    } catch {
      setResendError("We couldn't resend it just now. Check your connection and try again.")
    } finally {
      setResendingEmail(false)
    }
  }, [intakeId, resendingEmail, resendCooldown])

  useEffect(() => {
    if (!intakeId || initialStatus !== "pending_payment") return

    // Poll for status update if still pending_payment. The attempt ceiling
    // bounds completed requests; the independent wall deadline below also
    // bounds a request that never settles.
    let attempts = 0
    const maxAttempts = 30
    let disposed = false
    let verificationFinished = false
    let activeController: AbortController | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let deadlineId: ReturnType<typeof setTimeout> | null = null

    const clearVerificationTimers = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      if (deadlineId) {
        clearTimeout(deadlineId)
        deadlineId = null
      }
    }

    const finishVerification = (): boolean => {
      if (disposed || verificationFinished) return false
      verificationFinished = true
      clearVerificationTimers()
      return true
    }

    const finishWithVerificationTimeout = (): boolean => {
      if (!finishVerification()) return false
      activeController?.abort()
      activeController = null
      setVerificationState((current) => ({
        ...current,
        isVerifying: false,
        pollingError: false,
        verificationFailed: true,
      }))
      posthog?.capture('payment_verification_timeout', {
        service_name: serviceName,
        poll_attempts: attempts,
      })
      return true
    }

    const finishWithPollingError = (): boolean => {
      if (!finishVerification()) return false
      setVerificationState((current) => ({
        ...current,
        isVerifying: false,
        pollingError: true,
        verificationFailed: false,
      }))
      posthog?.capture('payment_verification_error', {
        service_name: serviceName,
        poll_attempts: attempts,
      })
      return true
    }

    const checkStatus = async (): Promise<boolean> => {
      if (disposed || activeController) return false
      if (verificationFinished) return false

      const controller = new AbortController()
      activeController = controller

      try {
        const res = await fetch(`/api/patient/intake-status?id=${intakeId}`, {
          signal: controller.signal,
        })
        if (disposed || controller.signal.aborted) return false
        const data = res.ok ? await res.json() : null
        if (disposed || controller.signal.aborted) return false

        // Refresh resolved amountCents whenever the API returns it,
        // regardless of status. Webhook updates `amount_cents` either at
        // the same time as status flips OR a beat later; capturing it
        // here keeps the conversion-value source current.
        setVerificationState((current) =>
          derivePatientSuccessVerificationState(current, {
            amountCents:
              typeof data?.amount_cents === "number"
                ? data.amount_cents
                : undefined,
            initialStatus:
              typeof data?.status === "string" ? data.status : undefined,
          }),
        )

        if (data?.status && data.status !== "pending_payment") {
          if (!finishVerification()) return true
          posthog?.capture('payment_verified', {
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
              signal: controller.signal,
            })
            if (disposed || controller.signal.aborted) return false
            const verifyData = await verifyRes.json()
            if (disposed || controller.signal.aborted) return false
            if (verifyData.success && verifyData.status === "paid") {
              if (!finishVerification()) return true
              setVerificationState((current) =>
                derivePatientSuccessVerificationState(current, {
                  initialStatus: "paid",
                }),
              )
              return true
            }
          } catch (error) {
            if (
              disposed ||
              controller.signal.aborted ||
              (error instanceof DOMException && error.name === "AbortError")
            ) {
              return false
            }
            // Verification fallback failed, continue to show error
          }
          finishWithVerificationTimeout()
          return true
        }

        return false
      } catch (error) {
        if (
          disposed ||
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return false
        }
        attempts++
        if (attempts >= maxAttempts) {
          finishWithPollingError()
          return true
        }
        return false
      } finally {
        if (activeController === controller) activeController = null
      }
    }

    const runStatusCheck = async () => {
      const done = await checkStatus()
      if (disposed) return
      if (done && intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    intervalId = setInterval(() => {
      void runStatusCheck()
    }, 3000)
    deadlineId = setTimeout(() => {
      finishWithVerificationTimeout()
    }, PATIENT_SUCCESS_VERIFICATION_DEADLINE_MS)

    // Initial check
    void runStatusCheck()

    return () => {
      disposed = true
      verificationFinished = true
      clearVerificationTimers()
      activeController?.abort()
      activeController = null
    }
  }, [intakeId, initialStatus, posthog, serviceName])

  useEffect(() => {
    if (!intakeId) return

    // Don't fire the conversion until we have a real amount_cents from
    // the database. When a patient lands on this page DURING the Stripe
    // webhook-processing window, the server render can complete before
    // `intakes.amount_cents` is set; the old code defaulted that to $1
    // and fired the Google Ads conversion at $1 instead of the real
    // $24.95-$89.95 price, dragging campaign optimization toward
    // low-value clicks. The polling loop above now refreshes
    // `resolvedAmountCents` from the API; wait for it.
    if (resolvedAmountCents == null) return

    const valueDollars = resolvedAmountCents / 100

    // Google Ads / gtag conversion — fire exactly once. Stripe only redirects
    // here after successful payment. trackPurchase includes Enhanced
    // Conversions (hashed email) and value; Google dedups on transactionId.
    if (!purchaseTrackedRef.current) {
      purchaseTrackedRef.current = true
      void trackPurchase({
        transactionId: intakeId,
        value: valueDollars,
        service: serviceName || "unknown",
        serviceName: serviceName || "Request",
        email: patientEmail,
        isNewCustomer,
      })
    }

    // PostHog purchase event - completes the funnel: step_viewed → step_completed → purchase_completed.
    // Latched separately and gated on `posthog` so a null-on-first-render
    // instance no longer drops the event (it was undercounting purchases ~3x
    // and poisoning every funnel/channel insight). The effect re-runs when
    // posthog hydrates because posthog is in the dep array.
    // getAttribution() falls back to the first-party cookie when sessionStorage
    // was cleared by the Stripe redirect or by privacy-restricted browsers.
    if (!posthogPurchaseFiredRef.current && posthog) {
      posthogPurchaseFiredRef.current = true
      if (claimBrowserPurchaseCompleted(intakeId)) {
        const attribution = getAttribution()
        const cameFromRecoveryEmail = attribution.utm_source === 'recovery_email'

        posthog.capture('purchase_completed', {
          $insert_id: getBrowserPurchaseCompletedInsertId(),
          service: serviceName || "unknown",
          value: valueDollars,
          currency: 'AUD',
          came_from_recovery_email: cameFromRecoveryEmail,
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          campaignid: attribution.campaignid,
          has_gclid: Boolean(attribution.gclid),
          has_utm_source: Boolean(attribution.utm_source),
          has_campaignid: Boolean(attribution.campaignid),
        })

        // Dedicated event for the recovery-email funnel measurement. Keeps the
        // PostHog "purchases by hero variant" insight clean while enabling a
        // separate "purchases that came from recovery emails" insight.
        if (cameFromRecoveryEmail) {
          posthog.capture('purchase_came_from_recovery_email', {
            service: serviceName || "unknown",
            value: valueDollars,
            currency: 'AUD',
          })
        }
      }
    }
  }, [intakeId, serviceName, resolvedAmountCents, patientEmail, posthog, isNewCustomer])

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
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="space-y-6"
      >
        <div className="text-center space-y-4">
          <motion.div
            initial={prefersReducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut", delay: 0.1 }}
            className="w-16 h-16 mx-auto rounded-full bg-warning-light flex items-center justify-center"
          >
            <AlertTriangle className="w-8 h-8 text-warning" />
          </motion.div>
          <div>
            <h2 className="text-xl font-semibold">Connection issue</h2>
            <p className="text-muted-foreground text-sm mt-1">
              We couldn&apos;t verify your payment status. Don&apos;t worry - if you completed payment, 
              your request is being processed.
            </p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-muted/50 text-sm space-y-2">
          <p><strong>What to do next:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Check your <a href={PATIENT_DASHBOARD_HREF} className="underline hover:no-underline">dashboard</a> for your request status</li>
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
          showConfetti={false}
          initialQueuePosition={initialQueuePosition}
        />
        {/* P0 FIX: Resend confirmation email button */}
        <div className="p-4 rounded-xl bg-muted/50 text-sm space-y-3">
          <p><strong>Still confirming your payment</strong> - This can take a minute or two. Your request has been received.</p>
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
          {resendError && (
            <p className="text-xs text-destructive" role="alert" aria-live="assertive">{resendError}</p>
          )}
        </div>
      </div>
    )
  }

  // No intake ID - show generic success
  if (!intakeId) {
    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        className="text-center space-y-4"
      >
        <motion.div
          initial={prefersReducedMotion ? {} : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.3, delay: 0.1 }}
          className="w-16 h-16 mx-auto rounded-full bg-success flex items-center justify-center"
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

  // Payment confirmed - show the clinical handoff first. Secondary prompts stay
  // below the request-detail CTA and status tracker.
  return (
    <div className="space-y-6">
      <WhatHappensNext
        intakeId={intakeId}
        initialStatus={(status || "paid") as IntakeStatus}
        serviceName={serviceName}
        patientEmail={patientEmail}
        isPriority={isPriority}
        showConfetti={status === "paid"}
        initialQueuePosition={initialQueuePosition}
        waitState={waitState}
      />
      {paymentRetry && (
        <div className="rounded-xl border border-success-border bg-success-light/40 px-4 py-3 text-sm text-success">
          <p className="font-medium">Payment retry confirmed</p>
          <p className="mt-1 text-success/80">
            No need to fill the form out again. Your saved request is back with the doctor queue.
          </p>
        </div>
      )}
      {/* Self-reported attribution survey. Keep it post-confirmation and below
          the primary status/CTA so it does not compete with request tracking. */}
      {heardToken && <HeardAboutUsCard token={heardToken} />}
    </div>
  )
}

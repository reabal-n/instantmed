"use client"

import { Check, Clock3, Loader2, MailCheck, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"

import { HeardAboutUsCard } from "@/components/patient/heard-about-us-card"
import { Button } from "@/components/ui/button"
import { Confetti } from "@/components/ui/confetti"
import { Heading } from "@/components/ui/heading"
import { buildCompleteAccountPostSignInHref } from "@/lib/auth/complete-account-handoff"
import { CONTACT_EMAIL } from "@/lib/constants"
import { REQUEST_CONFIRMED_HREF } from "@/lib/dashboard/routes"
import { clearDraftAfterPayment } from "@/lib/request/draft-storage"
import type { CompleteAccountPaymentState } from "@/lib/stripe/payment-integrity"
import { useAuth } from "@/lib/supabase/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { detectRelayEmail, getRelayEmailMessage } from "@/lib/validation/email-relay"

export function CompleteAccountForm({
  intakeId,
  email,
  paidServiceCategory,
  paidFlowInstanceId,
  paymentState = "unconfirmed",
  requiresPaymentReconciliation = false,
  sessionId,
  heardToken,
}: {
  intakeId?: string
  email?: string
  /** Set by the page ONLY when payment was server-confirmed (session match + paid). */
  paidServiceCategory?: string
  /** Flow id paired with the paid service so stale success tabs cannot clear fresh work. */
  paidFlowInstanceId?: string
  /** Public-route payment proof. Non-paid states must never render success UI. */
  paymentState?: CompleteAccountPaymentState
  /** Stripe is paid, but the exact-current durable intake transition is still pending. */
  requiresPaymentReconciliation?: boolean
  /** Exact Checkout Session already matched to this intake by the server page. */
  sessionId?: string
  heardToken?: string
}) {
  const router = useRouter()
  const { user, isSignedIn, isLoaded } = useAuth()
  const postSignInHref = buildCompleteAccountPostSignInHref({
    intakeId,
  })
  const checkoutEmail = email?.trim().toLowerCase() ?? ""
  const signedInEmailMatchesCheckout = Boolean(
    checkoutEmail && user?.email?.trim().toLowerCase() === checkoutEmail,
  )
  const relayEmailNote = email ? getRelayEmailMessage(detectRelayEmail(email)) : null

  const [showConfetti, setShowConfetti] = useState(false)
  const [accountLinkState, setAccountLinkState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [accountLinkError, setAccountLinkError] = useState("")
  const [reconciliationAttempt, setReconciliationAttempt] = useState(0)
  const [reconciliationState, setReconciliationState] = useState<"idle" | "checking" | "error">("idle")

  useEffect(() => {
    if (!requiresPaymentReconciliation || !intakeId || !sessionId) return

    let cancelled = false
    setReconciliationState("checking")

    void fetch("/api/stripe/reconcile-guest-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intakeId, sessionId }),
    })
      .then(async (response) => {
        const result = await response.json() as { success?: boolean }
        if (cancelled) return
        if (!response.ok || !result.success) {
          setReconciliationState("error")
          return
        }
        router.refresh()
      })
      .catch(() => {
        if (!cancelled) setReconciliationState("error")
      })

    return () => {
      cancelled = true
    }
  }, [intakeId, reconciliationAttempt, requiresPaymentReconciliation, router, sessionId])

  // Guest checkouts land here (never on /patient/intakes/success) — retire the
  // paid service's local draft so a return to /request can't restore straight
  // to Pay and double-charge past the checkout idempotency bucket. The page
  // only passes paidServiceCategory after server-confirming payment.
  const draftClearedRef = useRef(false)
  useEffect(() => {
    if (
      draftClearedRef.current ||
      paymentState !== "paid" ||
      !paidServiceCategory ||
      !paidFlowInstanceId
    ) return
    draftClearedRef.current = true
    clearDraftAfterPayment(
      paidServiceCategory,
      paidFlowInstanceId,
      paymentState,
    )
  }, [paidFlowInstanceId, paidServiceCategory, paymentState])

  useEffect(() => {
    if (paymentState !== "paid") return
    // If already signed in, redirect through post-signin to ensure profile is linked
    if (isLoaded && isSignedIn && signedInEmailMatchesCheckout && intakeId) {
      const confettiTimer = setTimeout(() => {
        setShowConfetti(true)
      }, 0)

      const redirectTimer = setTimeout(() => {
        router.push(postSignInHref)
      }, 1000)

      return () => {
        clearTimeout(confettiTimer)
        clearTimeout(redirectTimer)
      }
    }
  }, [
    intakeId,
    isLoaded,
    isSignedIn,
    paymentState,
    postSignInHref,
    router,
    signedInEmailMatchesCheckout,
  ])

  const handleCreateAccount = async () => {
    if (!email) {
      const returnUrl = encodeURIComponent(postSignInHref)
      const params = new URLSearchParams({ redirect: returnUrl })
      router.push(`/sign-up?${params.toString()}`)
      return
    }

    setAccountLinkState("sending")
    setAccountLinkError("")

    try {
      const supabase = createClient()
      const callbackUrl = new URL("/auth/callback", window.location.origin)
      callbackUrl.searchParams.set("next", postSignInHref)
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: callbackUrl.toString(),
          shouldCreateUser: true,
        },
      })

      if (authError) {
        setAccountLinkError(
          authError.status === 429 || authError.message?.toLowerCase().includes("rate")
            ? "Too many attempts. Please wait a few minutes before trying again."
            : "We couldn’t send the secure link. Please try again.",
        )
        setAccountLinkState("error")
        return
      }

      setAccountLinkState("sent")
    } catch {
      setAccountLinkError(
        "We couldn’t send the secure link. Check your connection and try again.",
      )
      setAccountLinkState("error")
    }
  }

  const handleSkipAccount = () => {
    router.replace(REQUEST_CONFIRMED_HREF)
  }

  if (paymentState !== "paid") {
    const isReconciling = requiresPaymentReconciliation
    const isProcessing = paymentState === "processing"
    const RecoveryIcon = isReconciling ? Loader2 : isProcessing ? Clock3 : ShieldAlert

    return (
      <div
        className="rounded-2xl border border-border/50 bg-white p-8 shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none"
        role="status"
      >
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
            <RecoveryIcon
              aria-hidden="true"
              className={`h-8 w-8 text-amber-700 dark:text-amber-300 ${isReconciling && reconciliationState !== "error" ? "animate-spin" : ""}`}
            />
          </div>
          <Heading as="h1" level="h2">
            {isReconciling
              ? reconciliationState === "error"
                ? "Payment confirmed — request update delayed"
                : "Confirming your request"
              : isProcessing
              ? "Payment is still processing"
              : "We can’t confirm payment yet"}
          </Heading>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {isReconciling
              ? reconciliationState === "error"
                ? "Stripe confirmed your payment, but we couldn’t finish updating your request. Please don’t pay again. Try verification once more or contact support."
                : "Stripe confirmed your payment. We’re securely adding your request to the doctor review queue now."
              : isProcessing
              ? "Stripe has not confirmed the payment yet. Please don’t try payment again. We’ll update your request when the result arrives."
              : "We could not verify this payment. Please don’t try payment again. Contact support so we can check it before another charge is attempted."}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {isReconciling && reconciliationState === "error" && (
            <Button
              className="w-full rounded-xl"
              onClick={() => setReconciliationAttempt((attempt) => attempt + 1)}
              size="lg"
            >
              Try verification again
            </Button>
          )}
          <Button asChild className="w-full rounded-xl" size="lg">
            <a href={`mailto:${CONTACT_EMAIL}`}>Contact support</a>
          </Button>
          <Button asChild className="w-full rounded-xl" size="lg" variant="outline">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    )
  }

  // If already signed in, show success message
  if (isLoaded && isSignedIn && signedInEmailMatchesCheckout) {
    return (
      <>
        <Confetti trigger={showConfetti} />
        <div className="p-8 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light mb-4">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Payment successful</h1>
            <p className="text-muted-foreground">Taking you to your request...</p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4 text-primary" />
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="p-8 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]">
        <div className="text-center mb-6">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
            <Check className="h-8 w-8 text-success" aria-hidden="true" />
          </div>
          <span className="mb-2 inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Optional account
          </span>
          <h1 className="mb-2 text-2xl font-semibold">Your request is confirmed</h1>
          <p className="text-muted-foreground">
            No account is required to submit this request or receive email updates. Secure sign-in may be needed later to reply to a doctor or open clinical documents. We can send the link now — no password or retyping.
          </p>
        </div>

        <div className="space-y-4">
          {email && (
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">Updates will go to</p>
              <p className="font-medium">{email}</p>
              {/* Relay users (Apple Hide My Email) read forwarded copies in the
                  inbox behind the relay — without this line, "we'll email you"
                  reads as a broken promise (2026-07-02 support incident). */}
              {relayEmailNote && (
                <p className="text-xs text-muted-foreground mt-1.5">{relayEmailNote}</p>
              )}
            </div>
          )}

          {accountLinkState === "sent" ? (
            <div className="rounded-xl border border-success/20 bg-success-light p-4 text-center" role="status">
              <MailCheck className="mx-auto mb-2 h-6 w-6 text-success" aria-hidden="true" />
              <p className="font-medium text-foreground">Check your inbox</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open the secure link we sent to finish signing in and connect this request.
              </p>
            </div>
          ) : (
            <Button
              onClick={() => void handleCreateAccount()}
              className="w-full rounded-xl"
              disabled={accountLinkState === "sending"}
              size="lg"
            >
              {accountLinkState === "sending" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending secure link...
                </>
              ) : (
                "Email me a sign-in link"
              )}
            </Button>
          )}

          {accountLinkError && (
            <p className="text-center text-sm text-destructive" role="alert">
              {accountLinkError}
            </p>
          )}

          <Button
            type="button"
            onClick={handleSkipAccount}
            className="w-full rounded-xl"
            size="lg"
            variant="outline"
          >
            Continue without an account
          </Button>
        </div>

        {/* Attribution survey lives inside the payment-confirmed card: both
            CTAs above navigate away, so the old below-card placement was never
            reached (guests are the dark-traffic cohort this survey exists for). */}
        {heardToken && (
          <div className="mt-6 border-t border-border/40 pt-5">
            <HeardAboutUsCard token={heardToken} variant="inline" />
          </div>
        )}

        {!email && (
          <p className="text-xs text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <a href={`/sign-in?redirect=${encodeURIComponent(postSignInHref)}`} className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

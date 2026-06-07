"use client"

/**
 * Checkout Step - Review and payment
 * Uses shared CheckoutButton and integrates with Stripe checkout
 */

import { motion } from "framer-motion"
import { Check, Clock, Lock, MessageSquare, RefreshCw, ShieldCheck, Smartphone, UserX } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"
import { PaymentLogos } from "@/components/checkout/payment-logos"
import { GuaranteeBadge } from "@/components/marketing/guarantee-badge"
import { ExpressReviewToggle } from "@/components/request/shared/express-review-toggle"
import { CheckoutButton } from "@/components/shared/checkout-button"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { useReducedMotion } from "@/components/ui/motion"
import { getAttribution } from "@/lib/analytics/attribution"
import { trackFunnelStep } from "@/lib/analytics/conversion-tracking"
import { usePostHog } from "@/lib/analytics/posthog-context"
import { PRICING as APP_PRICING } from "@/lib/constants"
import { getDisplayPrice, getServiceDisplayLabel } from "@/lib/request/display-helpers"
import { normalizeMedicationEntriesAnswer, stringAnswer } from "@/lib/request/intake-answer-normalizers"
import { getActiveServerDraftSessionId } from "@/lib/request/server-draft"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

// getConsultSubtypePrice from @/lib/stripe/price-mapping available if needed
import { useRequestStore } from "../store"

// Prices sourced from lib/constants.ts (single source of truth)
const PRICING: Record<UnifiedServiceType, { base: number; label: string }> = {
  'med-cert': {
    base: APP_PRICING.MED_CERT,
    label: 'Medical Certificate'
  },
  'prescription': {
    base: APP_PRICING.REPEAT_SCRIPT,
    label: 'Prescription Request'
  },
  'repeat-script': {
    base: APP_PRICING.REPEAT_SCRIPT,
    label: 'Repeat Prescription'
  },
  'consult': {
    base: APP_PRICING.CONSULT,
    label: 'Doctor Consultation'
  },
}

// Use CONSULT_SUBTYPE_DISPLAY_LABELS from display-helpers (single source of truth)

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default function CheckoutStep({ serviceType }: { serviceType: UnifiedServiceType }) {
  const { answers, getIdentity, setConsent, authContext } = useRequestStore()
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCheckmark, setShowCheckmark] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  // Express Review defaults OFF - patient opts in consciously
  const [isPriority, setIsPriority] = useState(false)
  const consentRef = useRef<HTMLDivElement>(null)

  const duration = answers.duration as string | undefined
  const consultSubtype = answers.consultSubtype as string | undefined
  const isMedCertCheckout = serviceType === "med-cert"
  const certType = answers.certType ? String(answers.certType) : undefined

  // Track checkout view once on mount
  useEffect(() => {
    posthog?.capture('checkout_viewed', { service_type: serviceType, consult_subtype: consultSubtype })
  }, [posthog, serviceType, consultSubtype])

  const _pricing = PRICING[serviceType] || PRICING['med-cert']

  const price = getDisplayPrice(serviceType, answers)
  const displayLabel = getServiceDisplayLabel(serviceType, consultSubtype)
  const certTypeLabel = certType ? certType.charAt(0).toUpperCase() + certType.slice(1) : "Certificate"
  const durationLabel = duration ? `${duration} day${duration !== "1" ? "s" : ""}` : undefined

  // Single consent controls both toggles
  const handleConsentChange = (checked: boolean) => {
    setConsentGiven(checked)
    setConsent('agreedToTerms', checked)
    setConsent('confirmedAccuracy', checked)
  }

  const canCheckout = consentGiven

  // When the patient taps Pay without ticking consent, don't sit on a dead
  // greyed button (especially the mobile sticky one) — scroll the consent box
  // into view, focus it, and let the aria-live hint explain what's needed.
  const handleDisabledCheckout = () => {
    consentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    consentRef.current?.querySelector("button")?.focus()
  }

  const handlePayClick = () => {
    if (!canCheckout) {
      handleDisabledCheckout()
      return
    }
    void handleCheckout()
  }

  const handleCheckout = async () => {
    if (!canCheckout) return

    setIsProcessing(true)
    setError(null)

    posthog?.capture('checkout_initiated', {
      service_type: serviceType,
      price_dollars: price + (isPriority ? APP_PRICING.PRIORITY_FEE : 0),
      consult_subtype: consultSubtype,
      is_priority: isPriority,
    })
    // Pass email for Enhanced Conversions cross-device attribution
    const identity = getIdentity()
    void trackFunnelStep('checkout', serviceType, identity.email)

    try {
      const answersWithConsents = {
        ...answers,
        agreedToTerms: true,
        confirmedAccuracy: true,
        telehealthConsentGiven: true,
        isPriority,
      }
      // Retrieve persisted attribution (captured on landing page load)
      const attribution = getAttribution()

      const result = await createCheckoutFromUnifiedFlow({
        serviceType,
        answers: answersWithConsents,
        identity,
        attribution,
        posthogDistinctId: posthog?.get_distinct_id() || undefined,
        serverDraftSessionId: getActiveServerDraftSessionId(serviceType) ?? undefined,
      })

      if (!result.success) {
        posthog?.capture('checkout_failed', {
          service_type: serviceType,
          consult_subtype: consultSubtype,
          stage: 'session_creation',
        })
        setError(result.error || 'Failed to create checkout session')
        return
      }

      if (result.checkoutUrl) {
        posthog?.capture('checkout_redirecting', {
          service_type: serviceType,
          intake_id: result.intakeId,
          price_dollars: price,
        })
        setShowCheckmark(true)
        setTimeout(() => {
          window.location.href = result.checkoutUrl!
        }, 600)
      } else {
        posthog?.capture('checkout_failed', {
          service_type: serviceType,
          consult_subtype: consultSubtype,
          stage: 'session_creation',
        })
        setError('Unable to create payment session. Please try again.')
      }
    } catch {
      posthog?.capture('checkout_failed', {
        service_type: serviceType,
        consult_subtype: consultSubtype,
        stage: 'exception',
      })
      setError('Something went wrong. Please try again or contact support.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    // Phase 4b prod hotfix (2026-05-12): the Pay step used to wrap the
    // summary card / Express Review / consent rows in framer-motion
    // `stagger.item` variants with `initial="initial"`. On cold loads
    // where the framer-motion stagger animation booted slowly, the
    // entire content stayed at opacity:0 for several seconds, leaving
    // the user staring at an empty page above a disabled Pay button.
    // Decorative entrance is not worth that blank-state risk on a
    // price-critical view — replaced with plain divs so the form
    // renders the instant React hydrates. The deliberate success
    // checkmark animation (further down) keeps its own motion wrapper.
    <div className="space-y-5">
      {/* Guest badge - only for unauthenticated users */}
      {!authContext.isAuthenticated && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <UserX className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>No account required - pay as a guest</span>
        </div>
      )}

      {/* Regulator badges - pinned to the top of checkout so they stay visible
          when the sticky footer is compressed on small viewports. */}
      {!isMedCertCheckout && (
        <div>
        <TrustBadgeRow
          badges={[
            { id: "ahpra", variant: "styled" },
            { id: "legitscript", variant: "styled" },
          ]}
          className="justify-center gap-3"
        />
        </div>
      )}

      {/* Summary card */}
      <div
        className={`rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:bg-card ${
          isMedCertCheckout ? "space-y-2 p-3.5" : "space-y-3 p-4"
        }`}
      >
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-primary" />
          {isMedCertCheckout ? "Ready to submit" : "Request Summary"}
        </h3>

        <div className="space-y-2 border-t pt-2">
          {isMedCertCheckout ? (
            <ReviewItem
              label="Medical certificate"
              value={[certTypeLabel, durationLabel].filter(Boolean).join(" - ")}
            />
          ) : (
            <>
              <ReviewItem label="Service" value={displayLabel} />

              {(serviceType === 'prescription' || serviceType === 'repeat-script') && (() => {
                const meds = normalizeMedicationEntriesAnswer(answers.medications).filter((med) => med.name)
                if (meds.length > 1) {
                  return meds.map((med, i) => (
                    <ReviewItem key={i} label={`Medication ${i + 1}`} value={med.name} />
                  ))
                }
                const medicationName = stringAnswer(answers.medicationName)
                return medicationName ? (
                  <ReviewItem label="Medication" value={medicationName} />
                ) : null
              })()}
            </>
          )}
        </div>

        {/* Price section */}
        <div className="pt-3 border-t space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{displayLabel}</span>
            <span className="font-medium">${price.toFixed(2)}</span>
          </div>
          {isPriority && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Express Review</span>
              <span className="font-medium">${APP_PRICING.PRIORITY_FEE.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-dashed">
            <div>
              <span className="font-medium">Total{" "}</span>
              <span className="text-xs text-muted-foreground ml-2">one-time fee</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold text-primary">
                ${(price + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)).toFixed(2)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {isMedCertCheckout
              ? "Doctor review starts after payment. If approved, your certificate is emailed to you."
              : "One-time fee. Your doctor reviews right after."}
          </p>
          <div className="flex justify-end border-t border-border/40 pt-2">
            <ExpressReviewToggle
              id="express-review-toggle"
              checked={isPriority}
              onCheckedChange={setIsPriority}
              onOptIn={() => posthog?.capture('express_review_opted_in', { service_type: serviceType })}
            />
          </div>
        </div>
      </div>


      {/* What you'll get - prescription specific */}
      {(serviceType === 'prescription' || serviceType === 'repeat-script') && (
        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            What you&apos;ll get
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>eScript sent directly to your phone via SMS</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Submitted immediately; doctor review follows when available</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Take your phone to any pharmacy - they&apos;ll scan your eScript QR code.
            If the doctor needs more information before prescribing, they&apos;ll reach out directly.
          </p>
        </div>
      )}

      {/* Single combined consent - Checkbox (not Switch) for legal acknowledgment semantics */}
      <div ref={consentRef}>
        <label
          htmlFor="consent-checkbox"
          className={`w-full p-3.5 rounded-xl border-2 text-left transition-[background-color,border-color] duration-200 flex items-start gap-3 cursor-pointer ${
            consentGiven
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
        >
          <Checkbox
            id="consent-checkbox"
            checked={consentGiven}
            onCheckedChange={(checked) => handleConsentChange(checked === true)}
            className="mt-1 shrink-0"
            aria-label="Agree to Terms of Service and Privacy Policy"
          />
          <span className="text-sm leading-relaxed">
            By paying, I confirm the information I&apos;ve provided is accurate and I agree to the{' '}
            <a href="/terms" className="text-primary underline" target="_blank" onClick={(e) => e.stopPropagation()}>
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary underline" target="_blank" onClick={(e) => e.stopPropagation()}>
              Privacy Policy
            </a>
          </span>
        </label>
      </div>

      {/* Inline trust strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-success" />
          AHPRA-registered doctors
        </span>
        <span className="flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          Stripe secure
        </span>
        <span className="flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" />
          Full refund if declined
        </span>
      </div>

      {/* Error message */}
      <div aria-live="polite">
        {error && (
          error.toLowerCase().includes("account already exists") ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription className="space-y-2">
                <p>An account already exists with this email address.</p>
                <p>
                  <a
                    href={`/sign-in?redirect_url=${encodeURIComponent('/request' + window.location.search)}`}
                    className="underline font-medium hover:opacity-80"
                  >
                    Sign in to continue →
                  </a>
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )
        )}
      </div>

      {/* Spacer for sticky CTA on mobile */}
      <div className="h-36 sm:hidden" />

      {/* Checkout button - sticky on mobile, inline on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:z-auto">
        <div className="max-w-lg mx-auto space-y-2">
          {/* Refund guarantee pill - sits directly above the pay button. Shown
              for every service incl. med-cert (highest volume, most price-
              sensitive): the refund-on-decline promise is the strongest
              objection-killer at the pay moment. */}
          <div className="flex justify-center pb-1">
            <GuaranteeBadge size="md" />
          </div>

          {!canCheckout && (
            <p id="checkout-consent-hint" className="text-center text-xs text-warning" aria-live="polite">
              Tick the box above to pay
            </p>
          )}

          <CheckoutButton
            onClick={handlePayClick}
            isLoading={isProcessing}
            disabled={isProcessing}
            ariaDisabled={!canCheckout}
            ariaDescribedby={!canCheckout ? "checkout-consent-hint" : undefined}
            price={`$${(price + (isPriority ? APP_PRICING.PRIORITY_FEE : 0)).toFixed(2)}`}
            label="Pay"
            loadingLabel="Processing..."
            variant="prominent"
          />

          {/* Stripe + payment method logos - payment trust at the pay moment,
              shown for every service. */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
            <PaymentLogos />
          </div>
        </div>
      </div>

      {/* Checkmark overlay on successful checkout creation */}
      {showCheckmark && (
        <motion.div
          role="status"
          aria-label="Payment confirmed, redirecting to Stripe for secure payment"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
        >
          <motion.div
            className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
            initial={prefersReducedMotion ? {} : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }}
          >
            <Check className="w-8 h-8 text-primary" aria-hidden="true" />
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

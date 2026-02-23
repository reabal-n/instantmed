"use client"

/**
 * Checkout Step - Review and payment
 * Uses shared CheckoutButton and integrates with Stripe checkout
 *
 * UX improvements:
 * - Single combined consent toggle (accuracy + terms)
 * - Enlarged price with "one-time fee" callout
 * - Payment method logos (Visa, MC, Amex, Apple Pay, Google Pay)
 * - "No account required" messaging
 * - Refund guarantee badge next to pay button
 */

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { stagger } from "@/lib/motion"
import { Check, Shield, Clock, Smartphone, MessageSquare, RefreshCw, Lock, CreditCard, ShieldCheck, UserX } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckoutButton, CheckoutSection } from "@/components/shared/checkout-button"
import { RefundGuaranteeBadge } from "@/components/checkout/refund-guarantee-badge"
import { Confetti } from "@/components/ui/confetti"
import { getConsultSubtypePrice } from "@/lib/stripe/price-mapping"
import { useRequestStore } from "../store"
import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { getQueueEstimate } from "@/lib/data/queue-availability"
import { PRICING as APP_PRICING, MED_CERT_DURATIONS } from "@/lib/constants"

interface CheckoutStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// Prices sourced from lib/constants.ts (single source of truth)
const PRICING: Record<UnifiedServiceType, { base: number; label: string }> = {
  'med-cert': {
    base: APP_PRICING.MED_CERT,
    label: 'Medical Certificate'
  },
  'prescription': {
    base: APP_PRICING.NEW_SCRIPT,
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

const PAYMENT_METHODS = ['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay']

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default function CheckoutStep({ serviceType }: CheckoutStepProps) {
  const { answers, getIdentity, setConsent, chatSessionId } = useRequestStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimatedWait, setEstimatedWait] = useState("~1 hour")
  const [triggerConfetti, setTriggerConfetti] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)

  useEffect(() => {
    getQueueEstimate().then((est) => setEstimatedWait(est.estimatedWait)).catch(() => {})
  }, [])

  const pricing = PRICING[serviceType] || PRICING['med-cert']

  // Get dynamic price based on service type and subtype
  const duration = answers.duration as string | undefined
  const consultSubtype = answers.consultSubtype as string | undefined

  let price = pricing.base
  if (serviceType === 'med-cert' && duration) {
    const durationNum = Number(duration) as keyof typeof MED_CERT_DURATIONS.prices
    price = MED_CERT_DURATIONS.prices[durationNum] ?? pricing.base
  } else if (serviceType === 'consult') {
    price = getConsultSubtypePrice(consultSubtype)
  }

  // Subtype-specific label for consults
  const CONSULT_SUBTYPE_LABELS: Record<string, string> = {
    general: 'General Consultation',
    ed: 'ED Consultation',
    hair_loss: 'Hair Loss Consultation',
    womens_health: "Women's Health Consultation",
    weight_loss: 'Weight Management Consultation',
  }
  const displayLabel = serviceType === 'consult' && consultSubtype
    ? CONSULT_SUBTYPE_LABELS[consultSubtype] || pricing.label
    : pricing.label

  // Single consent controls both toggles
  const handleConsentChange = (checked: boolean) => {
    setConsentGiven(checked)
    setConsent('agreedToTerms', checked)
    setConsent('confirmedAccuracy', checked)
  }

  const canCheckout = consentGiven

  const handleCheckout = async () => {
    if (!canCheckout) return

    setIsProcessing(true)
    setError(null)

    try {
      const identity = getIdentity()
      const answersWithConsents = {
        ...answers,
        agreedToTerms: true,
        confirmedAccuracy: true,
        telehealthConsentGiven: true,
      }
      const result = await createCheckoutFromUnifiedFlow({
        serviceType,
        answers: answersWithConsents,
        identity,
        chatSessionId: chatSessionId || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Failed to create checkout session')
        return
      }

      if (result.checkoutUrl) {
        setTriggerConfetti(true)
        setTimeout(() => {
          window.location.href = result.checkoutUrl!
        }, 600)
      } else {
        setError('Unable to create payment session. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <motion.div
      className="space-y-5"
      variants={stagger.containerFast}
      initial="initial"
      animate="animate"
    >
      {/* No account required badge */}
      <motion.div variants={stagger.item} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <UserX className="w-4 h-4 text-primary" />
        <span>No account required — pay as a guest</span>
      </motion.div>

      {/* Summary card with enlarged price */}
      <motion.div variants={stagger.item} className="p-4 rounded-xl border bg-card space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          Request Summary
        </h3>

        <div className="space-y-2 pt-2 border-t">
          <ReviewItem label="Service" value={displayLabel} />

          {serviceType === 'med-cert' && (
            <>
              {answers.certType && (
                <ReviewItem
                  label="Certificate type"
                  value={String(answers.certType).charAt(0).toUpperCase() + String(answers.certType).slice(1)}
                />
              )}
              {duration && (
                <ReviewItem label="Duration" value={`${duration} day${duration !== '1' ? 's' : ''}`} />
              )}
            </>
          )}

          {(serviceType === 'prescription' || serviceType === 'repeat-script') && (() => {
            const meds = answers.medications as Array<{ name: string }> | undefined
            if (meds && meds.length > 1) {
              return meds.map((med, i) => (
                <ReviewItem key={i} label={`Medication ${i + 1}`} value={med.name} />
              ))
            }
            return answers.medicationName ? (
              <ReviewItem label="Medication" value={String(answers.medicationName)} />
            ) : null
          })()}
        </div>

        {/* Enlarged price section */}
        <div className="pt-3 border-t">
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-medium">Total</span>
              <span className="text-xs text-muted-foreground ml-2">one-time fee</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-primary">${price.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pay after your request is created. Full refund if we can&apos;t help.
          </p>
        </div>
      </motion.div>

      {/* Trust badges */}
      <motion.div variants={stagger.item} className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          AHPRA-registered doctors
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-primary" />
          {estimatedWait} review
        </span>
        <span className="flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5 text-green-600" />
          Money-back guarantee
        </span>
        <span className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-green-600" />
          256-bit encrypted
        </span>
      </motion.div>

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
              <span>Typically reviewed within 1 hour during business hours</span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Take your phone to any pharmacy — they&apos;ll scan your eScript QR code.
            If your medication requires a new prescription or has never been prescribed to you before,
            our doctor will contact you to arrange a consultation.
          </p>
        </div>
      )}

      {/* Single combined consent */}
      <motion.div variants={stagger.item}>
        <div
          className={`w-full p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-3 cursor-pointer ${
            consentGiven
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-border hover:border-primary/40"
          }`}
          onClick={() => handleConsentChange(!consentGiven)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <span onClick={(e) => e.stopPropagation()} className="mt-0.5 shrink-0">
            <Checkbox
              checked={consentGiven}
              onCheckedChange={(checked) => handleConsentChange(checked)}
            />
          </span>
          <p className="text-sm leading-relaxed cursor-pointer">
            By paying, I confirm the information I&apos;ve provided is accurate and I agree to the{' '}
            <a href="/terms" className="text-primary underline" target="_blank" onClick={(e) => e.stopPropagation()}>
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary underline" target="_blank" onClick={(e) => e.stopPropagation()}>
              Privacy Policy
            </a>
          </p>
        </div>
      </motion.div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Spacer for sticky CTA on mobile */}
      <div className="h-44 sm:hidden" />

      {/* Checkout button with guarantee badge - sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:z-auto">
        <div className="max-w-lg mx-auto space-y-2.5">
          <CheckoutSection>
            <CheckoutButton
              onClick={handleCheckout}
              isLoading={isProcessing}
              disabled={!canCheckout}
              price={`$${price.toFixed(2)}`}
              label="Continue to payment"
              loadingLabel="Processing..."
              variant="prominent"
            />
          </CheckoutSection>

          {/* Refund guarantee right next to pay button */}
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">Full refund if we can&apos;t help — guaranteed</span>
          </div>

          {/* Payment method logos */}
          <div className="flex items-center justify-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground/50" />
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method}
                className="text-[10px] text-muted-foreground/60 px-1.5 py-0.5 rounded bg-muted/30 border border-border/30"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Confetti on successful checkout creation */}
      <Confetti
        trigger={triggerConfetti}
        options={{ particleCount: 100, spread: 70 }}
        onComplete={() => setTriggerConfetti(false)}
      />
    </motion.div>
  )
}

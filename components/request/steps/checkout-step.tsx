"use client"

/**
 * Checkout Step - Review and payment
 * Uses shared CheckoutButton and integrates with Stripe checkout
 */

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { stagger } from "@/lib/motion"
import { Check, Shield, Clock, Smartphone, MessageSquare, RefreshCw, Lock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CheckoutButton, CheckoutSection } from "@/components/shared/checkout-button"
import { RefundGuaranteeBadge } from "@/components/checkout/refund-guarantee-badge"
import { getConsultSubtypePrice } from "@/lib/stripe/price-mapping"
import { useRequestStore } from "../store"
import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"
import type { UnifiedServiceType } from "@/lib/request/step-registry"
import { getQueueEstimate } from "@/lib/data/queue-availability"

interface CheckoutStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// Prices from environment variables with fallback to defaults
// These should match Stripe prices exactly
// Note: prescription and repeat-script share the same price (NEXT_PUBLIC_PRICE_PRESCRIPTION)
const PRICING: Record<UnifiedServiceType, { base: number; label: string }> = {
  'med-cert': { 
    base: parseFloat(process.env.NEXT_PUBLIC_PRICE_MED_CERT || '19.95'), 
    label: 'Medical Certificate' 
  },
  'prescription': { 
    base: parseFloat(process.env.NEXT_PUBLIC_PRICE_PRESCRIPTION || '29.95'), 
    label: 'Prescription Request' 
  },
  'repeat-script': { 
    base: parseFloat(process.env.NEXT_PUBLIC_PRICE_PRESCRIPTION || '29.95'), 
    label: 'Repeat Prescription' 
  },
  'consult': { 
    base: parseFloat(process.env.NEXT_PUBLIC_PRICE_CONSULT || '49.95'), 
    label: 'Doctor Consultation' 
  },
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export default function CheckoutStep({ serviceType }: CheckoutStepProps) {
  const { answers, getIdentity, agreedToTerms, confirmedAccuracy, setConsent, chatSessionId } = useRequestStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estimatedWait, setEstimatedWait] = useState("~1 hour")

  useEffect(() => {
    getQueueEstimate().then((est) => setEstimatedWait(est.estimatedWait)).catch(() => {})
  }, [])

  const pricing = PRICING[serviceType] || PRICING['med-cert']

  // Get dynamic price based on service type and subtype
  const duration = answers.duration as string | undefined
  const consultSubtype = answers.consultSubtype as string | undefined

  // Calculate price: med-cert uses duration, consult uses subtype (from env vars), others use base
  let price = pricing.base
  if (serviceType === 'med-cert' && duration === '2') {
    price = 29.95
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

  const canCheckout = agreedToTerms && confirmedAccuracy

  const handleCheckout = async () => {
    if (!canCheckout) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const identity = getIdentity()
      // Merge consent fields into answers for server-side validation
      const answersWithConsents = {
        ...answers,
        agreedToTerms,
        confirmedAccuracy,
        telehealthConsentGiven: true, // Implicitly consented by reaching checkout
      }
      const result = await createCheckoutFromUnifiedFlow({
        serviceType,
        answers: answersWithConsents,
        identity,
        chatSessionId: chatSessionId || undefined, // Pass chat session ID for transcript linking
      })
      
      if (!result.success) {
        setError(result.error || 'Failed to create checkout session')
        return
      }
      
      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      } else {
        // Handle edge case where success is true but no URL returned
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
      {/* Summary card */}
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
        
        <div className="pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold text-primary">${price.toFixed(2)}</span>
          </div>
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

      {/* Consents */}
      <motion.div variants={stagger.item} className="space-y-3 p-4 rounded-xl border bg-muted/30">
        <div className="flex items-start gap-3">
          <Switch
            id="accuracy"
            checked={confirmedAccuracy}
            onCheckedChange={(checked) => setConsent('confirmedAccuracy', checked)}
          />
          <Label htmlFor="accuracy" className="text-sm leading-relaxed cursor-pointer">
            I confirm the information I&apos;ve provided is accurate and complete
          </Label>
        </div>
        
        <div className="flex items-start gap-3">
          <Switch
            id="terms"
            checked={agreedToTerms}
            onCheckedChange={(checked) => setConsent('agreedToTerms', checked)}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
            I agree to the{' '}
            <a href="/terms" className="text-primary underline" target="_blank">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary underline" target="_blank">Privacy Policy</a>
          </Label>
        </div>
      </motion.div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Spacer for sticky CTA on mobile */}
      <div className="h-36 sm:hidden" />

      {/* Checkout button - sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:z-auto">
        <div className="max-w-lg mx-auto space-y-2">
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
          <div className="hidden sm:block pt-2">
            <RefundGuaranteeBadge />
          </div>
        </div>
      </div>

      {/* Refund guarantee - visible above sticky bar on mobile */}
      <div className="pt-2 sm:hidden">
        <RefundGuaranteeBadge />
      </div>
    </motion.div>
  )
}

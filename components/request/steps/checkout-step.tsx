"use client"

/**
 * Checkout Step - Review and payment
 * Uses shared CheckoutButton and integrates with Stripe checkout
 */

import { useState } from "react"
import { Check, Shield, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CheckoutButton, CheckoutSection } from "@/components/shared/checkout-button"
import { RefundGuaranteeBadge } from "@/components/checkout/refund-guarantee-badge"
import { PaymentMethodIcons } from "@/components/checkout/trust-badges"
import { useRequestStore } from "../store"
import { createCheckoutFromUnifiedFlow } from "@/app/actions/unified-checkout"
import type { UnifiedServiceType } from "@/lib/request/step-registry"

interface CheckoutStepProps {
  serviceType: UnifiedServiceType
  onNext: () => void
  onBack: () => void
  onComplete: () => void
}

// Prices from environment variables with fallback to defaults
// These should match Stripe prices exactly
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
    base: parseFloat(process.env.NEXT_PUBLIC_PRICE_REPEAT_SCRIPT || '29.95'), 
    label: 'Repeat Prescription' 
  },
  'consult': { 
    base: parseFloat(process.env.NEXT_PUBLIC_PRICE_CONSULT || '39.95'), 
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
  const { answers, getIdentity, agreedToTerms, confirmedAccuracy, setConsent } = useRequestStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pricing = PRICING[serviceType] || PRICING['med-cert']
  
  // Get dynamic price for med-cert based on duration
  const duration = answers.duration as string | undefined
  const price = serviceType === 'med-cert' && duration === '2' ? 29.95 : pricing.base

  const canCheckout = agreedToTerms && confirmedAccuracy

  const handleCheckout = async () => {
    if (!canCheckout) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      const identity = getIdentity()
      const result = await createCheckoutFromUnifiedFlow({
        serviceType,
        answers,
        identity,
      })
      
      if (!result.success) {
        setError(result.error || 'Failed to create checkout session')
        return
      }
      
      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Summary card */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          Request Summary
        </h3>
        
        <div className="space-y-2 pt-2 border-t">
          <ReviewItem label="Service" value={pricing.label} />
          
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
          
          {(serviceType === 'prescription' || serviceType === 'repeat-script') && answers.medicationName ? (
            <ReviewItem label="Medication" value={String(answers.medicationName)} />
          ) : null}
        </div>
        
        <div className="pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold text-primary">${price.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" />
          AHPRA doctors
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          ~1 hour review
        </span>
      </div>

      {/* Consents */}
      <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
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
      </div>

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Checkout button */}
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

      {/* Payment methods and guarantee */}
      <div className="space-y-3 pt-2">
        <PaymentMethodIcons />
        <RefundGuaranteeBadge />
      </div>
    </div>
  )
}

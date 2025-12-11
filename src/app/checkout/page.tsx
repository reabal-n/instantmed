'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { 
  Stethoscope, 
  ArrowLeft, 
  Shield, 
  Clock, 
  Zap, 
  FileText,
  Pill,
  AlertTriangle,
  CheckCircle2,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConfettiButton } from '@/components/ui/confetti'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// Pricing configuration
const PRICING = {
  sick_cert: {
    base: 2495, // in cents
    label: 'Medical Certificate',
    icon: FileText,
  },
  prescription: {
    base: 2995,
    label: 'Prescription',
    icon: Pill,
  },
}

const BACKDATING_FEE = 1000 // $10.00
const PRIORITY_FEE = 995 // $9.95

interface CheckoutFormProps {
  requestId: string
  serviceType: 'sick_cert' | 'prescription'
  isBackdated: boolean
  priorityReview: boolean
  onPriorityChange: (checked: boolean) => void
}

function CheckoutForm({ 
  requestId, 
  serviceType, 
  isBackdated, 
  priorityReview, 
  onPriorityChange 
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const pricing = PRICING[serviceType]
  const basePrice = pricing.base
  const backdatingFee = isBackdated ? BACKDATING_FEE : 0
  const priorityFee = priorityReview ? PRIORITY_FEE : 0
  const totalPrice = basePrice + backdatingFee + priorityFee

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Update the request with priority status
      if (priorityReview) {
        try {
          const { error: updateError } = await supabase
            .from('requests')
            .update({ priority_review: true })
            .eq('id', requestId)
          
          if (updateError) {
            console.error('Error updating priority status:', updateError)
            // Non-critical, continue with payment
          }
        } catch (updateErr) {
          console.error('Unexpected error updating priority:', updateErr)
          // Non-critical, continue with payment
        }
      }

      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?request_id=${requestId}`,
        },
      })

      if (submitError) {
        if (submitError.type === 'card_error' || submitError.type === 'validation_error') {
          setError(submitError.message || 'Payment failed')
        } else {
          setError('An unexpected error occurred.')
        }
        toast.error('Payment failed')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <Card className="border-2 border-teal-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <pricing.icon className="w-5 h-5 text-teal-600" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2">
            <span className="font-medium">{pricing.label}</span>
            <span className="font-semibold">${(basePrice / 100).toFixed(2)}</span>
          </div>
          
          {isBackdated && (
            <div className="flex justify-between items-center py-2 text-amber-700">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Backdating Review Fee
              </span>
              <span className="font-semibold">+${(backdatingFee / 100).toFixed(2)}</span>
            </div>
          )}
          
          {priorityReview && (
            <div className="flex justify-between items-center py-2 text-teal-700">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-600" />
                Priority Review (Under 30 mins)
              </span>
              <span className="font-semibold">+${(priorityFee / 100).toFixed(2)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center pt-2">
            <span className="text-lg font-bold tracking-tight">Total</span>
            <span className="text-2xl font-bold text-teal-600">${(totalPrice / 100).toFixed(2)} AUD</span>
          </div>
        </CardContent>
      </Card>

      {/* Priority Review Upsell */}
      <Card className={cn(
        'transition-all cursor-pointer',
        priorityReview ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'
      )}>
        <CardContent className="p-4">
          <div 
            className="flex items-start gap-4"
            onClick={() => onPriorityChange(!priorityReview)}
          >
            <Checkbox
              checked={priorityReview}
              onCheckedChange={onPriorityChange}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold">Priority Review</span>
                <span className="text-sm text-primary font-medium">+$9.95</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Get your request reviewed within <strong>30 minutes</strong> during business hours. 
                Skip the queue and receive your document faster.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Element */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement 
            options={{
              layout: 'tabs',
            }}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Submit Button - Sticky on mobile with glassmorphism */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto bg-white/95 backdrop-blur-md border-t md:border-t-0 border-slate-200/50 p-4 md:p-0 md:bg-transparent md:backdrop-blur-none dark:bg-slate-900/95 dark:border-slate-700/50 space-y-4">
        <ConfettiButton
          type="submit"
          size="lg"
          className="w-full h-12 min-h-[44px] text-base bg-teal-600 hover:bg-teal-700 text-white font-semibold"
          disabled={!stripe || isProcessing}
          options={{
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#00E2B5", "#06B6D4", "#8B5CF6", "#F59E0B", "#10B981"],
          }}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              Pay ${(totalPrice / 100).toFixed(2)} AUD
            </>
          )}
        </ConfettiButton>
        
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-teal-600" />
            <span className="font-medium">AES-256 Encrypted</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="w-4 h-4 text-teal-600" />
            <span className="font-medium">Secure Payment</span>
          </div>
        </div>
      </div>
    </form>
  )
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [priorityReview, setPriorityReview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestId = searchParams.get('request_id')
  const serviceType = searchParams.get('service') as 'sick_cert' | 'prescription'
  const isBackdated = searchParams.get('backdated') === 'true'

  useEffect(() => {
    const createPaymentIntent = async () => {
      if (!requestId || !serviceType) {
        setError('Invalid checkout session')
        setLoading(false)
        return
      }

      try {
        // Calculate total
        const basePrice = PRICING[serviceType].base
        const backdatingFee = isBackdated ? BACKDATING_FEE : 0
        const priorityFee = priorityReview ? PRIORITY_FEE : 0
        const totalPrice = basePrice + backdatingFee + priorityFee

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: totalPrice,
            requestId,
            serviceType,
            isBackdated,
            priorityReview,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create payment intent')
        }

        const data = await response.json()
        setClientSecret(data.clientSecret)
      } catch (err) {
        console.error('Error creating payment intent:', err)
        setError('Failed to initialize payment. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    createPaymentIntent()
  }, [requestId, serviceType, isBackdated, priorityReview])

  const handlePriorityChange = (checked: boolean) => {
    setPriorityReview(checked)
    // Reset client secret to create new payment intent with updated amount
    setClientSecret(null)
    setLoading(true)
  }

  if (!requestId || !serviceType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Session</h2>
            <p className="text-muted-foreground mb-4">
              This checkout session is invalid or has expired.
            </p>
            <Link href="/start">
              <Button>Start New Request</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm">
      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">InstantMed</span>
          </Link>
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 pb-32 md:pb-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Complete Your Payment
            </h1>
            <p className="text-muted-foreground">
              Secure payment powered by Stripe
            </p>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              AHPRA Registered
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-primary" />
              {"<"}2hr Response
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              Secure
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin mb-4" />
              <p className="text-muted-foreground">Loading payment form...</p>
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#0891b2',
                    colorBackground: '#ffffff',
                    colorText: '#1f2937',
                    colorDanger: '#dc2626',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <CheckoutForm
                requestId={requestId}
                serviceType={serviceType}
                isBackdated={isBackdated}
                priorityReview={priorityReview}
                onPriorityChange={handlePriorityChange}
              />
            </Elements>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Failed to load payment form. Please refresh the page.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-warm">
        <div className="w-8 h-8 border-4 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}


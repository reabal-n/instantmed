'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { CheckCircle2, Clock, Mail, FileText, ArrowRight, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function SuccessContent() {
  const searchParams = useSearchParams()
  const requestId = searchParams.get('request_id')
  const [countdown, setCountdown] = useState(5)

  // Trigger confetti on mount
  useEffect(() => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <header className="border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">InstantMed</span>
          </Link>
        </div>
      </header>

      {/* Success Content */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-lg mx-auto text-center">
          {/* Success Animation */}
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-14 h-14 text-green-600" />
            </div>
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-500/20 mx-auto animate-ping" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-green-700">
            Payment Successful!
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Your request has been submitted and is now being reviewed by our medical team.
          </p>

          {requestId && (
            <p className="text-sm text-muted-foreground mb-8">
              Reference: <span className="font-mono">{requestId.slice(0, 8).toUpperCase()}</span>
            </p>
          )}

          {/* What Happens Next Timeline */}
          <Card className="mb-8 text-left border-2 border-teal-100">
            <CardContent className="p-6 space-y-6">
              <h2 className="font-bold text-xl tracking-tight">What happens next?</h2>
              
              <div className="space-y-6 relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-teal-200" />
                
                <div className="flex gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 z-10 border-4 border-white">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="font-semibold text-base mb-1">1. Doctor Reviews (Pending)</p>
                    <p className="text-sm text-muted-foreground">
                      A registered doctor will review your request within 2 hours (priority reviews within 30 minutes).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 z-10 border-4 border-white">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="font-semibold text-base mb-1">2. SMS Sent (Next)</p>
                    <p className="text-sm text-muted-foreground">
                      You&apos;ll receive an SMS when your document is ready or if we need more information.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 relative">
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 z-10 border-4 border-white">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-base mb-1">3. Download PDF (Final)</p>
                    <p className="text-sm text-muted-foreground">
                      Once approved, your medical document will be available for download in your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-4">
            <Link href="/dashboard">
              <Button size="lg" className="w-full h-12 min-h-[44px] text-base bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full h-12 min-h-[44px]">
                Return to Home
              </Button>
            </Link>
          </div>

          {countdown > 0 && (
            <p className="text-sm text-muted-foreground mt-6">
              Redirecting to dashboard in {countdown} seconds...
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}


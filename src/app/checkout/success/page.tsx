'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Clock, Mail, FileText, ArrowRight, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Animated checkmark SVG component
function AnimatedCheckmark() {
  return (
    <motion.svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
    >
      <motion.circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="#16a34a"
        strokeWidth="4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
      <motion.path
        d="M24 42 L34 52 L56 28"
        fill="none"
        stroke="#16a34a"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
      />
    </motion.svg>
  )
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requestId = searchParams.get('request_id')
  const [countdown, setCountdown] = useState(5)

  // Redirect function
  const redirectToDashboard = useCallback(() => {
    router.push('/dashboard')
  }, [router])

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

    return () => clearInterval(interval)
  }, [])

  // Countdown and redirect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Redirect when countdown reaches 0
          redirectToDashboard()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [redirectToDashboard])

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 to-white">
      {/* Header - Glassmorphism */}
      <header className="border-b border-slate-200/50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">InstantMed</span>
          </Link>
        </div>
      </header>

      {/* Success Content */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-lg mx-auto text-center">
          {/* Animated Success Icon with Checkmark */}
          <motion.div 
            className="relative mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Celebration emoji */}
            <motion.span
              className="absolute -top-4 -right-4 text-4xl"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.8 }}
            >
              🎉
            </motion.span>
            
            {/* Background glow */}
            <motion.div 
              className="absolute inset-0 w-32 h-32 rounded-full bg-green-100 mx-auto"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            />
            
            {/* Animated ring */}
            <motion.div 
              className="absolute inset-0 w-32 h-32 rounded-full border-4 border-green-200 mx-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
            />
            
            {/* Checkmark container */}
            <div className="w-32 h-32 rounded-full bg-green-50 flex items-center justify-center mx-auto relative border-2 border-green-100">
              <AnimatedCheckmark />
            </div>
          </motion.div>

          <motion.h1 
            className="text-3xl md:text-4xl font-bold mb-4 text-green-700 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
          >
            Payment Successful!
          </motion.h1>
          
          <motion.p 
            className="text-lg text-muted-foreground mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
          >
            Your request has been submitted and is now being reviewed by our medical team.
          </motion.p>

          {requestId && (
            <motion.p 
              className="text-sm text-muted-foreground mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Reference: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{requestId.slice(0, 8).toUpperCase()}</span>
            </motion.p>
          )}

          {/* What Happens Next Timeline - Staggered */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className="mb-8 text-left border-2 border-teal-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardContent className="p-6 space-y-6">
                <h2 className="font-bold text-xl tracking-tight">What happens next?</h2>
                
                <div className="space-y-6 relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-300 to-slate-200" />
                  
                  <motion.div 
                    className="flex gap-4 relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7, type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 z-10 border-4 border-white shadow-lg shadow-teal-500/20">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="font-semibold text-base mb-1">1. Doctor Reviews (Pending)</p>
                      <p className="text-sm text-muted-foreground">
                        A registered doctor will review your request within 2 hours (priority reviews within 30 minutes).
                      </p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex gap-4 relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 z-10 border-4 border-white">
                      <Mail className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="font-semibold text-base mb-1">2. SMS Sent (Next)</p>
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll receive an SMS when your document is ready or if we need more information.
                      </p>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="flex gap-4 relative"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 z-10 border-4 border-white">
                      <FileText className="w-5 h-5 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-base mb-1">3. Download PDF (Final)</p>
                      <p className="text-sm text-muted-foreground">
                        Once approved, your medical document will be available for download in your dashboard.
                      </p>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Link href="/dashboard">
              <Button size="lg" className="w-full h-12 min-h-[44px] text-base bg-teal-600 hover:bg-teal-700 text-white font-semibold animate-pulse-cta">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" size="lg" className="w-full h-12 min-h-[44px]">
                Return to Home
              </Button>
            </Link>
          </motion.div>

          {countdown > 0 && (
            <motion.p 
              className="text-sm text-muted-foreground mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              Redirecting to dashboard in <span className="font-semibold text-teal-600">{countdown}</span> seconds...
            </motion.p>
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

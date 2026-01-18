"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2, Lock, Shield } from "lucide-react"

interface PaymentSkeletonProps {
  className?: string
}

/**
 * Beautiful loading skeleton shown while payment is processing
 */
export function PaymentSkeleton({ className }: PaymentSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-6", className)}
    >
      {/* Header with loading spinner */}
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 mx-auto mb-4"
        >
          <div className="w-full h-full rounded-2xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </motion.div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Setting up secure checkout...
        </h2>
        <p className="text-sm text-muted-foreground">
          You&apos;ll be redirected to Stripe in a moment
        </p>
      </div>

      {/* Skeleton order summary */}
      <div className="bg-linear-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 space-y-4">
          {/* Skeleton lines */}
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton button */}
      <div className="space-y-3">
        <div className="h-14 w-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-xl animate-pulse" />
        
        {/* Trust badges */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5" />
          <span>256-bit encryption</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <Shield className="w-3.5 h-3.5" />
          <span>Secure checkout</span>
        </div>
      </div>

      {/* Progress dots animation */}
      <div className="flex justify-center gap-2 pt-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="w-2 h-2 rounded-full bg-emerald-500"
          />
        ))}
      </div>
    </motion.div>
  )
}

/**
 * Full-screen loading overlay for payment redirect
 */
export function PaymentRedirectOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm"
    >
      <div className="text-center px-4">
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6"
        >
          <div className="w-full h-full rounded-2xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <Lock className="w-10 h-10 text-white" />
          </div>
        </motion.div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Redirecting to secure checkout...
        </h2>
        <p className="text-muted-foreground mb-8">
          Please wait while we connect you to Stripe
        </p>
        
        {/* Animated progress bar */}
        <div className="w-64 h-1.5 mx-auto bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1/2 h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-full"
          />
        </div>
        
        <p className="text-xs text-muted-foreground mt-6">
          <Shield className="w-3 h-3 inline mr-1" />
          Your payment is secured by Stripe
        </p>
      </div>
    </motion.div>
  )
}


"use client"

import { useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Home, RefreshCw, MessageCircle } from "lucide-react"
import { createLogger } from "@/lib/observability/logger"
import { fadeIn, slideUp } from "@/components/ui/animations"
const log = createLogger("error")

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error with structured context for observability
    log.error("[GlobalErrorBoundary]", {
      message: error.message,
      name: error.name,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    })
  }, [error])

  return (
    <main className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-amber-50/20 dark:to-amber-950/10" />
      
      {/* Animated gradient orbs */}
      <motion.div 
        className="absolute top-1/3 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="relative z-10 text-center max-w-lg">
        {/* Error Icon */}
        <motion.div 
          className="relative mb-8 inline-block"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="relative">
            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-3xl bg-amber-500/20 blur-xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div className="relative bg-card/80 backdrop-blur-md rounded-3xl p-8 border border-amber-200/50 dark:border-amber-500/20 shadow-2xl">
              <AlertTriangle className="h-14 w-14 text-amber-500" />
            </div>
          </div>
        </motion.div>

        <motion.h1
          className="text-2xl sm:text-3xl font-bold mb-4 text-foreground"
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.2 }}
        >
          Something went wrong
        </motion.h1>
        
        <motion.p
          className="text-muted-foreground mb-2"
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.3 }}
        >
          We hit an unexpected bump. Don&apos;t worry — your data is safe.
        </motion.p>
        
        {error.digest && (
          <motion.p
            className="text-xs text-muted-foreground/60 mb-8 font-mono bg-muted/30 rounded-lg px-3 py-1.5 inline-block"
            initial="initial"
            animate="animate"
            variants={fadeIn}
            transition={{ delay: 0.4 }}
          >
            Error ID: {error.digest}
          </motion.p>
        )}

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          initial="initial"
          animate="animate"
          variants={slideUp}
          transition={{ delay: 0.5 }}
        >
          <Button onClick={reset} className="rounded-xl shadow-lg shadow-primary/25 w-full sm:w-auto min-h-[44px] touch-target">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try Again
          </Button>
          <Button variant="outline" asChild className="rounded-xl w-full sm:w-auto min-h-[44px] touch-target">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              Go Home
            </Link>
          </Button>
        </motion.div>

        {/* Help Link */}
        <motion.div
          className="mt-8"
          initial="initial"
          animate="animate"
          variants={fadeIn}
          transition={{ delay: 0.7 }}
        >
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors px-4 py-2 rounded-lg hover:bg-muted/50"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Still having issues? Contact support
          </Link>
        </motion.div>
      </div>
    </main>
  )
}

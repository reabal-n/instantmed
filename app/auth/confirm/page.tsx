"use client"

import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

export const dynamic = "force-dynamic"

/**
 * Fallback "check your inbox" page.
 * The primary success state lives inline in the sign-in/sign-up forms,
 * but this page catches direct navigation and edge cases.
 */
export default function AuthConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] rounded-2xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5"
        >
          <Mail className="w-8 h-8 text-primary" />
        </motion.div>

        <h1 className="text-xl font-semibold text-foreground mb-2">
          Check your inbox
        </h1>
        <p className="text-muted-foreground mb-6">
          We sent you a sign-in link. Click it to continue - no password needed.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          If you don&apos;t see it, check your spam folder. The link expires in 1 hour.
        </p>

        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </motion.div>
    </div>
  )
}

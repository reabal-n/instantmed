'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Moon, ArrowRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'

const OPEN_HOUR = 8
const CLOSE_HOUR = 22
const DISMISS_KEY = 'after-hours-banner-dismissed-session'

function getAESTHour(): number {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 10 * 3600000).getHours()
}

function isAfterHours(): boolean {
  const hour = getAESTHour()
  return hour < OPEN_HOUR || hour >= CLOSE_HOUR
}

export function AfterHoursMedCertBanner() {
  const [visible, setVisible] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!isAfterHours()) return
    // Dismiss persists for the session only — resets on new tab/window
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return
    setVisible(true)
  }, [])

  const dismiss = () => {
    setVisible(false)
    sessionStorage.setItem(DISMISS_KEY, '1')
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="mx-4 mt-2"
        >
          <div className="relative flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[0.04] dark:bg-primary/[0.06] px-4 py-3 shadow-sm shadow-primary/[0.04]">
            {/* Icon */}
            <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
              <Moon className="w-3.5 h-3.5 text-primary" />
            </div>

            {/* Copy */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">
                It&apos;s late — but med certs are available 24/7.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Auto-approved. In your inbox in minutes.
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/request?service=med-cert"
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              onClick={dismiss}
            >
              Get yours now
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              aria-label="Dismiss banner"
              className="shrink-0 p-1 -mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

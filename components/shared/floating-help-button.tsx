"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { HelpCircle, X } from "@/lib/icons"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

export function FloatingHelpButton({ className }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  // Show after a short delay so it doesn't distract from initial page load
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!isExpanded) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isExpanded])

  if (!isVisible) return null

  return (
    <div className={cn("fixed bottom-6 right-6 z-40", className)}>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-label="Help menu"
            className="absolute bottom-14 right-0 w-56 rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-xl shadow-primary/[0.08] p-4 mb-2"
          >
            <p className="text-sm font-medium text-foreground mb-1">Need help?</p>
            <p className="text-xs text-muted-foreground mb-3">
              We&apos;re here 8am–10pm AEST, 7 days.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/faq"
                className="text-xs font-medium text-primary hover:underline transition-colors"
                onClick={() => setIsExpanded(false)}
              >
                Browse FAQs
              </Link>
              <Link
                href="/contact"
                className="text-xs font-medium text-primary hover:underline transition-colors"
                onClick={() => setIsExpanded(false)}
              >
                Contact support
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-200",
          isExpanded
            ? "bg-muted text-foreground shadow-md"
            : "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
        )}
        aria-label={isExpanded ? "Close help menu" : "Get help"}
      >
        {isExpanded ? (
          <X className="w-5 h-5" />
        ) : (
          <HelpCircle className="w-5 h-5" />
        )}
      </motion.button>
    </div>
  )
}

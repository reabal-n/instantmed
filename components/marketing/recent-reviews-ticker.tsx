"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
import { useReducedMotion } from "@/components/ui/motion"
import {
  formatTickerEntry,
  getTickerEntries,
  type TickerFormat,
} from "@/lib/marketing/review-ticker-data"

interface RecentReviewsTickerProps {
  format: TickerFormat
  artifact: string
  className?: string
  intervalMs?: number
}

export function RecentReviewsTicker({
  format,
  artifact,
  className,
  intervalMs = 4000,
}: RecentReviewsTickerProps) {
  const entries = getTickerEntries()
  const [index, setIndex] = useState(0)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % entries.length), intervalMs)
    return () => clearInterval(id)
  }, [entries.length, intervalMs])

  const current = entries[index]

  return (
    <div
      aria-live="polite"
      className={
        className ?? "flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
      }
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
      <div className="relative h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            className="block leading-5"
            initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {formatTickerEntry(current, format, artifact)}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

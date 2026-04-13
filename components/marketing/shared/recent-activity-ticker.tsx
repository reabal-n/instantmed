"use client"

import { AnimatePresence,motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
import { useEffect, useState } from "react"

import { useReducedMotion } from "@/components/ui/motion"

interface ActivityEntry {
  name?: string
  city: string
  minutesAgo: number
}

interface RecentActivityTickerProps {
  entries: ActivityEntry[]
  /** Template for the message. Use {name}, {city}, {minutesAgo} as placeholders. */
  messageTemplate: string
}

export function RecentActivityTicker({ entries, messageTemplate }: RecentActivityTickerProps) {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % entries.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [entries.length])

  const entry = entries[index]
  const message = messageTemplate
    .replace("{name}", entry.name ?? "")
    .replace("{city}", entry.city)
    .replace("{minutesAgo}", String(entry.minutesAgo))
    .replace(/^\s+/, "")

  return (
    <div
      aria-live="polite"
      className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
      <div className="relative h-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            className="block leading-5"
            initial={prefersReducedMotion ? {} : { y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {message}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}

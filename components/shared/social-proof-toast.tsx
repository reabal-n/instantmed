"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle } from "lucide-react"
import { getRecentApprovals, type SocialProofItem } from "@/app/actions/social-proof"

interface SocialProofToastProps {
  /** Delay before first notification (ms) */
  initialDelay?: number
  /** Interval between notifications (ms) */
  interval?: number
}

export function SocialProofToast({
  initialDelay = 8000,
  interval = 25000,
}: SocialProofToastProps) {
  const [items, setItems] = useState<SocialProofItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Fetch recent approvals on mount
  useEffect(() => {
    getRecentApprovals()
      .then((data) => {
        if (data.length > 0) setItems(data)
      })
      .catch(() => {})
  }, [])

  const showNext = useCallback(() => {
    if (items.length === 0) return
    setIsVisible(true)
    // Auto-hide after 4 seconds
    const hideTimer = setTimeout(() => setIsVisible(false), 4000)
    setCurrentIndex((prev) => (prev + 1) % items.length)
    return () => clearTimeout(hideTimer)
  }, [items])

  useEffect(() => {
    if (items.length === 0) return
    // Initial delay before first notification
    const initialTimer = setTimeout(() => {
      showNext()
      // Then show at regular intervals
      const intervalTimer = setInterval(showNext, interval)
      return () => clearInterval(intervalTimer)
    }, initialDelay)

    return () => clearTimeout(initialTimer)
  }, [items, initialDelay, interval, showNext])

  if (items.length === 0) return null

  const current = items[currentIndex]
  if (!current) return null

  const timeLabel =
    current.minutesAgo < 60
      ? `${current.minutesAgo} min ago`
      : `${Math.round(current.minutesAgo / 60)}h ago`

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-4 left-4 z-40 max-w-xs"
        >
          <div className="bg-card border rounded-xl shadow-lg p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-foreground leading-snug">
                Someone from <span className="font-medium">{current.city}</span> just
                received their {current.service}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {timeLabel}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

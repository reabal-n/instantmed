"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import { X, Star, Clock } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

interface AnnouncementBarProps {
  className?: string
  dismissible?: boolean
  storageKey?: string
}

const OPEN_HOUR = 8
const CLOSE_HOUR = 22

function getAESTTime(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 10 * 3600000)
}

function isWithinHours(): boolean {
  const aest = getAESTTime()
  const hour = aest.getHours()
  return hour >= OPEN_HOUR && hour < CLOSE_HOUR
}

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}

export function AnnouncementBar({
  className,
  dismissible = true,
  storageKey = "instantmed-announcement-dismissed",
}: AnnouncementBarProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [waitTime, setWaitTime] = useState(12)
  const mounted = useHasMounted()
  const prefersReducedMotion = useReducedMotion()

  // Check if dismissed from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && dismissible) {
      const dismissed = localStorage.getItem(storageKey)
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10)
        // Auto-show again after 24 hours
        if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) {
          setIsDismissed(true)
        }
      }
    }
  }, [storageKey, dismissible])

  // Update online status
  useEffect(() => {
    const updateStatus = () => setIsOnline(isWithinHours())
    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  // Simulate wait time fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setWaitTime((prev) => {
        const change = Math.random() > 0.5 ? 1 : -1
        return Math.max(8, Math.min(18, prev + change))
      })
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, Date.now().toString())
    }
  }

  if (!mounted || isDismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative z-60 w-full",
          "bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600",
          "text-white text-sm",
          className
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-x-4 sm:gap-x-6 py-2.5 sm:py-2">
            {/* Live indicator */}
            {isOnline && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="font-medium">Doctors online</span>
              </div>
            )}

            {/* Separator */}
            <span className="hidden sm:inline text-white/40">•</span>

            {/* Wait time */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-white/80" aria-hidden="true" />
              <span>
                Avg wait:{" "}
                <motion.span
                  key={waitTime}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-semibold"
                >
                  {waitTime} mins
                </motion.span>
              </span>
            </div>

            {/* Separator */}
            <span className="text-white/40">•</span>

            {/* Rating */}
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
              <span>
                <span className="font-semibold">4.9</span>
                <span className="hidden sm:inline"> from 2,400+ reviews</span>
              </span>
            </div>

            {/* Dismiss button */}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="absolute right-2 sm:right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

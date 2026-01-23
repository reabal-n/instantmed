"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/providers/supabase-auth-provider"
import { Button } from "@/components/ui/button"
import { Clock, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"

interface SessionTimeoutWarningProps {
  /** Minutes before expiry to show warning (default: 5) */
  warningMinutes?: number
  /** Callback when session is about to expire */
  onExpiring?: () => void
  /** Callback when session is refreshed */
  onRefreshed?: () => void
}

/**
 * Session Timeout Warning
 * 
 * Shows a modal warning when the user's session is about to expire.
 * Allows them to extend the session or save their work.
 * Critical for preventing data loss in long intake forms.
 */
export function SessionTimeoutWarning({
  warningMinutes = 5,
  onExpiring,
  onRefreshed,
}: SessionTimeoutWarningProps) {
  const { session, isSignedIn } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Calculate time until session expires
  const getTimeUntilExpiry = useCallback(() => {
    if (!session?.expires_at) return null
    const expiresAt = session.expires_at * 1000 // Convert to milliseconds
    const now = Date.now()
    return Math.max(0, expiresAt - now)
  }, [session?.expires_at])

  // Check session expiry periodically
  useEffect(() => {
    if (!isSignedIn || !session?.expires_at) return

    const checkExpiry = () => {
      const remaining = getTimeUntilExpiry()
      if (remaining === null) return

      const remainingMinutes = remaining / (1000 * 60)
      setTimeRemaining(remaining)

      // Show warning if within threshold
      if (remainingMinutes <= warningMinutes && remainingMinutes > 0) {
        if (!showWarning) {
          setShowWarning(true)
          onExpiring?.()
        }
      } else if (remainingMinutes > warningMinutes) {
        setShowWarning(false)
      }
    }

    // Check immediately and then every 30 seconds
    checkExpiry()
    const interval = setInterval(checkExpiry, 30000)

    return () => clearInterval(interval)
  }, [isSignedIn, session?.expires_at, warningMinutes, getTimeUntilExpiry, showWarning, onExpiring])

  // Countdown timer when warning is shown
  useEffect(() => {
    if (!showWarning) return

    const interval = setInterval(() => {
      const remaining = getTimeUntilExpiry()
      if (remaining !== null) {
        setTimeRemaining(remaining)
        if (remaining <= 0) {
          // Session expired - will be handled by auth state change
          setShowWarning(false)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [showWarning, getTimeUntilExpiry])

  const handleExtendSession = async () => {
    setIsRefreshing(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.refreshSession()
      
      if (!error) {
        setShowWarning(false)
        onRefreshed?.()
      }
    } catch {
      // Silent fail - user will see login screen if session truly expired
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  if (!showWarning || !timeRemaining) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        role="alertdialog"
        aria-labelledby="session-warning-title"
        aria-describedby="session-warning-description"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          {/* Title */}
          <h2 
            id="session-warning-title"
            className="text-xl font-semibold text-center mb-2"
          >
            Session expiring soon
          </h2>

          {/* Description */}
          <p 
            id="session-warning-description"
            className="text-muted-foreground text-center mb-4"
          >
            Your session will expire in{" "}
            <span className="font-mono font-medium text-foreground">
              {formatTimeRemaining(timeRemaining)}
            </span>
            . Extend now to avoid losing any unsaved progress.
          </p>

          {/* Time indicator */}
          <div className="mb-6">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-500"
                initial={{ width: "100%" }}
                animate={{ 
                  width: `${Math.min(100, (timeRemaining / (warningMinutes * 60000)) * 100)}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleExtendSession}
              disabled={isRefreshing}
              className="w-full rounded-xl"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Extend session
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Your form data is auto-saved locally
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

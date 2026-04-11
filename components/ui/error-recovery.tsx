"use client"

import { useState, useEffect } from "react"
import { Check, WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Network status indicator
 *
 * Renders a top-of-page banner when the user goes offline, and a brief
 * "back online" confirmation when connectivity returns. Mounted globally
 * from app/layout.tsx.
 *
 * Note: this file used to also export ErrorBanner, FieldError,
 * RetryableAction, and detectErrorType - those were never imported by
 * any live consumer and were removed in 2026-04-08 cleanup. If you need
 * an inline error UI, use the alert components in components/ui/alert.tsx
 * or compose your own with the design tokens.
 */
export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Show "back online" briefly
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial check - using callback to avoid lint warning
    const checkOnline = () => {
      setIsOnline(navigator.onLine)
      if (!navigator.onLine) setShowBanner(true)
    }
    checkOnline()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-medium",
        "transition-[opacity,transform] duration-300 motion-reduce:transition-none",
        showBanner ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none",
        isOnline ? "bg-green-500 text-white" : "bg-red-500 text-white"
      )}
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          You&apos;re back online
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          No internet connection - your changes will be saved when you reconnect
        </span>
      )}
    </div>
  )
}

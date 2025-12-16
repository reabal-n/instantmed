"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface LiveRegionProps {
  /** The announcement to make */
  message: string
  /** Politeness level: polite waits for idle, assertive interrupts */
  politeness?: "polite" | "assertive"
  /** Whether to clear the message after announcement */
  clearAfter?: number
  className?: string
}

/**
 * Live Region Component
 * 
 * Announces dynamic content changes to screen readers.
 * Use for form errors, loading states, notifications, etc.
 */
export function LiveRegion({ 
  message, 
  politeness = "polite",
  clearAfter,
  className 
}: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState(message)
  
  useEffect(() => {
    setAnnouncement(message)
    
    if (clearAfter && message) {
      const timer = setTimeout(() => setAnnouncement(""), clearAfter)
      return () => clearTimeout(timer)
    }
  }, [message, clearAfter])
  
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={cn("sr-only", className)}
    >
      {announcement}
    </div>
  )
}

/**
 * Assertive Live Region
 * 
 * For urgent announcements that should interrupt the user.
 */
export function AlertRegion({ 
  message, 
  className 
}: Omit<LiveRegionProps, "politeness">) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn("sr-only", className)}
    >
      {message}
    </div>
  )
}

/**
 * Hook for programmatic announcements
 */
export function useAnnounce() {
  const [message, setMessage] = useState("")
  
  const announce = (text: string, duration = 1000) => {
    setMessage(text)
    setTimeout(() => setMessage(""), duration)
  }
  
  return { message, announce }
}

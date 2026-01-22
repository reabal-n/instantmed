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
    if (!message) return
    
    if (clearAfter) {
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
 * 
 * Usage:
 * ```tsx
 * const { message, announce, announcePolite, announceAssertive, LiveRegionPortal } = useAnnounce()
 * 
 * // Announce a message
 * announce('Form saved successfully')
 * 
 * // Urgent announcement
 * announceAssertive('Error: Please fix the form')
 * 
 * // Render the portal
 * return <><LiveRegionPortal />{children}</>
 * ```
 */
export function useAnnounce() {
  const [message, setMessage] = useState("")
  const [politeness, setPoliteness] = useState<"polite" | "assertive">("polite")
  
  const announce = (text: string, duration = 1000) => {
    setPoliteness("polite")
    setMessage(text)
    setTimeout(() => setMessage(""), duration)
  }
  
  const announcePolite = (text: string, duration = 1000) => {
    setPoliteness("polite")
    setMessage(text)
    setTimeout(() => setMessage(""), duration)
  }
  
  const announceAssertive = (text: string, duration = 1500) => {
    setPoliteness("assertive")
    setMessage(text)
    setTimeout(() => setMessage(""), duration)
  }
  
  const LiveRegionPortal = () => (
    <div
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
  
  return { message, announce, announcePolite, announceAssertive, LiveRegionPortal }
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface LiveRegionProps {
  /** Announcement message */
  announcement?: string
  /** Priority level */
  priority?: "polite" | "assertive"
  /** Custom className */
  className?: string
}

/**
 * LiveRegion - Screen reader announcements
 * 
 * Announces dynamic content changes to screen readers
 * Use for form validation, success messages, errors, etc.
 */
export function LiveRegion({
  announcement,
  priority = "polite",
  className,
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (announcement && regionRef.current) {
      // Clear previous announcement
      regionRef.current.textContent = ""
      // Small delay to ensure screen reader picks it up
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = announcement
        }
      }, 100)
    }
  }, [announcement])

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={cn("sr-only", className)}
    />
  )
}

/**
 * Announcement Hook
 * 
 * Use this hook to announce messages to screen readers
 */
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState<string | undefined>()
  const [priority, setPriority] = useState<"polite" | "assertive">("polite")

  const announce = useCallback((message: string, messagePriority: "polite" | "assertive" = "polite") => {
    setAnnouncement(message)
    setPriority(messagePriority)
    // Clear after announcement
    setTimeout(() => setAnnouncement(undefined), 1000)
  }, [])

  return {
    announcement,
    announce,
    LiveRegion: () => <LiveRegion announcement={announcement} priority={priority} />,
  }
}

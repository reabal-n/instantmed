"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ScrollProgressProps {
  /** Color of the progress bar */
  color?: string
  /** Height in pixels */
  height?: number
  className?: string
}

/**
 * Thin scroll progress bar at the top of the page.
 * Shows read progress on long pages (blog, marketing, FAQ).
 * Respects reduced motion — still shows but without spring animation.
 */
export function ScrollProgress({
  color,
  height = 2,
  className,
}: ScrollProgressProps) {
  const [progress, setProgress] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      setProgress(Math.min(1, scrollTop / docHeight))
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Initial
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Don't render if page is too short to scroll
  if (progress === 0 && typeof window !== "undefined" && document.documentElement.scrollHeight <= window.innerHeight) {
    return null
  }

  return (
    <div
      className={cn("fixed top-0 left-0 right-0 z-50", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page scroll progress"
    >
      <motion.div
        className="h-full origin-left"
        style={{
          backgroundColor: color || "var(--color-primary)",
          scaleX: progress,
        }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  )
}

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Skip to main content link for keyboard navigation
 * Already exists in skip-to-content.tsx, this adds more utilities
 */

interface VisuallyHiddenProps {
  children: React.ReactNode
  className?: string
}

/**
 * Visually hide content while keeping it accessible to screen readers
 */
export function VisuallyHidden({ children, className }: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        className
      )}
    >
      {children}
    </span>
  )
}

/**
 * Announce content to screen readers
 */
export function LiveRegion({
  children,
  mode = "polite",
  className,
}: {
  children: React.ReactNode
  mode?: "polite" | "assertive"
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live={mode}
      aria-atomic="true"
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, isActive: boolean = true) {
  React.useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown)
    firstElement?.focus()

    return () => {
      container.removeEventListener("keydown", handleKeyDown)
    }
  }, [containerRef, isActive])
}

/**
 * Keyboard navigation hook
 */
export function useKeyboardNavigation(
  items: HTMLElement[],
  options: {
    orientation?: "horizontal" | "vertical" | "both"
    loop?: boolean
    onSelect?: (index: number) => void
  } = {}
) {
  const { orientation = "vertical", loop = true, onSelect } = options
  const [focusedIndex, setFocusedIndex] = React.useState(0)

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      const { key } = e
      let newIndex = focusedIndex

      const isVertical = orientation === "vertical" || orientation === "both"
      const isHorizontal = orientation === "horizontal" || orientation === "both"

      if ((key === "ArrowDown" && isVertical) || (key === "ArrowRight" && isHorizontal)) {
        e.preventDefault()
        newIndex = focusedIndex + 1
        if (newIndex >= items.length) {
          newIndex = loop ? 0 : items.length - 1
        }
      } else if ((key === "ArrowUp" && isVertical) || (key === "ArrowLeft" && isHorizontal)) {
        e.preventDefault()
        newIndex = focusedIndex - 1
        if (newIndex < 0) {
          newIndex = loop ? items.length - 1 : 0
        }
      } else if (key === "Home") {
        e.preventDefault()
        newIndex = 0
      } else if (key === "End") {
        e.preventDefault()
        newIndex = items.length - 1
      } else if (key === "Enter" || key === " ") {
        e.preventDefault()
        onSelect?.(focusedIndex)
        return
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex)
        items[newIndex]?.focus()
      }
    },
    [focusedIndex, items, orientation, loop, onSelect]
  )

  return { focusedIndex, setFocusedIndex, handleKeyDown }
}

/**
 * Reduced motion hook
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersReducedMotion
}

/**
 * Announce to screen reader
 */
export function useAnnounce() {
  const [message, setMessage] = React.useState("")

  const announce = React.useCallback((text: string, mode: "polite" | "assertive" = "polite") => {
    // Clear first to ensure re-announcement of same message
    setMessage("")
    setTimeout(() => setMessage(text), 100)
  }, [])

  const Announcer = React.useCallback(() => {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    )
  }, [message])

  return { announce, Announcer }
}

/**
 * Focus management for forms
 */
export function useFocusOnError(errors: Record<string, unknown>) {
  React.useEffect(() => {
    const errorKeys = Object.keys(errors).filter((key) => errors[key])
    if (errorKeys.length > 0) {
      const firstErrorField = document.querySelector<HTMLElement>(
        `[name="${errorKeys[0]}"], #${errorKeys[0]}`
      )
      firstErrorField?.focus()
    }
  }, [errors])
}

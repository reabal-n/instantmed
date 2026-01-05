"use client"

import { useEffect, useRef } from "react"

interface FocusTrapProps {
  /** Whether trap is active */
  active: boolean
  /** Children to trap focus within */
  children: React.ReactNode
  /** Callback when escape is pressed */
  onEscape?: () => void
}

/**
 * FocusTrap - Traps focus within a container
 * 
 * Used for modals, dialogs, and other overlays
 * Ensures keyboard navigation stays within the component
 */
export function FocusTrap({ active, children, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    // Store the previously focused element
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ')

      return Array.from(containerRef.current!.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => {
          // Filter out hidden elements
          return !el.hasAttribute('hidden') && el.offsetParent !== null
        }
      )
    }

    const focusableElements = getFocusableElements()

    if (focusableElements.length === 0) return

    // Focus the first element
    focusableElements[0]?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onEscape) {
        onEscape()
        return
      }

      if (e.key !== "Tab") return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      // Restore focus to previously focused element
      previousActiveElementRef.current?.focus()
    }
  }, [active, onEscape])

  return <div ref={containerRef}>{children}</div>
}


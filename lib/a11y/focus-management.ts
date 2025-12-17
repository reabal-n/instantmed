"use client"

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"

/**
 * Accessibility utilities for focus management and keyboard navigation
 */

// =============================================================================
// FOCUS TRAP
// =============================================================================

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
}

/**
 * Hook to trap focus within a container (for modals, dialogs, etc.)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current
    const focusableElements = getFocusableElements(container)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus the first element
    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

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

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the previously focused element
      previousActiveElement.current?.focus()
    }
  }, [isActive])

  return containerRef
}

// =============================================================================
// KEYBOARD NAVIGATION
// =============================================================================

type Direction = 'up' | 'down' | 'left' | 'right'

interface UseArrowNavigationOptions {
  onSelect?: (index: number) => void
  loop?: boolean
  orientation?: 'horizontal' | 'vertical' | 'both'
}

/**
 * Hook for arrow key navigation in lists/grids
 */
export function useArrowNavigation(
  itemCount: number,
  options: UseArrowNavigationOptions = {}
) {
  const { onSelect, loop = true, orientation = 'vertical' } = options
  const currentIndex = useRef(0)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const keyDirections: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }

      const direction = keyDirections[e.key]
      if (!direction) return

      // Check if direction is valid for orientation
      const isVertical = direction === 'up' || direction === 'down'
      const isHorizontal = direction === 'left' || direction === 'right'

      if (orientation === 'vertical' && isHorizontal) return
      if (orientation === 'horizontal' && isVertical) return

      e.preventDefault()

      let newIndex = currentIndex.current
      const isIncrement = direction === 'down' || direction === 'right'

      if (isIncrement) {
        newIndex = loop
          ? (currentIndex.current + 1) % itemCount
          : Math.min(currentIndex.current + 1, itemCount - 1)
      } else {
        newIndex = loop
          ? (currentIndex.current - 1 + itemCount) % itemCount
          : Math.max(currentIndex.current - 1, 0)
      }

      currentIndex.current = newIndex
      onSelect?.(newIndex)
    },
    [itemCount, loop, orientation, onSelect]
  )

  const setCurrentIndex = useCallback((index: number) => {
    currentIndex.current = index
  }, [])

  return { handleKeyDown, setCurrentIndex, currentIndex }
}

// =============================================================================
// ANNOUNCEMENTS (Screen Readers)
// =============================================================================

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('role', 'status')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement is read
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  return announce
}

// =============================================================================
// REDUCED MOTION
// =============================================================================

/**
 * Hook to check if user prefers reduced motion
 * Uses useSyncExternalStore for proper React 18 concurrent mode support
 */
export function usePrefersReducedMotion(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    mediaQuery.addEventListener('change', callback)
    return () => mediaQuery.removeEventListener('change', callback)
  }, [])

  const getSnapshot = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// =============================================================================
// ARIA HELPERS
// =============================================================================

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}`
}

/**
 * Props for connecting label to input
 */
export function getAriaLabelProps(id: string) {
  return {
    labelProps: { htmlFor: id },
    inputProps: { id, 'aria-labelledby': `${id}-label` },
  }
}

/**
 * Props for describing an element with error/help text
 */
export function getAriaDescribedByProps(
  id: string,
  options: { hasError?: boolean; hasHelp?: boolean } = {}
) {
  const describedBy: string[] = []
  if (options.hasError) describedBy.push(`${id}-error`)
  if (options.hasHelp) describedBy.push(`${id}-help`)

  return {
    'aria-describedby': describedBy.length > 0 ? describedBy.join(' ') : undefined,
    'aria-invalid': options.hasError || undefined,
  }
}

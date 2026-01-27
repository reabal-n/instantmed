/**
 * Accessibility Utilities
 * 
 * Helpers for WCAG 2.1 AA compliance.
 */

/**
 * Check if color contrast meets WCAG AA requirements
 * 
 * @param foreground - Hex color (e.g., "#000000")
 * @param background - Hex color (e.g., "#FFFFFF")
 * @param isLargeText - Large text has lower contrast requirements
 * @returns Whether contrast ratio meets AA standard
 */
export function meetsContrastAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Get relative luminance of a color
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const srgb = c / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * Generate aria-label for status badges
 */
export function getStatusAriaLabel(
  status: string,
  context?: string
): string {
  const labels: Record<string, string> = {
    pending: "Pending review",
    approved: "Approved",
    declined: "Declined",
    completed: "Completed",
    processing: "Processing",
    failed: "Failed",
  }
  const label = labels[status.toLowerCase()] || status
  return context ? `${context}: ${label}` : label
}

/**
 * Announce message to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
): void {
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", priority)
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = "sr-only"
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Focus trap utility for modals
 */
export function createFocusTrap(container: HTMLElement): {
  activate: () => void
  deactivate: () => void
} {
  const focusableSelectors = [
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "a[href]",
    "[tabindex]:not([tabindex='-1'])",
  ].join(", ")

  let previousActiveElement: Element | null = null

  const getFocusableElements = () =>
    Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return

    const focusable = getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return {
    activate: () => {
      previousActiveElement = document.activeElement
      container.addEventListener("keydown", handleKeyDown)
      const focusable = getFocusableElements()
      if (focusable.length > 0) {
        focusable[0].focus()
      }
    },
    deactivate: () => {
      container.removeEventListener("keydown", handleKeyDown)
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus()
      }
    },
  }
}

/**
 * Skip to main content link
 */
export const SKIP_LINK_ID = "main-content"

/**
 * Reduced motion preference check
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * High contrast mode check
 */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-contrast: more)").matches
}

/**
 * Generate descriptive loading state
 */
export function getLoadingAriaLabel(
  action: string,
  itemCount?: number
): string {
  if (itemCount !== undefined) {
    return `Loading ${itemCount} ${action}${itemCount !== 1 ? "s" : ""}`
  }
  return `Loading ${action}`
}

/**
 * ARIA live region manager
 */
class AriaLiveRegion {
  private polite: HTMLElement | null = null
  private assertive: HTMLElement | null = null

  init() {
    if (typeof document === "undefined") return

    if (!this.polite) {
      this.polite = document.createElement("div")
      this.polite.setAttribute("role", "status")
      this.polite.setAttribute("aria-live", "polite")
      this.polite.className = "sr-only"
      document.body.appendChild(this.polite)
    }

    if (!this.assertive) {
      this.assertive = document.createElement("div")
      this.assertive.setAttribute("role", "alert")
      this.assertive.setAttribute("aria-live", "assertive")
      this.assertive.className = "sr-only"
      document.body.appendChild(this.assertive)
    }
  }

  announce(message: string, priority: "polite" | "assertive" = "polite") {
    this.init()
    const region = priority === "assertive" ? this.assertive : this.polite
    if (region) {
      region.textContent = ""
      // Small delay to ensure screen reader picks up change
      setTimeout(() => {
        region.textContent = message
      }, 50)
    }
  }
}

export const ariaLive = new AriaLiveRegion()

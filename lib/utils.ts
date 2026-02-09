import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validate redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with / and blocks protocol-relative URLs.
 */
export function isValidRedirect(url: string | null | undefined): boolean {
  if (!url) return false
  // Must start with / and not contain // (prevents protocol-relative URLs)
  if (!url.startsWith('/') || url.startsWith('//')) {
    return false
  }
  // Block any URL that could be interpreted as absolute
  if (url.includes('://') || url.includes('\\')) {
    return false
  }
  return true
}

/**
 * Standard disabled state classes for consistent UX
 * Use with cn(): cn(disabledStyles, disabled && "pointer-events-none")
 */
export const disabledStyles = "opacity-50 cursor-not-allowed" as const

/**
 * Interactive element base styles
 * Combines common patterns for buttons, cards, and interactive elements
 */
export const interactiveStyles = {
  base: "transition-all duration-200",
  hover: "hover:scale-[1.02] hover:shadow-md",
  active: "active:scale-[0.98]",
  focus: "focus:outline-none focus:ring-2 focus:ring-primary/20",
  disabled: disabledStyles,
} as const

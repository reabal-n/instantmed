import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

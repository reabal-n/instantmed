"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface VisuallyHiddenProps {
  children: React.ReactNode
  as?: React.ElementType
  className?: string
}

/**
 * Visually Hidden Component
 * 
 * Hides content visually but keeps it accessible to screen readers.
 * Use for accessible labels, descriptions, and announcements.
 */
export function VisuallyHidden({ 
  children, 
  as: Component = "span",
  className 
}: VisuallyHiddenProps) {
  return (
    <Component className={cn("sr-only", className)}>
      {children}
    </Component>
  )
}

/**
 * Focus-visible variant
 * 
 * Hidden until focused (useful for skip links, etc.)
 */
export function VisuallyHiddenUntilFocused({ 
  children, 
  as: Component = "span",
  className 
}: VisuallyHiddenProps) {
  return (
    <Component className={cn("sr-only focus:not-sr-only", className)}>
      {children}
    </Component>
  )
}

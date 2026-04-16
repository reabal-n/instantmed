"use client"

import { cn } from "@/lib/utils"

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  /** @deprecated magnetic pull effect removed for bundle performance */
  strength?: number
}

/**
 * Wraps children with an inline-block container.
 * Previously had a framer-motion magnetic pull effect — removed to cut
 * the initial JS bundle. Use CSS hover transforms on the child instead.
 */
export function MagneticButton({ children, className }: MagneticButtonProps) {
  return (
    <div className={cn("inline-block", className)}>
      {children}
    </div>
  )
}

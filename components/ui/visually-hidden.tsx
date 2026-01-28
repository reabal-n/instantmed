import { cn } from "@/lib/utils"

interface VisuallyHiddenProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

/**
 * Visually Hidden Component
 * 
 * Hides content from sighted users while keeping it accessible.
 * Preferred for form labels and ARIA descriptions.
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

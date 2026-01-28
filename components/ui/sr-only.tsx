import { cn } from "@/lib/utils"

interface SrOnlyProps {
  children: React.ReactNode
  className?: string
  /** Become visible when focused (for skip links) */
  focusable?: boolean
}

/**
 * Screen Reader Only Component
 * 
 * Hides content visually but keeps it accessible to screen readers.
 * Use for skip links, form labels, or additional context.
 */
export function SrOnly({ children, className, focusable }: SrOnlyProps) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        focusable && "focus:relative focus:w-auto focus:h-auto focus:m-0 focus:overflow-visible focus:[clip:auto] focus:p-2 focus:bg-background focus:text-foreground focus:z-50",
        className
      )}
    >
      {children}
    </span>
  )
}

/**
 * Skip to main content link
 * 
 * Place at the very top of the page for keyboard navigation.
 */
export function SkipToMain({ 
  href = "#main-content",
  children = "Skip to main content" 
}: { 
  href?: string
  children?: React.ReactNode 
}) {
  return (
    <a
      href={href}
      className={cn(
        "absolute left-4 top-4 z-9999",
        "bg-primary text-primary-foreground",
        "px-4 py-2 rounded-md font-medium",
        "transform -translate-y-[200%] transition-transform",
        "focus:translate-y-0",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
    >
      {children}
    </a>
  )
}

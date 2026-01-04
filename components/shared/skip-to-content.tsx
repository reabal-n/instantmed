"use client"

import { cn } from "@/lib/utils"

interface SkipToContentProps {
  /** Target element ID to skip to */
  targetId?: string
  /** Custom label for the skip link */
  label?: string
  className?: string
}

export function SkipToContent({ 
  targetId = "main-content", 
  label = "Skip to main content",
  className,
}: SkipToContentProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Hidden by default
        "sr-only",
        // Show on focus with modern styling
        "focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]",
        "focus:px-6 focus:py-3",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-xl focus:font-semibold focus:text-sm",
        "focus:shadow-2xl focus:shadow-primary/25",
        "focus:outline-none focus:ring-4 focus:ring-primary/30",
        "focus:animate-in focus:fade-in focus:slide-in-from-top-2",
        "transition-all duration-200",
        className
      )}
    >
      {label}
    </a>
  )
}

/**
 * Enhanced skip navigation with multiple targets
 */
export function SkipNavigation() {
  return (
    <nav 
      className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-4 focus-within:left-4 focus-within:z-[100] focus-within:flex focus-within:flex-col focus-within:gap-2 focus-within:p-4 focus-within:bg-background/95 focus-within:backdrop-blur-lg focus-within:rounded-xl focus-within:border focus-within:shadow-2xl"
      aria-label="Skip navigation"
    >
      <span className="text-xs font-medium text-muted-foreground mb-1">Skip to:</span>
      <a
        href="#main-content"
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        Main content
      </a>
      <a
        href="#navigation"
        className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        Navigation
      </a>
      <a
        href="#footer"
        className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        Footer
      </a>
    </nav>
  )
}

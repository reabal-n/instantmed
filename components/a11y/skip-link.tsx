"use client"

import { cn } from "@/lib/utils"

interface SkipLinkProps {
  href?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Skip to Content Link
 * 
 * Accessibility feature that allows keyboard users to skip
 * navigation and jump directly to main content.
 */
export function SkipLink({ 
  href = "#main-content", 
  className,
  children = "Skip to main content"
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only",
        "fixed top-4 left-4 z-100",
        "px-4 py-2 rounded-lg",
        "bg-primary text-primary-foreground",
        "font-medium text-sm",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "transition-transform",
        "-translate-y-16 focus:translate-y-0",
        className
      )}
    >
      {children}
    </a>
  )
}

/**
 * Main Content Wrapper
 * 
 * Use this to wrap your main content and provide the target
 * for the skip link.
 */
export function MainContent({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <main 
      id="main-content" 
      className={className}
      tabIndex={-1}
      role="main"
    >
      {children}
    </main>
  )
}

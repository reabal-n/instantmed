"use client"

import { type MouseEvent as ReactMouseEvent, useEffect, useState } from "react"

import { cn } from "@/lib/utils"

function activateSkipTarget(
  event: ReactMouseEvent<HTMLAnchorElement>,
  targetId: string,
) {
  event.preventDefault()

  const fallbackTarget = document.getElementById(targetId)
  if (!fallbackTarget) return

  const target = fallbackTarget.querySelector<HTMLElement>("main") ?? fallbackTarget
  const hadTabIndex = target.hasAttribute("tabindex")
  if (!hadTabIndex) target.setAttribute("tabindex", "-1")

  window.history.replaceState(window.history.state, "", `#${targetId}`)
  target.focus({ preventScroll: true })
  target.scrollIntoView({ block: "start", behavior: "auto" })

  if (!hadTabIndex) {
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true })
  }
}

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
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => setIsHydrated(true), [])

  return (
    <a
      href={`#${targetId}`}
      onClick={(event) => activateSkipTarget(event, targetId)}
      data-skip-link-hydrated={isHydrated ? "true" : "false"}
      className={cn(
        // Hidden by default
        "sr-only",
        // Show on focus with modern styling
        "focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100]",
        "focus:px-6 focus:py-3",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-xl focus:font-semibold focus:text-sm",
        "focus:shadow-2xl focus:shadow-primary/25",
        "focus:outline-none focus:ring-4 focus:ring-primary",
        "focus:animate-in focus:fade-in focus:slide-in-from-top-2",
        "transition-[transform,opacity] duration-200",
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
        onClick={(event) => activateSkipTarget(event, "main-content")}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Main content
      </a>
      <a
        href="#navigation"
        className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Navigation
      </a>
      <a
        href="#footer"
        className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium text-sm hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Footer
      </a>
    </nav>
  )
}

"use client"

import { cn } from "@/lib/utils"

interface MobileMenuToggleProps {
  toggle: () => void
  isOpen: boolean
  isPending?: boolean
  onIntent?: () => void
}

/**
 * The always-visible mobile menu control stays deliberately dependency-light.
 * The drawer itself is loaded only after hover, focus, or activation.
 */
export function MobileMenuToggle({
  toggle,
  isOpen,
  isPending = false,
  onIntent,
}: MobileMenuToggleProps) {
  return (
    <button
      type="button"
      onClick={toggle}
      onPointerEnter={onIntent}
      onFocus={onIntent}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      className={cn(
        "relative z-50 flex h-12 w-12 items-center justify-center rounded-xl",
        "bg-transparent hover:bg-card/50 dark:hover:bg-white/10",
        "transition-colors duration-200 motion-reduce:transition-none",
        "outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
      aria-label={isPending ? "Loading menu" : isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      aria-controls="mobile-navigation-menu"
      aria-busy={isPending || undefined}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 23 23"
        className="pointer-events-none"
        aria-hidden="true"
      >
        <path
          d={isOpen ? "M 3 16.5 L 17 2.5" : "M 2 2.5 L 20 2.5"}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M 2 9.423 L 20 9.423"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={cn(
            "transition-opacity duration-150 motion-reduce:transition-none",
            isOpen ? "opacity-0" : "opacity-100",
          )}
        />
        <path
          d={isOpen ? "M 3 2.5 L 17 16.346" : "M 2 16.346 L 20 16.346"}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}

"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PaginationProps {
  /** Total number of pages */
  total: number
  /** Current page (1-indexed) */
  page: number
  /** Page change handler */
  onChange?: (page: number) => void
  /** Show previous/next controls */
  showControls?: boolean
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Additional class name */
  className?: string
  /** Compact mode */
  isCompact?: boolean
  /** Show shadow effect */
  showShadow?: boolean
  /** Color variant (ignored, kept for API compat) */
  color?: string
}

/**
 * Pagination - Simple page navigation component
 *
 * Drop-in replacement for the HeroUI Pagination component.
 * Renders Previous/Next buttons with page number buttons.
 */
export function Pagination({
  total,
  page,
  onChange,
  showControls = false,
  size = "md",
  className,
}: PaginationProps) {
  if (total <= 1) return null

  const sizeClasses = {
    sm: "h-7 min-w-7 text-xs",
    md: "h-8 min-w-8 text-sm",
    lg: "h-10 min-w-10 text-base",
  }

  const btnBase = cn(
    "inline-flex items-center justify-center rounded-md transition-colors",
    "border border-border hover:bg-accent hover:text-accent-foreground",
    "disabled:opacity-50 disabled:pointer-events-none",
    sizeClasses[size]
  )

  const btnActive = cn(
    "inline-flex items-center justify-center rounded-md transition-colors",
    "bg-primary text-primary-foreground",
    sizeClasses[size]
  )

  // Build visible page numbers with ellipsis
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }

    const pages: (number | "ellipsis")[] = [1]

    if (page > 3) {
      pages.push("ellipsis")
    }

    const start = Math.max(2, page - 1)
    const end = Math.min(total - 1, page + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (page < total - 2) {
      pages.push("ellipsis")
    }

    pages.push(total)
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label="Pagination">
      {showControls && (
        <button
          type="button"
          className={cn(btnBase, "px-1.5")}
          onClick={() => onChange?.(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {pageNumbers.map((p, idx) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${idx}`}
            className={cn("inline-flex items-center justify-center text-muted-foreground", sizeClasses[size])}
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={p === page ? btnActive : btnBase}
            onClick={() => onChange?.(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      {showControls && (
        <button
          type="button"
          className={cn(btnBase, "px-1.5")}
          onClick={() => onChange?.(page + 1)}
          disabled={page >= total}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </nav>
  )
}

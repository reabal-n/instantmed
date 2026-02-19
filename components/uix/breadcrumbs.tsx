"use client"

import * as React from "react"
import { ChevronRight, Home, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface BreadcrumbLink {
  /** Display label */
  label: string
  /** URL to navigate to (omit for current page) */
  href?: string
  /** Icon to display */
  icon?: React.ReactNode
}

export interface PageBreadcrumbsProps {
  /** Array of breadcrumb links */
  links: BreadcrumbLink[]
  /** Show home icon as first item */
  showHome?: boolean
  /** Home URL */
  homeHref?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Additional class name */
  className?: string
  /** Separator icon */
  separator?: React.ReactNode
  /** Max items before collapsing */
  maxItems?: number
}

/**
 * PageBreadcrumbs - Pure Tailwind breadcrumbs with Next.js Link
 *
 * Navigation breadcrumbs with optional home icon and collapsing.
 *
 * @example
 * ```tsx
 * <PageBreadcrumbs
 *   links={[
 *     { label: "Admin", href: "/admin" },
 *     { label: "Settings", href: "/admin/settings" },
 *     { label: "Feature Flags" },
 *   ]}
 *   showHome
 * />
 * ```
 */
export function PageBreadcrumbs({
  links,
  showHome = false,
  homeHref = "/",
  size = "md",
  className,
  separator = <ChevronRight className="h-3 w-3" />,
  maxItems,
}: PageBreadcrumbsProps) {
  // Build full links array with optional home
  const allLinks = React.useMemo(() => {
    const result: BreadcrumbLink[] = []

    if (showHome) {
      result.push({
        label: "Home",
        href: homeHref,
        icon: <Home className="h-4 w-4" />,
      })
    }

    result.push(...links)
    return result
  }, [links, showHome, homeHref])

  // Collapse logic: show first itemsBeforeCollapse, ellipsis, then last itemsAfterCollapse
  const [collapsed, setCollapsed] = React.useState(true)

  const displayLinks = React.useMemo(() => {
    if (!maxItems || allLinks.length <= maxItems || !collapsed) {
      return allLinks
    }

    const itemsBeforeCollapse = 1
    const itemsAfterCollapse = 2
    const before = allLinks.slice(0, itemsBeforeCollapse)
    const after = allLinks.slice(allLinks.length - itemsAfterCollapse)

    return [...before, { label: "__ellipsis__" } as BreadcrumbLink, ...after]
  }, [allLinks, maxItems, collapsed])

  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  }

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className={cn("flex flex-wrap items-center", sizeClasses[size])}>
        {displayLinks.map((link, index) => {
          const isLast = index === displayLinks.length - 1
          const isEllipsis = link.label === "__ellipsis__"

          return (
            <li key={link.href || link.label + index} className="flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-muted-foreground" aria-hidden="true">
                  {separator}
                </span>
              )}

              {isEllipsis ? (
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors px-1"
                  aria-label="Show more breadcrumbs"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              ) : link.href && !isLast ? (
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    isLast ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

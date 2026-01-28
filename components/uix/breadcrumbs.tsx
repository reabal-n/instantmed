"use client"

import * as React from "react"
import { Breadcrumbs, BreadcrumbItem } from "@heroui/react"
import { ChevronRight, Home } from "lucide-react"
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
 * PageBreadcrumbs - HeroUI Breadcrumbs wrapper
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

  return (
    <Breadcrumbs
      size={size}
      separator={separator}
      maxItems={maxItems}
      itemsBeforeCollapse={1}
      itemsAfterCollapse={2}
      classNames={{
        list: cn("flex-wrap", className),
      }}
    >
      {allLinks.map((link, index) => {
        const isLast = index === allLinks.length - 1
        
        return (
          <BreadcrumbItem
            key={link.href || link.label}
            isCurrent={isLast}
            startContent={link.icon}
          >
            {link.href && !isLast ? (
              <Link
                href={link.href}
                className="text-default-500 hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground font-medium" : ""}>
                {link.label}
              </span>
            )}
          </BreadcrumbItem>
        )
      })}
    </Breadcrumbs>
  )
}

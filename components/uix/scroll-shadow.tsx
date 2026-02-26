"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * ScrollShadow - Simple scrollable container wrapper
 *
 * Simple scrollable container with overflow handling.
 * Renders a div with overflow-auto and optional className.
 */
export function ScrollShadow({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-auto", className)} {...props}>
      {children}
    </div>
  )
}

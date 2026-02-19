"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SnippetProps extends React.HTMLAttributes<HTMLElement> {
  /** Prefix symbol (e.g. "$") */
  symbol?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Visual variant (ignored, kept for API compat) */
  variant?: string
  children?: React.ReactNode
}

/**
 * Snippet - Simple code/text display component
 *
 * Drop-in replacement for HeroUI Snippet.
 * Renders an inline code element with optional prefix symbol.
 */
export function Snippet({
  children,
  symbol,
  size = "md",
  variant: _variant,
  className,
  ...props
}: SnippetProps) {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-2 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  }

  return (
    <code
      className={cn(
        "inline-flex items-center gap-1 rounded bg-muted font-mono",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {symbol && <span className="text-muted-foreground select-none">{symbol}</span>}
      {children}
    </code>
  )
}

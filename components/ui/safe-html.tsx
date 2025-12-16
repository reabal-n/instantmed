"use client"

import { useMemo } from "react"
import { sanitizeHtml } from "@/lib/utils/sanitize-html"
import { cn } from "@/lib/utils"

interface SafeHtmlProps {
  html: string
  className?: string
  as?: keyof JSX.IntrinsicElements
}

/**
 * SafeHtml Component
 * 
 * Renders HTML content safely by sanitizing it first.
 * Use this instead of dangerouslySetInnerHTML.
 * 
 * @example
 * <SafeHtml html={blogPost.content} className="prose" />
 */
export function SafeHtml({ html, className, as: Component = "div" }: SafeHtmlProps) {
  const sanitized = useMemo(() => sanitizeHtml(html), [html])
  
  return (
    <Component
      className={cn("safe-html-content", className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}

/**
 * Prose variant with proper typography styling
 */
export function SafeHtmlProse({ html, className }: Omit<SafeHtmlProps, "as">) {
  return (
    <SafeHtml
      html={html}
      className={cn(
        "prose prose-neutral dark:prose-invert max-w-none",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-img:rounded-xl",
        "prose-pre:bg-muted prose-pre:border",
        className
      )}
      as="article"
    />
  )
}

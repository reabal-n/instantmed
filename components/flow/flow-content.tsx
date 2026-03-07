"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// FlowContent — Step-level layout wrapper
// ---------------------------------------------------------------------------

interface FlowContentProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/**
 * Full-width step container with heading + optional subtitle.
 * Every flow step renders inside one of these.
 */
export function FlowContent({
  title,
  description,
  children,
  className,
}: FlowContentProps) {
  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FlowSection — Sub-section divider within a step
// ---------------------------------------------------------------------------

interface FlowSectionProps {
  title?: string
  children: ReactNode
  className?: string
}

/**
 * Optional titled sub-section inside a step.
 * Use to visually separate groups of fields (e.g. "Personal details", "Consents").
 */
export function FlowSection({ title, children, className }: FlowSectionProps) {
  return (
    <div className={cn("mt-6", className)}>
      {title && (
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{title}</h3>
      )}
      {children}
    </div>
  )
}

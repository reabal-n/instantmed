"use client"

import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

interface SectionPillProps {
  children: ReactNode
  className?: string
}

export function SectionPill({ children, className }: SectionPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/60",
        "bg-background px-4 py-1.5 text-xs font-medium text-foreground/70",
        "shadow-sm shadow-primary/[0.04]",
        "dark:bg-white/[0.06] dark:border-white/10 dark:text-foreground/70",
        className
      )}
    >
      {children}
    </span>
  )
}

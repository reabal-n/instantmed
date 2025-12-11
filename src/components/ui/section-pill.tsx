"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionPillProps {
  icon: ReactNode
  text: string
  className?: string
}

export function SectionPill({ icon, text, className }: SectionPillProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full",
        "glass-card border-white/20 dark:border-white/10",
        "backdrop-blur-xl bg-white/60 dark:bg-black/40",
        "text-sm font-medium text-foreground",
        "animate-fade-in-down",
        className,
      )}
    >
      <span className="text-[#00e2b5]">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

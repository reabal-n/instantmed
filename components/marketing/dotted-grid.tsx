"use client"

import { cn } from "@/lib/utils"

interface DottedGridProps {
  className?: string
}

export function DottedGrid({ className }: DottedGridProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 -z-10",
        className
      )}
      style={{
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  )
}

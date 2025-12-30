"use client"

import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
}

const sizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn(sizes[size], "animate-spin text-primary")} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

interface FullPageLoaderProps {
  text?: string
}

export function FullPageLoader({ text = "Loading..." }: FullPageLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-muted-foreground text-sm animate-pulse-soft">{text}</p>
      </div>
    </div>
  )
}

interface SkeletonCardProps {
  lines?: number
  className?: string
}

export function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  const widths = useMemo(() => Array.from({ length: lines }, (_, i) => 60 + ((i * 13) % 30)), [lines])
  return (
    <div className={cn("p-4 rounded-xl border border-border/50 bg-card/50", className)}>
      <div className="skeleton h-5 w-1/3 rounded mb-3" />
      {widths.map((width, i) => (
        <div key={i} className="skeleton h-4 rounded mb-2" style={{ width: `${width}%` }} />
      ))}
    </div>
  )
}

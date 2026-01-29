"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface IntakeSkeletonProps {
  className?: string
  variant?: "form" | "selection" | "review"
}

/**
 * Loading skeleton for intake flow steps
 * Matches the visual structure of actual form content
 */
export function IntakeSkeleton({ className, variant = "form" }: IntakeSkeletonProps) {
  if (variant === "selection") {
    return (
      <div className={cn("space-y-6 animate-in fade-in duration-300", className)}>
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-7 w-48 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-64 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
        </div>
        
        {/* Selection cards skeleton */}
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (variant === "review") {
    return (
      <div className={cn("space-y-6 animate-in fade-in duration-300", className)}>
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-7 w-40 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-56 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
        </div>
        
        {/* Review card skeleton */}
        <div className="rounded-xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 p-5 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-24 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-32 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
        
        {/* Price skeleton */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="h-5 w-16 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-24 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
        </div>
        
        {/* Button skeleton */}
        <div className="h-12 w-full bg-white/40 dark:bg-white/10 rounded-xl animate-pulse" />
      </div>
    )
  }

  // Default form variant
  return (
    <div className={cn("space-y-6 animate-in fade-in duration-300", className)}>
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-52 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
        <div className="h-4 w-72 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
      </div>
      
      {/* Form fields skeleton */}
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="h-4 w-24 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
            <div className="h-12 w-full bg-white/60 dark:bg-white/5 rounded-xl border border-white/50 dark:border-white/10 animate-pulse" />
          </div>
        ))}
      </div>
      
      {/* Button skeleton */}
      <div className="h-12 w-full bg-white/40 dark:bg-white/10 rounded-xl animate-pulse mt-8" />
    </div>
  )
}

/**
 * Full-page intake loading state
 */
export function IntakePageSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-white/40 dark:bg-white/10 rounded-lg animate-pulse" />
            <div className="h-5 w-32 bg-white/40 dark:bg-white/10 rounded animate-pulse" />
          </div>
          {/* Progress bar skeleton */}
          <div className="mt-3 h-1 w-full bg-white/40 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-1/3 h-full bg-primary/50 rounded-full"
            />
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <IntakeSkeleton />
      </div>
    </div>
  )
}

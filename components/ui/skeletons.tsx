"use client"

import { cn } from "@/lib/utils"

/**
 * Unified Skeleton Components
 * 
 * Use these components for consistent loading states across the app.
 * All skeletons support dark mode automatically.
 */

interface SkeletonProps {
  className?: string
}

// Base skeleton with shimmer animation
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
    />
  )
}

// Table skeleton for data tables
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: SkeletonProps & { rows?: number; columns?: number }) {
  return (
    <div className={cn("rounded-lg border", className)}>
      {/* Header */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-3">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className={cn(
                  "h-4 flex-1",
                  colIndex === 0 && "max-w-[200px]"
                )} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Card skeleton for dashboard cards
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
}

// Stats card skeleton
export function StatsSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-5", className)}>
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}

// List skeleton for vertical lists
export function ListSkeleton({ 
  items = 5,
  className 
}: SkeletonProps & { items?: number }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Form skeleton
export function FormSkeleton({ 
  fields = 4,
  className 
}: SkeletonProps & { fields?: number }) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

// Profile skeleton
export function ProfileSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

// Page header skeleton
export function PageHeaderSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  )
}

// Grid skeleton for card grids
export function GridSkeleton({ 
  items = 6,
  columns = 3,
  className 
}: SkeletonProps & { items?: number; columns?: number }) {
  return (
    <div 
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// Text skeleton for paragraphs
export function TextSkeleton({ 
  lines = 3,
  className 
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 ? "w-3/4" : "w-full"
          )} 
        />
      ))}
    </div>
  )
}

// Inline skeleton (for inline loading)
export function InlineSkeleton({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-16 inline-block", className)} />
}

// Avatar skeleton
export function AvatarSkeleton({ 
  size = "md",
  className 
}: SkeletonProps & { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  }
  
  return (
    <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />
  )
}

// Button skeleton
export function ButtonSkeleton({ 
  size = "default",
  className 
}: SkeletonProps & { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-20",
    default: "h-10 w-24",
    lg: "h-12 w-32",
  }
  
  return (
    <Skeleton className={cn("rounded-md", sizeClasses[size], className)} />
  )
}

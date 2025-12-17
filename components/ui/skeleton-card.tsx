"use client"

import { cn } from "@/lib/utils"

interface SkeletonCardProps {
  className?: string
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("glass-card rounded-2xl p-6 animate-pulse", className)}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-muted/60" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted/60 rounded-lg w-3/4" />
          <div className="h-3 bg-muted/40 rounded-lg w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-3 bg-muted/40 rounded-lg w-full" />
        <div className="h-3 bg-muted/40 rounded-lg w-5/6" />
      </div>
    </div>
  )
}

export function SkeletonStats({ className }: SkeletonCardProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 bg-muted/60 rounded w-16" />
            <div className="w-4 h-4 bg-muted/40 rounded" />
          </div>
          <div className="h-8 bg-muted/60 rounded w-12 mt-2" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonRequestList({ count = 3, className }: SkeletonCardProps & { count?: number }) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card animate-pulse">
          <div className="w-10 h-10 rounded-full bg-muted/60" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/60 rounded w-1/3" />
            <div className="h-3 bg-muted/40 rounded w-1/4" />
          </div>
          <div className="h-6 bg-muted/40 rounded-full w-20" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonCardProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b bg-muted/20">
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-muted/60 rounded animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b last:border-0">
          {[...Array(cols)].map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="flex-1 h-4 bg-muted/40 rounded animate-pulse"
              style={{ animationDelay: `${(rowIndex * cols + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-6 bg-muted/60 rounded w-48" />
          <div className="h-4 bg-muted/40 rounded w-64" />
        </div>
        <div className="h-10 bg-muted/60 rounded-xl w-32" />
      </div>
      
      {/* Stats */}
      <SkeletonStats />
      
      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      
      {/* Request list */}
      <SkeletonRequestList count={3} />
    </div>
  )
}

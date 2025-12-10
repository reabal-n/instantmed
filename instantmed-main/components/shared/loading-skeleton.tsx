"use client"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  variant?: "default" | "shimmer" | "pulse"
  style?: React.CSSProperties
}

export function Skeleton({ className, variant = "shimmer", style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md",
        variant === "shimmer" &&
          "bg-gradient-to-r from-muted/60 via-muted to-muted/60 bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]",
        variant === "pulse" && "bg-muted animate-pulse",
        variant === "default" && "bg-muted/80",
        className
      )}
      style={style}
    />
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card rounded-2xl p-6 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
      </div>
    </div>
  )
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4">
          <Skeleton className={cn("h-5", i === 0 ? "w-32" : i === columns - 1 ? "w-20 ml-auto" : "w-24")} />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 border-b border-border/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton
                key={j}
                className={cn("h-5", j === 0 ? "w-32" : j === columns - 1 ? "w-20" : "w-24")}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-card rounded-2xl p-5"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2" style={{ animationDelay: `${i * 0.1}s` }}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className={cn("h-10 w-full rounded-xl", i === fields - 1 && "h-24")} />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-xl mt-4" />
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Avatar section */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Request card skeleton for patient dashboard
export function RequestCardSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="pt-3 border-t border-border/50 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}

export function RequestListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </div>
  )
}

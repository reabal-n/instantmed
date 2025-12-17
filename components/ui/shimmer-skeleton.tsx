"use client"

import { cn } from "@/lib/utils"

interface ShimmerSkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  style?: React.CSSProperties
}

const roundedClasses = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
}

export function ShimmerSkeleton({
  className,
  width,
  height,
  rounded = "lg",
  style,
}: ShimmerSkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton-shimmer",
        roundedClasses[rounded],
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
    />
  )
}

export function ShimmerText({
  lines = 1,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerSkeleton
          key={i}
          className="h-4"
          width={i === lines - 1 && lines > 1 ? "75%" : "100%"}
        />
      ))}
    </div>
  )
}

export function ShimmerAvatar({
  size = 40,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <ShimmerSkeleton
      className={className}
      width={size}
      height={size}
      rounded="full"
    />
  )
}

export function ShimmerButton({
  width = 100,
  height = 36,
  className,
}: {
  width?: number | string
  height?: number
  className?: string
}) {
  return (
    <ShimmerSkeleton
      className={className}
      width={width}
      height={height}
      rounded="xl"
    />
  )
}

export function ShimmerCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card rounded-2xl p-5 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <ShimmerAvatar size={40} />
        <div className="flex-1 space-y-2">
          <ShimmerSkeleton className="h-4 w-3/4" />
          <ShimmerSkeleton className="h-3 w-1/2" />
        </div>
      </div>
      <ShimmerText lines={2} />
    </div>
  )
}

export function ShimmerStatCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between mb-3">
        <ShimmerSkeleton className="h-4 w-20" />
        <ShimmerSkeleton className="h-4 w-4" rounded="md" />
      </div>
      <ShimmerSkeleton className="h-8 w-14" />
    </div>
  )
}

export function ShimmerRequestRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-4", className)}>
      <ShimmerAvatar size={40} />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <ShimmerSkeleton className="h-4 w-32" />
          <ShimmerSkeleton className="h-4 w-8" />
          <ShimmerSkeleton className="h-5 w-16" rounded="full" />
        </div>
        <ShimmerSkeleton className="h-3 w-24" />
      </div>
      <div className="flex gap-2">
        <ShimmerButton width={32} height={32} />
        <ShimmerButton width={32} height={32} />
      </div>
    </div>
  )
}

export function ShimmerTable({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={cn("glass-card rounded-2xl overflow-hidden", className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-white/10">
        {Array.from({ length: cols }).map((_, i) => (
          <ShimmerSkeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-4 border-b border-white/10 last:border-0"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <ShimmerSkeleton
              key={colIndex}
              className="h-4 flex-1"
              style={{ animationDelay: `${(rowIndex * cols + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ShimmerDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <ShimmerSkeleton className="h-8 w-64" />
        <ShimmerSkeleton className="h-4 w-48" />
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerStatCard key={i} />
        ))}
      </div>

      {/* Content */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <ShimmerSkeleton className="h-6 w-40" />
          <ShimmerButton width={100} />
        </div>
        <div className="divide-y divide-white/10">
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerRequestRow key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

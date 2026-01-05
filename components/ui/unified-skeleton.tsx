"use client"

import { cn } from "@/lib/utils"
import { Skeleton as HeroSkeleton } from "@heroui/react"

/**
 * Unified Skeleton System with Shimmer Effects
 * 
 * This is the primary loading component system for the platform.
 * All loading states should use components from this file.
 */

// =============================================================================
// BASE SKELETON WITH SHIMMER
// =============================================================================

interface BaseSkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full"
}

export function Skeleton({ 
  className, 
  width, 
  height,
  rounded = "lg"
}: BaseSkeletonProps) {
  const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full",
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted animate-pulse",
        roundedClasses[rounded],
        className
      )}
      style={{
        width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
        height: height ? (typeof height === "number" ? `${height}px` : height) : undefined,
      }}
    >
      {/* Shimmer effect */}
      <div
        className={cn(
          "absolute inset-0 animate-shimmer",
          "bg-gradient-to-r from-transparent via-white/20 to-transparent"
        )}
      />
    </div>
  )
}

// =============================================================================
// CONTEXT-AWARE SKELETONS
// =============================================================================

/**
 * Request List Skeleton
 * Use for loading lists of requests/cards
 */
export function RequestListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Request Card Skeleton
 * Single card skeleton for requests
 */
export function RequestCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-24" rounded="full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16" rounded="full" />
        <Skeleton className="h-6 w-16" rounded="full" />
      </div>
    </div>
  )
}

/**
 * Dashboard Skeleton
 * Use for dashboard pages with stats and content
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Content Cards */}
      <RequestCardSkeleton />
      <RequestCardSkeleton />
    </div>
  )
}

/**
 * Stats Card Skeleton
 * Individual stat card loading state
 */
export function StatsCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-10 w-10" rounded="xl" />
        <Skeleton className="h-6 w-12" rounded="full" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

/**
 * Form Skeleton
 * Use for loading form sections
 */
export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full" rounded="xl" />
        </div>
      ))}
      <Skeleton className="h-24 w-full" rounded="xl" />
      <Skeleton className="h-12 w-full" rounded="xl" />
    </div>
  )
}

/**
 * Page Skeleton
 * Full page loading state
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-300">
      <div className="container max-w-5xl py-8 px-4 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        
        {/* Content */}
        <DashboardSkeleton />
      </div>
    </div>
  )
}

/**
 * Table Row Skeleton
 * For loading table rows
 */
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border">
      <Skeleton className="h-10 w-10" rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-8 w-20" rounded="lg" />
      <Skeleton className="h-8 w-24" rounded="lg" />
    </div>
  )
}

// =============================================================================
// SPINNERS
// =============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Spinner Component
 * Use for inline loading states
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full',
        'border-primary/30 border-t-primary',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * Spinner with Text
 * Loading spinner with accompanying message
 */
export function SpinnerWithText({ 
  text = 'Loading...', 
  size = 'md',
  className,
}: SpinnerProps & { text?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Spinner size={size} />
      <span className="text-sm text-muted-foreground animate-pulse">{text}</span>
    </div>
  )
}

/**
 * Loading Overlay
 * Full-screen loading overlay
 */
export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
        )}
      </div>
    </div>
  )
}

/**
 * Button Spinner
 * Small spinner for button loading states
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-4 h-4 animate-spin rounded-full',
        'border-2 border-current/30 border-t-current',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * Loading State with Message
 * Contextual loading state with message and optional submessage
 */
interface LoadingStateProps {
  message?: string
  submessage?: string
  className?: string
}

export function LoadingState({ 
  message = "Loading...", 
  submessage,
  className 
}: LoadingStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1 animate-pulse">{message}</p>
      {submessage && (
        <p className="text-xs text-muted-foreground">{submessage}</p>
      )}
    </div>
  )
}


"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// =============================================================================
// BASE SKELETON
// =============================================================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoaded?: boolean
}

function Skeleton({
  className,
  isLoaded,
  children,
  ...props
}: SkeletonProps) {
  if (isLoaded) {
    return <>{children}</>
  }

  return (
    <div
      className={cn(
        "animate-pulse rounded-xl",
        "bg-white/30 dark:bg-white/5",
        "backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

// =============================================================================
// MODERN SPINNER
// =============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function Spinner({ size = 'md', className }: SpinnerProps) {
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

/** Spinner with text */
function SpinnerWithText({
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

/** Full-page loading spinner */
function LoadingOverlay({ text }: { text?: string }) {
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

/** Inline loading state for buttons */
function ButtonSpinner({ className }: { className?: string }) {
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

// =============================================================================
// PRE-BUILT SKELETON PATTERNS
// =============================================================================

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-white/40 dark:border-white/10 p-5 space-y-3 shadow-[0_4px_20px_rgb(59,130,246,0.1)]">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  )
}

function SkeletonForm() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/50 bg-surface p-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      {/* Content */}
      <SkeletonCard />
      <SkeletonList count={3} />
    </div>
  )
}

// =============================================================================
// FORM-SPECIFIC SKELETONS
// =============================================================================

/** Skeleton for a GlassCard form section */
function SkeletonFormSection() {
  return (
    <div className="rounded-2xl border border-border/50 bg-[var(--glass-bg)] backdrop-blur-sm p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      {/* Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/** Skeleton for the stepper/progress bar */
function SkeletonStepper() {
  return (
    <div className="w-full space-y-2">
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Mobile */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  )
}

/** Skeleton for onboarding page */
function SkeletonOnboarding() {
  return (
    <div className="space-y-8">
      <SkeletonStepper />
      <SkeletonFormSection />
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
      </div>
    </div>
  )
}

/** Skeleton for input field */
function SkeletonInput() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

/** Skeleton for pill/chip selector */
function SkeletonPillSelector({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonRow,
  SkeletonForm,
  SkeletonList,
  SkeletonDashboard,
  SkeletonFormSection,
  SkeletonStepper,
  SkeletonOnboarding,
  SkeletonInput,
  SkeletonPillSelector,
  // Spinners
  Spinner,
  SpinnerWithText,
  LoadingOverlay,
  ButtonSpinner,
}

'use client'

import { cn } from '@/lib/utils'

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/60',
        className
      )}
    />
  )
}

/**
 * Skeleton for service cards on landing pages
 */
export function ServiceCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-6 rounded-2xl border border-border bg-card', className)}>
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  )
}

/**
 * Skeleton for testimonial cards
 */
export function TestimonialSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

/**
 * Skeleton for stat cards
 */
export function StatSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('text-center p-4 rounded-xl bg-card/40 border border-border/40', className)}>
      <Skeleton className="h-8 w-16 mx-auto mb-2" />
      <Skeleton className="h-3 w-20 mx-auto" />
    </div>
  )
}

/**
 * Skeleton for hero section
 */
export function HeroSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('text-center max-w-4xl mx-auto py-20 px-4', className)}>
      <Skeleton className="h-6 w-40 mx-auto mb-6 rounded-full" />
      <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
      <Skeleton className="h-12 w-1/2 mx-auto mb-6" />
      <div className="space-y-2 mb-8">
        <Skeleton className="h-5 w-2/3 mx-auto" />
        <Skeleton className="h-5 w-1/2 mx-auto" />
      </div>
      <Skeleton className="h-14 w-48 mx-auto rounded-xl" />
    </div>
  )
}

/**
 * Skeleton for FAQ items
 */
export function FAQSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-xl border border-border bg-card">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mt-1" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for pricing cards grid
 */
export function PricingGridSkeleton({ 
  count = 3, 
  className 
}: { 
  count?: number
  className?: string 
}) {
  return (
    <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <ServiceCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Skeleton for doctor/team cards
 */
export function DoctorCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('text-center p-4', className)}>
      <Skeleton className="w-20 h-20 rounded-full mx-auto mb-3" />
      <Skeleton className="h-5 w-32 mx-auto mb-1" />
      <Skeleton className="h-4 w-24 mx-auto" />
    </div>
  )
}

/**
 * Inline loading indicator
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
    </div>
  )
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Navbar skeleton */}
      <div className="h-16 border-b border-border px-4">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="hidden md:flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
      
      {/* Hero skeleton */}
      <HeroSkeleton />
      
      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <PricingGridSkeleton />
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { Skeleton as HeroSkeleton } from "@heroui/react"
import { cn } from "@/lib/utils"

/**
 * UIX Skeleton - Enhanced loading placeholder with shimmer effects
 * Uses HeroUI Skeleton with additional styling options
 */

export interface SkeletonProps {
  className?: string
  /** Width of the skeleton */
  width?: string | number
  /** Height of the skeleton */
  height?: string | number
  /** Shape variant */
  variant?: "rounded" | "circular" | "text"
  /** Whether to show shimmer animation */
  isLoaded?: boolean
}

export function Skeleton({
  className,
  width,
  height,
  variant = "rounded",
  isLoaded = false,
}: SkeletonProps) {
  const style = {
    width: width,
    height: height,
  }

  return (
    <HeroSkeleton
      isLoaded={isLoaded}
      className={cn(
        "before:!duration-1000",
        variant === "circular" && "rounded-full",
        variant === "text" && "rounded-md",
        variant === "rounded" && "rounded-lg",
        className
      )}
      style={style}
    >
      <div className="w-full h-full bg-default-200" />
    </HeroSkeleton>
  )
}

/**
 * Card skeleton for loading states
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-default-100 p-6 space-y-4 bg-content1", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Skeleton className="h-8 w-8" variant="circular" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
      </div>
    </div>
  )
}

/**
 * List item skeleton
 */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 rounded-xl border border-default-100 bg-content1", className)}>
      <Skeleton className="h-12 w-12" variant="circular" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-xl" />
    </div>
  )
}

/**
 * Dashboard stats skeleton
 */
export function StatsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-default-100 p-5 bg-content1">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Form skeleton
 */
export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
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

/**
 * Table skeleton
 */
export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-default-100 p-6 bg-content1", className)}>
      <Skeleton className="h-6 w-40 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-default-100 last:border-0">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10" variant="circular" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { Skeleton as UIXSkeleton }

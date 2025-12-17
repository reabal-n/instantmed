'use client'

import { Skeleton } from '@heroui/react'
import { cn } from '@/lib/utils'

interface PremiumSkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  lines?: number
}

export function PremiumSkeleton({ 
  className, 
  variant = 'rectangular',
  lines = 1 
}: PremiumSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn('rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6', className)}>
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-lg" />
            <Skeleton className="h-3 w-1/2 rounded-lg" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full rounded-lg" />
          <Skeleton className="h-3 w-5/6 rounded-lg" />
          <Skeleton className="h-3 w-4/6 rounded-lg" />
        </div>
      </div>
    )
  }

  if (variant === 'circular') {
    return <Skeleton className={cn('rounded-full', className)} />
  }

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-4 rounded-lg',
              i === lines - 1 ? 'w-3/4' : 'w-full'
            )} 
          />
        ))}
      </div>
    )
  }

  return <Skeleton className={cn('rounded-lg', className)} />
}

export function CardSkeleton({ className }: { className?: string }) {
  return <PremiumSkeleton variant="card" className={className} />
}

export function RequestListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div 
          key={i}
          className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="h-3 w-48 rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="h-4 w-56 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 flex gap-4">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}

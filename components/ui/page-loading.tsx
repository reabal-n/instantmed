'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Spinner, LoadingState as UnifiedLoadingState, ButtonSpinner } from '@/components/ui/unified-skeleton'

interface PageLoadingProps {
  message?: string
  className?: string
}

export function PageLoading({ message = 'Loading...', className }: PageLoadingProps) {
  const [showSlowMessage, setShowSlowMessage] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowSlowMessage(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] py-12',
        className
      )}
    >
      <UnifiedLoadingState 
        message={message}
        submessage={showSlowMessage ? "This is taking longer than usual..." : undefined}
      />
    </div>
  )
}

export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Spinner size="sm" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  )
}

export function ButtonLoading({ children }: { children?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <ButtonSpinner />
      {children || 'Loading...'}
    </span>
  )
}

// For Next.js Suspense boundaries
export function SuspenseFallback() {
  return (
    <div className="w-full h-32 flex items-center justify-center">
      <Spinner size="md" />
    </div>
  )
}

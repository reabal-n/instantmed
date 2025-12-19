'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{message}</p>
      {showSlowMessage && (
        <p className="text-sm text-muted-foreground mt-2">
          This is taking longer than usual...
        </p>
      )}
    </div>
  )
}

export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  )
}

export function ButtonLoading({ children }: { children?: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      {children || 'Loading...'}
    </span>
  )
}

// For Next.js Suspense boundaries
export function SuspenseFallback() {
  return (
    <div className="w-full h-32 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  )
}

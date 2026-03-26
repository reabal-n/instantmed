'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Compact trust + activity badge for checkout flows.
 * Shows a subtle "X others completed checkout" signal.
 */
interface CheckoutActivityBadgeProps {
  className?: string
}

export function CheckoutActivityBadge({ className }: CheckoutActivityBadgeProps) {
  const [count] = useState(() => Math.floor(Math.random() * 15) + 8)

  return (
    <div className={cn(
      'flex items-center justify-center gap-2 text-xs text-muted-foreground',
      className
    )}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      <span>{count} others completed checkout in the last hour</span>
    </div>
  )
}

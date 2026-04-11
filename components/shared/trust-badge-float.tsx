'use client'

import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { TrustBadge } from '@/components/shared/trust-badge'
import { TooltipProvider } from '@/components/ui/tooltip'

interface TrustBadgeFloatProps {
  className?: string
  /** Show after this many px of scroll (default: 400) */
  showAfter?: number
}

export function TrustBadgeFloat({ className, showAfter = 400 }: TrustBadgeFloatProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > showAfter)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [showAfter])

  if (!visible) return null

  return (
    <TooltipProvider>
      <div className={cn(
        // Hidden on mobile - only desktop
        'hidden xl:flex flex-col gap-2',
        'fixed right-6 top-1/2 -translate-y-1/2 z-40',
        'p-3 rounded-2xl bg-white/80 dark:bg-card/80 backdrop-blur-sm',
        'border border-border/50 shadow-lg shadow-primary/[0.08]',
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className,
      )}>
        <TrustBadge id="no_call" variant="styled" />
        <div className="h-px bg-border/50" />
        <TrustBadge id="ahpra" />
      </div>
    </TooltipProvider>
  )
}

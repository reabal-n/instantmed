'use client'

import { Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FlowCTAProps {
  label: string
  disabled?: boolean
  isLoading?: boolean
  onClick?: () => void | Promise<void>
  variant?: 'primary' | 'secondary'
  className?: string
}

export function FlowCTA({
  label,
  disabled = false,
  isLoading = false,
  onClick,
  variant = 'primary',
  className,
}: FlowCTAProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-white/95 backdrop-blur-sm border-t border-slate-100',
        'px-4 py-4 sm:py-5',
        className
      )}
    >
      <div className="max-w-2xl mx-auto">
        <Button
          onClick={onClick}
          disabled={disabled || isLoading}
          size="lg"
          className={cn(
            'w-full h-12 sm:h-14 text-base font-semibold rounded-xl',
            'transition-all duration-200',
            variant === 'primary' && [
              'bg-emerald-600 hover:bg-emerald-700 text-white',
              'shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30',
              'disabled:bg-slate-300 disabled:shadow-none',
            ],
            variant === 'secondary' && [
              'bg-slate-900 hover:bg-slate-800 text-white',
            ]
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              {label}
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Secure & encrypted</span>
        </div>
      </div>
    </div>
  )
}

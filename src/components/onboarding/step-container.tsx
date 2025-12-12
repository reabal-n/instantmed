'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

interface StepContainerProps {
  title: string
  description?: string
  children: ReactNode
  
  // Navigation
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  isLoading?: boolean
  showBack?: boolean
  
  // Sticky footer
  stickyFooter?: boolean
  
  className?: string
}

export function StepContainer({
  title,
  description,
  children,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  isLoading = false,
  showBack = true,
  stickyFooter = true,
  className,
}: StepContainerProps) {
  return (
    <div className={cn('flex flex-col min-h-[calc(100vh-200px)]', className)}>
      {/* Header */}
      <div className="mb-8">
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>

      {/* Footer with CTA */}
      {onNext && (
        <div
          className={cn(
            'pt-6',
            stickyFooter && 'sticky-bottom-button'
          )}
        >
          <Button
            onClick={onNext}
            disabled={nextDisabled || isLoading}
            className="w-full md:w-auto md:min-w-[200px] h-12 text-base font-medium"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              nextLabel
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

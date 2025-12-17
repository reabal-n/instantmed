'use client'

import { cn } from '@/lib/utils'

interface FlowContentProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FlowContent({
  title,
  description,
  children,
  className,
}: FlowContentProps) {
  return (
    <div className={cn('p-6 sm:p-8', className)}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-slate-600 text-sm sm:text-base">
            {description}
          </p>
        )}
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  )
}

// Sub-section within content
interface FlowSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FlowSection({
  title,
  description,
  children,
  className,
}: FlowSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

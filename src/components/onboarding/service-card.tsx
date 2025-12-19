'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Check, ChevronRight } from 'lucide-react'
import type { Service } from '@/types/database'

interface ServiceCardProps {
  service: Service
  isSelected: boolean
  onSelect: () => void
}

export function ServiceCard({ service, isSelected, onSelect }: ServiceCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative flex items-start gap-4 p-4 md:p-6 rounded-xl border-2 text-left transition-all duration-200',
        'hover:border-primary/50 hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border bg-card'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground/30 bg-background'
        )}
      >
        {isSelected && <Check className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground">
              {service.name}
            </h3>
            {service.badge_text && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {service.badge_text}
              </Badge>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-semibold text-foreground">
              ${(service.price_cents / 100).toFixed(2)}
            </div>
          </div>
        </div>
        
        {service.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {service.description}
          </p>
        )}
      </div>

      {/* Arrow indicator */}
      <ChevronRight
        className={cn(
          'flex-shrink-0 w-5 h-5 text-muted-foreground transition-transform',
          isSelected && 'text-primary translate-x-1'
        )}
      />
    </button>
  )
}

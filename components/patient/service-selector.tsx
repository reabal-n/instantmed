'use client'

import { FileText, MessageSquare,Pill } from 'lucide-react'

import { PerspectiveTiltCard } from '@/components/ui/morning/perspective-tilt-card'
import { cn } from '@/lib/utils'

/**
 * ServiceSelector - Choose which service to request
 * 
 * Opens in a SessionPanel from "New Request" button
 * Calm, focused selection - no marketing hype
 */

type ServiceType = 'medical-certificate' | 'prescription' | 'consultation'

interface ServiceSelectorProps {
  onSelectService: (service: ServiceType) => void
}

const SERVICES = [
  {
    id: 'medical-certificate' as const,
    icon: FileText,
    label: 'Medical Certificate',
    description: 'For work, uni, or carer\'s leave',
    color: 'from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/30',
    iconColor: 'text-primary',
  },
  {
    id: 'prescription' as const,
    icon: Pill,
    label: 'Prescription',
    description: 'New or repeat prescription',
    color: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20',
    iconColor: 'text-success',
  },
  {
    id: 'consultation' as const,
    icon: MessageSquare,
    label: 'General Consultation',
    description: 'Speak to a doctor about your health',
    color: 'from-sky-50 to-sky-100 dark:from-sky-950/40 dark:to-sky-900/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
]

export function ServiceSelector({ onSelectService }: ServiceSelectorProps) {
  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
          What do you need?
        </h2>
        <p className="text-sm text-muted-foreground">
          Select a service to get started
        </p>
      </div>

      <div className="space-y-3">
        {SERVICES.map((service) => {
          const Icon = service.icon
          return (
            <PerspectiveTiltCard key={service.id} maxRotation={8} variant="outline" className="p-0">
              <button
                onClick={() => onSelectService(service.id)}
                className={cn(
                  'w-full p-6 rounded-2xl border-2 border-transparent',
                  'bg-linear-to-br transition-all duration-200',
                  'hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  'text-left card-shine',
                  service.color
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    'bg-white dark:bg-white/10 shadow-sm icon-spin-hover',
                    service.iconColor
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {service.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                </div>
              </button>
            </PerspectiveTiltCard>
          )
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-center text-muted-foreground">
          All requests reviewed by AHPRA-registered Australian doctors
        </p>
      </div>
    </div>
  )
}

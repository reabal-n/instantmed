'use client'

import { FileText, Pill, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TiltCard } from '@/components/shared/tilt-card'

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
    color: 'from-blue-50 to-blue-100',
    iconColor: 'text-primary',
  },
  {
    id: 'prescription' as const,
    icon: Pill,
    label: 'Prescription',
    description: 'New or repeat prescription',
    color: 'from-green-50 to-green-100',
    iconColor: 'text-green-600',
  },
  {
    id: 'consultation' as const,
    icon: MessageSquare,
    label: 'General Consultation',
    description: 'Speak to a doctor about your health',
    color: 'from-purple-50 to-purple-100',
    iconColor: 'text-purple-600',
  },
]

export function ServiceSelector({ onSelectService }: ServiceSelectorProps) {
  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          What do you need?
        </h2>
        <p className="text-sm text-gray-600">
          Select a service to get started
        </p>
      </div>

      <div className="space-y-3">
        {SERVICES.map((service) => {
          const Icon = service.icon
          return (
            <TiltCard key={service.id} tiltAmount={8}>
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
                    'bg-white shadow-sm icon-spin-hover',
                    service.iconColor
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {service.label}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {service.description}
                    </p>
                  </div>
                </div>
              </button>
            </TiltCard>
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

'use client'

import { FileText, Pill, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ServiceType } from '@/lib/types'

interface ServiceSelectionProps {
  value: ServiceType | null
  onChange: (service: ServiceType) => void
  onNext: () => void
}

const services = [
  {
    id: 'sick_cert' as ServiceType,
    title: 'Medical Certificate',
    description: 'For sick leave, carer\'s leave, or exam deferrals',
    price: '$24.95',
    icon: FileText,
    features: [
      'Valid for all Australian employers',
      'Up to 7 days coverage',
      'Instant PDF delivery',
    ],
  },
  {
    id: 'prescription' as ServiceType,
    title: 'Prescription Renewal',
    description: 'Renew your regular medications',
    price: '$29.95',
    icon: Pill,
    features: [
      'PBS eligible medications',
      'eScript to any pharmacy',
      'Repeats included',
    ],
  },
]

export function ServiceSelection({ value, onChange, onNext }: ServiceSelectionProps) {
  return (
    <div className="space-y-6 animate-slide-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          What do you need today?
        </h2>
        <p className="text-muted-foreground">
          Select the service that best fits your needs
        </p>
      </div>

      <div className="grid gap-4 md:gap-6">
        {services.map((service) => {
          const Icon = service.icon
          const isSelected = value === service.id

          return (
            <Card
              key={service.id}
              className={cn(
                'cursor-pointer transition-all duration-200',
                isSelected
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:shadow-md hover:border-primary/50'
              )}
              onClick={() => onChange(service.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
                    )}
                  >
                    <Icon className={cn('w-7 h-7', !isSelected && 'text-primary')} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold">{service.title}</h3>
                      <span className="text-lg font-bold text-primary">{service.price}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      {service.description}
                    </p>
                    <ul className="space-y-1.5">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="sticky-bottom-button">
        <Button
          size="lg"
          className="w-full touch-target text-base"
          disabled={!value}
          onClick={onNext}
        >
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}


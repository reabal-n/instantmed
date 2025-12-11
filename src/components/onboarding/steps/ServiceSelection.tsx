'use client'

import { motion } from 'framer-motion'
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
    iconBg: 'bg-teal-50',
    iconBgSelected: 'bg-teal-600',
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
    iconBg: 'bg-purple-50',
    iconBgSelected: 'bg-purple-600',
    features: [
      'PBS eligible medications',
      'eScript to any pharmacy',
      'Repeats included',
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 20,
    },
  },
}

export function ServiceSelection({ value, onChange, onNext }: ServiceSelectionProps) {
  return (
    <div className="space-y-6">
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
          What do you need today?
        </h2>
        <p className="text-muted-foreground">
          Select the service that best fits your needs
        </p>
      </motion.div>

      <motion.div 
        className="grid gap-4 md:gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {services.map((service) => {
          const Icon = service.icon
          const isSelected = value === service.id

          return (
            <motion.div key={service.id} variants={itemVariants}>
              <Card
                className={cn(
                  'cursor-pointer border-slate-100 transition-all duration-300 ease-out',
                  isSelected
                    ? 'ring-2 ring-teal-500 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-teal-500/30 -translate-y-1'
                    : 'hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04),0_0_0_1px_oklch(0.55_0.15_185_/_0.1)] hover:border-teal-500/20'
                )}
                onClick={() => onChange(service.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300',
                        isSelected ? service.iconBgSelected : service.iconBg
                      )}
                    >
                      <Icon className={cn(
                        'w-7 h-7 transition-colors duration-300', 
                        isSelected ? 'text-white' : service.id === 'sick_cert' ? 'text-teal-600' : 'text-purple-600'
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold">{service.title}</h3>
                        <span className="text-lg font-bold text-teal-600">{service.price}</span>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        {service.description}
                      </p>
                      <ul className="space-y-1.5">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300',
                        isSelected
                          ? 'border-teal-500 bg-teal-500 scale-110'
                          : 'border-slate-300'
                      )}
                    >
                      {isSelected && (
                        <motion.div 
                          className="w-2.5 h-2.5 rounded-full bg-white"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Sticky footer with glassmorphism */}
      <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto bg-white/95 backdrop-blur-md border-t md:border-t-0 border-slate-200/50 p-4 md:p-0 md:bg-transparent md:backdrop-blur-none dark:bg-slate-900/95 dark:border-slate-700/50">
        <Button
          size="lg"
          className={cn(
            "w-full touch-target text-base bg-teal-600 hover:bg-teal-700",
            value && "animate-pulse-cta"
          )}
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


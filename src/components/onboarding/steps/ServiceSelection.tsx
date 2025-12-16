'use client'

import { motion } from 'framer-motion'
import { FileText, Pill, ArrowRight, Clock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
    subtitle: 'Proof of illness for work or uni',
    price: '$29',
    time: '~1 hour',
    icon: FileText,
    popular: true,
    features: [
      'Valid for all employers',
      'Emailed same-day',
      'Backdating if needed',
    ],
  },
  {
    id: 'prescription' as ServiceType,
    title: 'Prescription',
    subtitle: 'Your regular medications',
    price: '$39',
    time: '~1 hour',
    icon: Pill,
    popular: false,
    features: [
      'Sent to your pharmacy',
      'Repeats included',
      'Common medications',
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
  },
}

export function ServiceSelection({ value, onChange, onNext }: ServiceSelectionProps) {
  const handleSelect = (service: ServiceType) => {
    onChange(service)
    // Small delay before advancing to let user see selection
    setTimeout(() => onNext(), 150)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Med cert or script?
        </h2>
        <p className="text-slate-600 text-base">
          Pick what you need — takes under 3 minutes
        </p>
      </motion.div>

      {/* Service Cards Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {services.map((service) => {
          const Icon = service.icon
          const isSelected = value === service.id

          return (
            <motion.div 
              key={service.id} 
              variants={itemVariants}
              className="relative"
            >
              <div
                className={cn(
                  'relative h-full rounded-2xl border-2 bg-white p-6 cursor-pointer transition-all duration-200 shadow-sm',
                  isSelected
                    ? 'border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-xl shadow-teal-500/20 scale-[1.02]'
                    : 'border-slate-200 hover:border-teal-300 hover:shadow-lg hover:bg-slate-50'
                )}
                onClick={() => handleSelect(service.id)}
              >
                {/* Popular Badge */}
                {service.popular && (
                  <Badge 
                    className="absolute -top-2.5 right-4 bg-teal-500 hover:bg-teal-500 text-white text-xs font-medium px-3 py-1 shadow-sm"
                  >
                    Most popular
                  </Badge>
                )}

                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all shadow-sm',
                  isSelected ? 'bg-gradient-to-br from-teal-500 to-cyan-500 shadow-md shadow-teal-500/30' : 'bg-slate-100'
                )}>
                  <Icon className={cn(
                    'w-6 h-6 transition-colors',
                    isSelected ? 'text-white' : 'text-slate-500'
                  )} />
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  {service.subtitle}
                </p>

                {/* Price & Time */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xl font-bold text-slate-900">{service.price}</span>
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{service.time}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-5">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Link */}
                <button
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-semibold transition-colors group',
                    isSelected ? 'text-teal-600' : 'text-teal-500 hover:text-teal-600'
                  )}
                >
                  Get started
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    className="absolute top-4 right-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Helper text */}
      <motion.p 
        className="text-center text-sm text-slate-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Not sure which service you need?{' '}
        <a href="#faq" className="text-teal-500 hover:text-teal-600 underline underline-offset-2">
          Learn how it works
        </a>{' '}
        or{' '}
        <a href="#faq" className="text-teal-500 hover:text-teal-600 underline underline-offset-2">
          browse our FAQ
        </a>
      </motion.p>
    </div>
  )
}

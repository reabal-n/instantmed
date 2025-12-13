'use client'

import { motion } from 'framer-motion'
import { FileText, Pill, Stethoscope, Scale, Clock, Check, ArrowRight } from 'lucide-react'
import { FlowContent } from '../flow-content'
import { useFlowStore, useFlowService } from '@/lib/flow'
import { cn } from '@/lib/utils'

interface ServiceOption {
  slug: string
  name: string
  description: string
  price: string
  time: string
  icon: React.ElementType
  popular?: boolean
  features: string[]
}

const services: ServiceOption[] = [
  {
    slug: 'medical-certificate',
    name: 'Medical Certificate',
    description: 'Sick leave, carer\'s leave, or fitness certificates',
    price: '$24.95',
    time: '~45 min',
    icon: FileText,
    popular: true,
    features: ['Same-day delivery', 'Employer-ready PDF', 'Backdating available'],
  },
  {
    slug: 'prescription',
    name: 'Prescription',
    description: 'Repeat scripts or new medication requests',
    price: '$19.95',
    time: '~1 hour',
    icon: Pill,
    features: ['Sent to your pharmacy', 'E-script available', 'Medication review'],
  },
  {
    slug: 'referral',
    name: 'Specialist Referral',
    description: 'Referrals to specialists, imaging, or pathology',
    price: '$34.95',
    time: '~1 hour',
    icon: Stethoscope,
    features: ['All specialties', 'Valid 12 months', 'Medicare eligible'],
  },
  {
    slug: 'weight-management',
    name: 'Weight Management',
    description: 'Medically supervised weight loss programs',
    price: '$49.95',
    time: '~2 hours',
    icon: Scale,
    features: ['Initial assessment', 'Ongoing support', 'Medication if suitable'],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
}

interface ServiceStepProps {
  onServiceSelect?: (slug: string) => void
}

export function ServiceStep({ onServiceSelect }: ServiceStepProps) {
  const currentService = useFlowService()
  const { setServiceSlug, nextStep } = useFlowStore()

  const handleSelect = (slug: string) => {
    setServiceSlug(slug)
    onServiceSelect?.(slug)
    
    // Auto-advance after brief delay
    setTimeout(() => {
      nextStep()
    }, 200)
  }

  return (
    <FlowContent
      title="What do you need today?"
      description="Select a service to get started. All consultations are reviewed by Australian-registered doctors."
    >
      <motion.div
        className="grid gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {services.map((service) => {
          const Icon = service.icon
          const isSelected = currentService === service.slug

          return (
            <motion.button
              key={service.slug}
              variants={itemVariants}
              onClick={() => handleSelect(service.slug)}
              className={cn(
                'relative text-left w-full rounded-xl border-2 p-4 sm:p-5 transition-all duration-200',
                'hover:shadow-lg hover:border-emerald-300',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              {/* Popular badge */}
              {service.popular && (
                <span className="absolute -top-2.5 right-4 bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Popular
                </span>
              )}

              <div className="flex gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-emerald-500' : 'bg-slate-100'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6',
                      isSelected ? 'text-white' : 'text-slate-500'
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{service.name}</h3>
                    <span className="text-lg font-bold text-slate-900">{service.price}</span>
                  </div>

                  <p className="text-sm text-slate-600 mb-3">{service.description}</p>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {service.time}
                    </span>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                          isSelected
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        <Check className="w-3 h-3" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Selection indicator / Arrow */}
                <div className="flex-shrink-0 self-center">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <ArrowRight className="w-5 h-5 text-slate-300" />
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Help text */}
      <p className="mt-6 text-center text-sm text-slate-400">
        Not sure?{' '}
        <a href="/faq" className="text-emerald-600 hover:underline">
          See how it works
        </a>
      </p>
    </FlowContent>
  )
}

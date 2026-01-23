'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Pill, Stethoscope, Scale, User, Clock, Check, ArrowRight, ChevronDown, AlertCircle } from 'lucide-react'
import { FlowContent } from '../flow-content'
import { useFlowStore, useFlowService, serviceCategories } from '@/lib/flow'
import { cn } from '@/lib/utils'
import posthog from 'posthog-js'

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  FileText,
  Pill,
  Stethoscope,
  Scale,
  User,
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 25 },
  },
}

interface ServiceStepProps {
  onServiceSelect?: (slug: string) => void
}

export function ServiceStep({ onServiceSelect }: ServiceStepProps) {
  const [showScope, setShowScope] = useState(false)
  const currentService = useFlowService()
  const { setServiceSlug, nextStep } = useFlowStore()

  const handleSelect = (slug: string) => {
    const selectedService = serviceCategories.find(s => s.slug === slug)

    // Track service selection in PostHog
    posthog.capture('service_selected', {
      service_slug: slug,
      service_name: selectedService?.name,
      service_price: selectedService?.price,
      service_category: selectedService?.slug,
      is_popular: selectedService?.popular ?? false,
    })

    setServiceSlug(slug)
    onServiceSelect?.(slug)

    // Auto-advance after brief delay
    setTimeout(() => {
      nextStep()
    }, 150)
  }

  return (
    <FlowContent
      title="What do you need today?"
      description="Select a service to get started. All consultations are reviewed by Australian-registered doctors."
    >
      <motion.div
        className="grid gap-3 sm:gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {serviceCategories.map((service) => {
          const Icon = ICONS[service.icon] || FileText
          const isSelected = currentService === service.slug

          return (
            <motion.button
              key={service.slug}
              variants={itemVariants}
              onClick={() => handleSelect(service.slug)}
              className={cn(
                'relative text-left w-full rounded-xl border-2 p-4 transition-all duration-200',
                'hover:shadow-lg hover:border-emerald-300',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/10'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              {/* Popular badge */}
              {service.popular && (
                <span className="absolute -top-2 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Popular
                </span>
              )}

              <div className="flex gap-3 sm:gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-emerald-500' : 'bg-slate-100'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 sm:w-6 sm:h-6',
                      isSelected ? 'text-white' : 'text-slate-500'
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{service.name}</h3>
                    <span className="text-base sm:text-lg font-bold text-slate-900 whitespace-nowrap">{service.price}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 mb-2">{service.description}</p>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-[10px] sm:text-xs text-slate-500 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {service.time}
                    </span>
                  </div>

                  {/* Features - hidden on mobile, shown on desktop */}
                  <div className="hidden sm:flex flex-wrap gap-1.5">
                    {service.features.slice(0, 3).map((feature, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full',
                          isSelected
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        <Check className="w-2.5 h-2.5" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Selection indicator / Arrow */}
                <div className="shrink-0 self-center">
                  {isSelected ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  ) : (
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Service scope disclosure */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowScope(!showScope)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/50 transition-colors"
        >
          <span className="text-xs sm:text-sm font-medium text-slate-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            What we can and can&apos;t help with
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 text-slate-400 transition-transform",
            showScope && "rotate-180"
          )} />
        </button>
        
        <AnimatePresence>
          {showScope && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 text-xs sm:text-sm">
                <div>
                  <p className="font-medium text-emerald-700 mb-1">✓ We can help with:</p>
                  <ul className="text-slate-600 space-y-0.5 ml-4">
                    <li>• Medical certificates for work, study, or carer&apos;s leave</li>
                    <li>• Repeat prescriptions for medications you already take</li>
                    <li>• Common conditions like UTIs, skin issues, cold &amp; flu</li>
                    <li>• Men&apos;s and women&apos;s health consultations</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-red-700 mb-1">✗ We cannot help with:</p>
                  <ul className="text-slate-600 space-y-0.5 ml-4">
                    <li>• Emergency or life-threatening symptoms</li>
                    <li>• Controlled substances (Schedule 8 medications)</li>
                    <li>• Complex chronic disease management</li>
                    <li>• Conditions requiring physical examination</li>
                  </ul>
                </div>
                <p className="text-slate-500 italic pt-1">
                  If unsure, continue — our doctors will guide you to the right care.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help text */}
      <p className="mt-4 text-center text-xs sm:text-sm text-slate-400">
        Not sure?{' '}
        <a href="/faq" className="text-emerald-600 hover:underline">
          See how it works
        </a>
      </p>
    </FlowContent>
  )
}

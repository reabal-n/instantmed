'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { FileText, Pill, Stethoscope, Scale, User, Clock, Check, ArrowRight, ChevronDown, AlertCircle } from 'lucide-react'
import { FlowContent } from '../flow-content'
import { useFlowStore, useFlowService, serviceCategories } from '@/lib/flow'
import { cn } from '@/lib/utils'

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  FileText,
  Pill,
  Stethoscope,
  Scale,
  User,
}

function getContainerVariants(reduced: boolean | null) {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: reduced ? 0 : 0.06 },
    },
  }
}

function getItemVariants(reduced: boolean | null) {
  return {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduced
        ? { duration: 0 }
        : { duration: 0.3, ease: 'easeOut' as const },
    },
  }
}

interface ServiceStepProps {
  onServiceSelect?: (slug: string) => void
}

export function ServiceStep({ onServiceSelect }: ServiceStepProps) {
  const prefersReducedMotion = useReducedMotion()
  const [showScope, setShowScope] = useState(false)
  const currentService = useFlowService()
  const { setServiceSlug, nextStep } = useFlowStore()

  const handleSelect = (slug: string) => {
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
        variants={getContainerVariants(prefersReducedMotion)}
        initial="hidden"
        animate="visible"
      >
        {serviceCategories.map((service) => {
          const Icon = ICONS[service.icon] || FileText
          const isSelected = currentService === service.slug

          return (
            <motion.button
              key={service.slug}
              variants={getItemVariants(prefersReducedMotion)}
              onClick={() => handleSelect(service.slug)}
              className={cn(
                'relative text-left w-full rounded-xl border-2 p-4 transition-all duration-200',
                'hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-600',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                  : 'border-border bg-white dark:bg-white/5 dark:border-white/10 hover:bg-muted/50 dark:hover:bg-white/10'
              )}
            >
              {/* Popular badge */}
              {service.popular && (
                <span className="absolute -top-2 right-3 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Popular
                </span>
              )}

              <div className="flex gap-3 sm:gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    'shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-emerald-500' : 'bg-muted'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 sm:w-6 sm:h-6',
                      isSelected ? 'text-white' : 'text-muted-foreground'
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">{service.name}</h3>
                    <span className="text-base sm:text-lg font-semibold text-foreground whitespace-nowrap">{service.price}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">{service.description}</p>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-xs text-muted-foreground mb-2">
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
                          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                          isSelected
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
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
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Service scope disclosure */}
      <div className="mt-5 rounded-xl border border-border bg-muted/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowScope(!showScope)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
        >
          <span className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground/60" />
            What we can and can&apos;t help with
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground/60 transition-transform",
            showScope && "rotate-180"
          )} />
        </button>
        
        <AnimatePresence>
          {showScope && (
            <motion.div
              initial={prefersReducedMotion ? {} : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 text-xs sm:text-sm">
                <div>
                  <p className="font-medium text-emerald-700 mb-1">✓ We can help with:</p>
                  <ul className="text-muted-foreground space-y-0.5 ml-4">
                    <li>• Medical certificates for work, study, or carer&apos;s leave</li>
                    <li>• Repeat prescriptions for medications you already take</li>
                    <li>• Common conditions like UTIs, skin issues, cold &amp; flu</li>
                    <li>• Men&apos;s and women&apos;s health consultations</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-red-700 mb-1">✗ We cannot help with:</p>
                  <ul className="text-muted-foreground space-y-0.5 ml-4">
                    <li>• Emergency or life-threatening symptoms</li>
                    <li>• Controlled substances (Schedule 8 medications)</li>
                    <li>• Complex chronic disease management</li>
                    <li>• Conditions requiring physical examination</li>
                  </ul>
                </div>
                <p className="text-muted-foreground italic pt-1">
                  If unsure, continue — our doctors will guide you to the right care.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help text */}
      <p className="mt-4 text-center text-xs sm:text-sm text-muted-foreground/60">
        Not sure?{' '}
        <a href="/faq" className="text-emerald-600 hover:underline">
          See how it works
        </a>
      </p>
    </FlowContent>
  )
}

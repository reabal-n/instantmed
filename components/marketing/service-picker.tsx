'use client'

import Link from 'next/link'
import { ArrowRight, Clock, PhoneOff, Check, ShieldCheck, Stethoscope, Star } from 'lucide-react'
import useSWR from 'swr'
import { serviceCategories } from '@/lib/marketing/homepage'

const pricingFetcher = (url: string) => fetch(url).then(r => r.json())

import { motion, useReducedMotion } from 'framer-motion'
import { Separator } from '@/components/ui/separator'
import { DocumentPremium, PillPremium, StethoscopePremium, SparklesPremium } from '@/components/icons/certification-logos'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AnimatedText } from '@/components/ui/animated-underline-text-one'

const iconMap = {
  FileText: DocumentPremium,
  Pill: PillPremium,
  Stethoscope: StethoscopePremium,
}

const colorConfig: Record<string, { 
  gradient: string
  accent: string
  light: string
  chipColor: "primary" | "secondary" | "success" | "warning" | "danger" 
}> = {
  emerald: { 
    gradient: 'from-emerald-400 to-teal-500',
    accent: '#059669', 
    light: 'rgba(5, 150, 105, 0.08)', 
    chipColor: 'success' 
  },
  cyan: { 
    gradient: 'from-cyan-400 to-blue-500',
    accent: '#0891b2', 
    light: 'rgba(8, 145, 178, 0.08)', 
    chipColor: 'primary' 
  },
  blue: {
    gradient: 'from-blue-400 to-sky-500',
    accent: '#3B82F6',
    light: 'rgba(59, 130, 246, 0.08)',
    chipColor: 'primary'
  },
}

// Service metadata for additional info
const serviceMetadata: Record<string, { time: string; callNote: string; gpCompare: string }> = {
  'med-cert': { time: 'GP reviewed', callNote: 'No call needed', gpCompare: '60–90' },
  'scripts': { time: 'GP reviewed', callNote: 'No call needed', gpCompare: '60–90' },
  'consult': { time: 'GP reviewed', callNote: 'May include a call', gpCompare: '80–120' },
}

// Static trust signals (replaces fake live stats)
const trustSignals = [
  { icon: Stethoscope, text: 'Australian GP-reviewed' },
  { icon: Clock, text: 'Same-day turnaround' },
  { icon: ShieldCheck, text: 'Full refund guarantee' },
]

function useServicePickerVariants() {
  const prefersReducedMotion = useReducedMotion()

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.12 },
    },
  }

  const itemVariants = prefersReducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }

  return { containerVariants, itemVariants, prefersReducedMotion }
}

export function ServicePicker() {
  const { containerVariants, itemVariants, prefersReducedMotion } = useServicePickerVariants()

  // Fetch live pricing from services table, fall back to static prices
  const { data: pricingData } = useSWR<{ prices: Record<string, number> }>(
    '/api/services/pricing',
    pricingFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )
  const livePrices = pricingData?.prices || {}

  return (
    <section id="pricing" className="relative py-12 lg:py-16 scroll-mt-20">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-8"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6 interactive-pill cursor-default"
            whileHover={prefersReducedMotion ? undefined : { y: -2 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <SparklesPremium className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground/80 dark:text-foreground">Pick what you need</span>
          </motion.div>
          
          <div className="mb-4">
            <AnimatedText
              text="What are you here for?"
              textClassName="text-3xl sm:text-4xl lg:text-4xl font-bold text-foreground tracking-tight"
              underlineClassName="text-primary"
              underlinePath="M 0,10 Q 100,0 200,10 Q 300,20 400,10"
              underlineHoverPath="M 0,10 Q 100,20 200,10 Q 300,0 400,10"
              underlineDuration={1.2}
            />
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
            Flat pricing. No hidden fees. Pay only after a real GP reviews your request.
          </p>
          
          {/* Trust Signals */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-6"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
            {trustSignals.map((signal) => (
              <div key={signal.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <signal.icon className="w-3.5 h-3.5 text-primary" />
                <span>{signal.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Service Cards Grid */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {serviceCategories.map((service) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap] || DocumentPremium
            const colors = colorConfig[service.color as keyof typeof colorConfig] || colorConfig.emerald
            const meta = serviceMetadata[service.id] || { time: '~15 min', needsCall: false }
            // Use live price if available, fall back to static
            const displayPrice = livePrices[service.id] ?? service.priceFrom
            
            return (
              <motion.div key={service.id} variants={itemVariants}>
                <Link
                  href={service.href || `/${service.slug}/request`}
                  className="group block h-full"
                >
                  <div className="relative h-full">
                    {/* Most common badge */}
                    {service.popular && (
                      <div className="absolute -top-3 right-4 z-20">
                        <div className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold">
                          Most common
                        </div>
                      </div>
                    )}
                    
                    {/* Clean card - Glass style */}
                    <div className={cn(
                      "relative h-full rounded-xl overflow-hidden flex flex-col",
                      "bg-card/80",
                      "border border-border/50 dark:border-white/15",
                      "backdrop-blur-xl",
                      "shadow-sm dark:shadow-none",
                      "hover:shadow-lg hover:border-primary/20 dark:hover:border-primary/30",
                      "transition-all duration-300",
                      // Elevate popular card
                      service.popular && [
                        "ring-1 ring-primary/20 dark:ring-primary/30",
                        "shadow-md dark:shadow-primary/5",
                      ]
                    )}>
                      
                      <div className="p-3 pb-2.5 flex-1 flex flex-col">
                        {/* Icon with animated background */}
                        <motion.div 
                          className="relative w-9 h-9 rounded-lg flex items-center justify-center mb-2 overflow-hidden icon-spin-hover"
                          style={{ backgroundColor: colors.light }}
                        >
                          <motion.div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{ 
                              background: `radial-gradient(circle at center, ${colors.accent}30 0%, transparent 70%)` 
                            }}
                          />
                          <Icon className="w-5 h-5 relative z-10" style={{ color: colors.accent }} />
                        </motion.div>
                        
                        {/* #3: Benefit question above title */}
                        {'benefitQuestion' in service && service.benefitQuestion && (
                          <p className="text-xs font-medium text-primary mb-0.5">
                            {service.benefitQuestion}
                          </p>
                        )}
                        
                        {/* Title */}
                        <h3 className="text-base font-semibold text-foreground mb-0.5 group-hover:text-primary transition-colors duration-300">
                          {service.title}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-xs text-muted-foreground leading-tight mb-2">
                          {service.description}
                        </p>
                        
                        {/* Benefits list */}
                        {service.benefits && (
                          <ul className="space-y-1 mb-1 flex-1">
                            {service.benefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Meta info - #6: clearer time, #7: reframed call messaging */}
                        <div className="flex items-center gap-3 text-xs min-h-[18px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {meta.time}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <PhoneOff className="h-3 w-3 shrink-0" />
                            {meta.callNote}
                          </span>
                        </div>
                        
                        {/* Medicare note - only for prescriptions */}
                        {service.id === 'scripts' && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            PBS subsidies may apply at pharmacy
                          </p>
                        )}
                      </div>
                      
                      <Separator className="opacity-50" />
                      
                      <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
                        {/* Price */}
                        <div className="flex flex-col">
                          <span className="text-base font-semibold text-foreground">
                            From ${displayPrice.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Typically ${meta.gpCompare || '60–90'} at a GP
                          </span>
                        </div>
                        
                        <Button size="sm" className="gap-1">
                          {'cta' in service ? service.cta : 'Start request'}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* #5: Testimonial for popular card */}
                      {service.popular && 'testimonial' in service && service.testimonial && (
                        <div className="px-3 pb-2 pt-1 border-t border-border/30">
                          <div className="flex items-center gap-2 text-xs">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            <span className="text-muted-foreground italic">
                              &ldquo;{(service.testimonial as { quote: string; author: string }).quote}&rdquo;
                            </span>
                            <span className="text-muted-foreground/70 dark:text-muted-foreground">
                              — {(service.testimonial as { quote: string; author: string }).author}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Disclaimer for General Consult */}
                      {service.id === 'consult' && (
                        <p className="text-xs text-muted-foreground/70 dark:text-muted-foreground text-center px-3 pb-3">
                          For non-urgent concerns only — if it&apos;s an emergency, call 000.
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
        
        {/* Simple note */}
        <motion.p
          className="text-center text-xs text-muted-foreground mt-8"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.3 }}
        >
          Private service — no Medicare rebate, but PBS subsidies may still apply at the pharmacy 👍
        </motion.p>
      </div>
    </section>
  )
}

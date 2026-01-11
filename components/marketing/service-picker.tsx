'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Phone, PhoneOff, Check } from 'lucide-react'
import { serviceCategories } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'
import { Chip, Divider } from '@heroui/react'
import { DocumentPremium, PillPremium, StethoscopePremium, SparklesPremium } from '@/components/icons/certification-logos'
import { cn } from '@/lib/utils'
import { MagneticButton } from '@/components/effects/magnetic-button'
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
  violet: { 
    gradient: 'from-violet-400 to-purple-500',
    accent: '#7c3aed', 
    light: 'rgba(124, 58, 237, 0.08)', 
    chipColor: 'secondary' 
  },
}

// Service metadata for additional info
const serviceMetadata: Record<string, { time: string; needsCall: boolean }> = {
  'med-cert': { time: '~15 min', needsCall: false },
  'scripts': { time: '~15 min', needsCall: false },
  'consult': { time: '~30 min', needsCall: true },
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}

const itemVariants = {
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

export function ServicePicker() {
  return (
    <section id="pricing" className="relative py-12 lg:py-16 scroll-mt-20">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6 interactive-pill cursor-default"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <SparklesPremium className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground/80">Get started in minutes</span>
          </motion.div>
          
          <div className="mb-4">
            <AnimatedText
              text="What do you need today?"
              textClassName="text-3xl sm:text-4xl lg:text-4xl font-bold text-foreground tracking-tight"
              underlineClassName="text-primary"
              underlinePath="M 0,10 Q 100,0 200,10 Q 300,20 400,10"
              underlineHoverPath="M 0,10 Q 100,20 200,10 Q 300,0 400,10"
              underlineDuration={1.2}
            />
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Select a service to get started. All requests are reviewed by an Australian-registered doctor in under 30 mins.
          </p>
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
            
            return (
              <motion.div key={service.id} variants={itemVariants}>
                <Link
                  href={service.href || `/${service.slug}/request`}
                  className="group block h-full"
                >
                  <div className="relative h-full">
                    {/* Popular badge */}
                    {service.popular && (
                      <div className="absolute -top-3 right-4 z-20">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-600 text-white text-xs font-bold tracking-wide uppercase shadow-lg shadow-emerald-500/40 dark:shadow-emerald-600/30 backdrop-blur-sm border border-white/20"
                        >
                          Popular
                        </motion.div>
                      </div>
                    )}
                    
                    {/* Glassmorphic card */}
                    <div className={cn(
                      "relative h-full rounded-2xl overflow-hidden flex flex-col",
                      "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                      "border border-white/20 dark:border-white/10",
                      "shadow-lg shadow-black/5 dark:shadow-black/20",
                      "hover:bg-white/80 dark:hover:bg-white/10",
                      "hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30",
                      "transition-all duration-300",
                      "group-hover:-translate-y-0.5"
                    )}>
                      {/* Gradient header strip */}
                      <div className={`h-1 w-full bg-gradient-to-r ${colors.gradient}`} />
                      
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
                                <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Meta info */}
                        <div className="flex items-center gap-2 text-xs min-h-[18px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {meta.time}
                          </span>
                          <span className="flex items-center gap-1">
                            {meta.needsCall ? (
                              <>
                                <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">Quick call</span>
                              </>
                            ) : (
                              <>
                                <PhoneOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">Usually no call</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <Divider className="opacity-50" />
                      
                      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0">
                        <Chip 
                          color={colors.chipColor} 
                          variant="flat" 
                          size="sm"
                          classNames={{
                            base: "interactive-pill",
                            content: "font-medium"
                          }}
                        >
                          ${service.priceFrom.toFixed(2)}
                        </Chip>
                        
                        <MagneticButton>
                          <div
                            className={cn(
                              "relative overflow-hidden inline-flex items-center gap-1",
                              "px-3 py-1.5 rounded-lg",
                              "text-white text-xs font-bold",
                              "shadow-lg shadow-primary/40",
                              "hover:shadow-xl hover:shadow-primary/50",
                              "transition-all duration-300",
                              "cursor-pointer",
                              "glow-pulse",
                              "border border-white/20",
                              "backdrop-blur-sm"
                            )}
                            style={{
                              background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
                              boxShadow: `0 8px 24px -4px ${colors.accent}40, 0 4px 12px -2px ${colors.accent}30`,
                            }}
                          >
                            <span className="relative z-10 flex items-center gap-1">
                              Start now
                              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                            </span>
                            {/* Shimmer effect */}
                            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                            {/* Glow effect */}
                            <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" style={{ background: colors.accent }} />
                          </div>
                        </MagneticButton>
                      </div>
                      
                      {/* Disclaimer for General Consult */}
                      {service.id === 'consult' && (
                        <p className="text-[10px] text-muted-foreground/70 text-center px-3 pb-3">
                          Not suitable for emergencies or urgent care.
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

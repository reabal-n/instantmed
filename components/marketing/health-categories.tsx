'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock, PhoneOff, Phone } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { 
  MensHealthIcon, 
  WomensHealthIcon, 
  WeightLossIcon, 
  HairLossIcon, 
  ShieldPremiumAlt 
} from '@/components/icons/certification-logos'
import { cn } from '@/lib/utils'
import { MagneticButton } from '@/components/effects/magnetic-button'

const healthCategories = [
  {
    id: 'mens-health',
    title: "Men's Health",
    description: "ED treatment plans discreetly reviewed online.",
    Icon: MensHealthIcon,
    color: 'blue',
    href: '/mens-health',
    benefits: [
      "Discreet, private consultation",
      "No phone call required in most cases",
      "Evidence-based treatment options",
      "Fast doctor review"
    ],
  },
  {
    id: 'womens-health',
    title: "Women's Health",
    description: "UTI treatment, contraception, and morning-after pill requests.",
    Icon: WomensHealthIcon,
    color: 'pink',
    href: '/womens-health',
    benefits: [
      "Private, confidential consultations",
      "No phone call required",
      "Fast turnaround times"
    ],
  },
  {
    id: 'weight-loss',
    title: "Weight Loss",
    description: "Medical weight management programs, tailored to you.",
    Icon: WeightLossIcon,
    color: 'violet',
    href: '/weight-loss',
    benefits: [
      "Personalized programs",
      "Brief clinician call required",
      "Fast turnaround",
      "AHPRA registered doctors"
    ],
    metaTime: "~30 min",
    metaCall: "quick 2 min call",
    needsCall: true,
  },
  {
    id: 'hair-loss',
    title: "Hair Loss",
    description: "Proven treatments for hair regrowth.",
    Icon: HairLossIcon,
    color: 'teal',
    href: '/hair-loss',
    benefits: [
      "Evidence-based treatments",
      "No call required in most cases",
      "Fast turnaround",
      "AHPRA registered doctors"
    ],
  },
]

const colorConfig: Record<string, { 
  accent: string
  light: string
  gradient: string
  chipColor: "primary" | "secondary" | "success" | "warning" | "danger"
}> = {
  blue: { 
    accent: '#3B82F6', 
    light: 'rgba(59, 130, 246, 0.06)', 
    gradient: 'from-blue-400 to-indigo-500',
    chipColor: 'primary'
  },
  pink: { 
    accent: '#EC4899', 
    light: 'rgba(236, 72, 153, 0.06)', 
    gradient: 'from-pink-400 to-rose-500',
    chipColor: 'danger'
  },
  violet: { 
    accent: '#4f46e5', 
    light: 'rgba(139, 92, 246, 0.06)', 
    gradient: 'from-violet-400 to-purple-500',
    chipColor: 'secondary'
  },
  teal: { 
    accent: '#14B8A6', 
    light: 'rgba(20, 184, 166, 0.06)', 
    gradient: 'from-teal-400 to-cyan-500',
    chipColor: 'success'
  },
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function HealthCategories() {
  return (
    <section className="relative py-12 lg:py-16 bg-content2/30">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6 interactive-pill cursor-default">
            <ShieldPremiumAlt className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">Discreet consultations</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Specialized Health Services
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Clinician review usually completed within ~15 minutes for eligible patients. Most services do not require a phone call.
          </p>
        </motion.div>

        {/* Health Category Cards */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-stretch"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {healthCategories.map((category) => {
            const Icon = category.Icon
            const colors = colorConfig[category.color]
            
            return (
              <motion.div key={category.id} variants={itemVariants} className="w-full">
                <Link href={category.href} className="group block h-full">
                  <div className={cn(
                    "relative h-full min-h-[280px] rounded-2xl overflow-hidden flex flex-col",
                    "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                    "border border-white/20 dark:border-white/10",
                    "shadow-lg shadow-black/5 dark:shadow-black/20",
                    "hover:bg-white/80 dark:hover:bg-white/10",
                    "hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30",
                    "transition-all duration-300",
                    "group-hover:scale-[1.02]"
                  )}>
                    {/* Gradient header strip */}
                    <div className={`h-1 w-full bg-linear-to-r ${colors.gradient}`} />
                    
                    <div className="p-3 pb-2.5 flex-1 flex flex-col">
                      {/* Icon with animated background */}
                      <motion.div 
                        className="relative w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 overflow-hidden icon-spin-hover"
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
                      <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors duration-300">
                        {category.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-tight mb-2">
                        {category.description}
                      </p>
                      
                      {/* Benefits list */}
                      {category.benefits && (
                        <ul className="space-y-1 mb-2 flex-1">
                          {category.benefits.slice(0, 3).map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Check className="h-2.5 w-2.5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {/* Meta info */}
                      <div className="flex items-center gap-2 text-xs mt-auto">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {category.metaTime || "~15 min"}
                        </span>
                        <span className="flex items-center gap-1">
                          {category.needsCall ? (
                            <>
                              <Phone className="h-2.5 w-2.5 text-primary dark:text-primary" />
                              <span className="text-primary dark:text-primary font-medium">{category.metaCall || "Quick call"}</span>
                            </>
                          ) : (
                            <>
                              <PhoneOff className="h-2.5 w-2.5 text-emerald-500 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">No call</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <Separator className="opacity-50" />
                    
                    <div className="px-3 py-2.5 shrink-0">
                      <MagneticButton>
                        <div
                          className={cn(
                            "relative overflow-hidden inline-flex items-center gap-1",
                            "px-3 py-1.5 rounded-lg",
                            "text-white text-xs font-bold",
                            "shadow-lg shadow-primary/30",
                            "hover:shadow-xl hover:shadow-primary/40",
                            "transition-all duration-300",
                            "cursor-pointer",
                            "glow-pulse",
                            "border border-white/20",
                            "backdrop-blur-sm",
                            "w-full justify-center"
                          )}
                          style={{
                            background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accent}cc 100%)`,
                            boxShadow: `0 8px 24px -4px ${colors.accent}40, 0 4px 12px -2px ${colors.accent}30`,
                          }}
                        >
                          <span className="relative z-10 flex items-center gap-1">
                            Learn more
                            <ArrowRight className="h-2.5 w-2.5 transition-transform duration-300 group-hover:translate-x-1" />
                          </span>
                          {/* Shimmer effect */}
                          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-linear-to-r from-transparent via-white/30 to-transparent" />
                          {/* Glow effect */}
                          <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" style={{ background: colors.accent }} />
                        </div>
                      </MagneticButton>
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

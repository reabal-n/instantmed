'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock, PhoneOff } from 'lucide-react'
import { Card, CardBody, CardFooter, Divider } from '@heroui/react'
import { 
  MensHealthIcon, 
  WomensHealthIcon, 
  WeightLossIcon, 
  HairLossIcon, 
  PerformanceAnxietyIcon,
  ShieldPremiumAlt 
} from '@/components/icons/certification-logos'
import { cn } from '@/lib/utils'
import { MagneticButton } from '@/components/effects/magnetic-button'

const healthCategories = [
  {
    id: 'mens-health',
    title: "Men's Health",
    description: "ED treatment, hair loss. Discreet, no call.",
    Icon: MensHealthIcon,
    color: 'blue',
    href: '/mens-health',
    benefits: [
      "Discreet consultations",
      "No call required",
      "Fast turnaround",
      "AHPRA registered doctors"
    ],
  },
  {
    id: 'womens-health',
    title: "Women's Health",
    description: "UTI, contraception, morning-after pill.",
    Icon: WomensHealthIcon,
    color: 'pink',
    href: '/womens-health',
    benefits: [
      "Private consultations",
      "No call required",
      "Fast turnaround",
      "AHPRA registered doctors"
    ],
  },
  {
    id: 'weight-loss',
    title: "Weight Loss",
    description: "Medical weight management programs.",
    Icon: WeightLossIcon,
    color: 'violet',
    href: '/weight-loss',
    benefits: [
      "Personalized programs",
      "No call required",
      "Fast turnaround",
      "AHPRA registered doctors"
    ],
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
      "No call required",
      "Fast turnaround",
      "AHPRA registered doctors"
    ],
  },
  {
    id: 'performance-anxiety',
    title: "Performance Anxiety",
    description: "Stage fright, public speaking, interviews.",
    Icon: PerformanceAnxietyIcon,
    color: 'indigo',
    href: '/performance-anxiety',
    benefits: [
      "Discreet consultations",
      "No call required",
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
  indigo: { 
    accent: '#6366F1', 
    light: 'rgba(99, 102, 241, 0.06)', 
    gradient: 'from-indigo-400 to-violet-500',
    chipColor: 'primary'
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
    <section className="relative py-16 lg:py-20 bg-content2/30">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-12"
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
          <p className="text-muted-foreground max-w-xl mx-auto">
            Script in 15 minutes. No phone call required for most services.
          </p>
        </motion.div>

        {/* Health Category Cards */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {healthCategories.map((category) => {
            const Icon = category.Icon
            const colors = colorConfig[category.color]
            
            return (
              <motion.div key={category.id} variants={itemVariants}>
                <Link href={category.href} className="group block h-full">
                  <div className={cn(
                    "relative h-full rounded-2xl overflow-hidden",
                    "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
                    "border border-white/20 dark:border-white/10",
                    "shadow-lg shadow-black/5 dark:shadow-black/20",
                    "hover:bg-white/80 dark:hover:bg-white/10",
                    "hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30",
                    "transition-all duration-300",
                    "group-hover:scale-[1.02]"
                  )}>
                    {/* Gradient header strip */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${colors.gradient}`} />
                    
                    <div className="p-5 pb-4">
                      {/* Icon with animated background */}
                      <motion.div 
                        className="relative w-12 h-12 rounded-2xl flex items-center justify-center mb-4 overflow-hidden icon-spin-hover"
                        style={{ backgroundColor: colors.light }}
                      >
                        <motion.div
                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ 
                            background: `radial-gradient(circle at center, ${colors.accent}30 0%, transparent 70%)` 
                          }}
                        />
                        <Icon className="w-6 h-6 relative z-10" style={{ color: colors.accent }} />
                      </motion.div>
                      
                      {/* Title */}
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                        {category.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        {category.description}
                      </p>
                      
                      {/* Benefits list */}
                      {category.benefits && (
                        <ul className="space-y-1.5 mb-4">
                          {category.benefits.slice(0, 3).map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-[10px] text-muted-foreground">
                              <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      
                      {/* Meta info */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          ~15 min
                        </span>
                        <span className="flex items-center gap-1">
                          <PhoneOff className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">No call</span>
                        </span>
                      </div>
                    </div>
                    
                    <Divider className="opacity-50" />
                    
                    <div className="px-5 py-4">
                      <MagneticButton>
                        <div
                          className={cn(
                            "relative overflow-hidden inline-flex items-center gap-1.5",
                            "px-4 py-2 rounded-xl",
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
                          <span className="relative z-10 flex items-center gap-1.5">
                            Learn more
                            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
                          </span>
                          {/* Shimmer effect */}
                          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent" />
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

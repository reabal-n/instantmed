'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Card, CardBody, CardFooter, Chip } from '@heroui/react'
import { SpotlightReveal, NeonGlow } from '@/components/ui/glowing-effect'
import { GlowCard } from '@/components/ui/spotlight-card'
import { 
  MensHealthIcon, 
  WomensHealthIcon, 
  WeightLossIcon, 
  HairLossIcon, 
  PerformanceAnxietyIcon,
  ShieldPremiumAlt 
} from '@/components/icons/certification-logos'

const healthCategories = [
  {
    id: 'mens-health',
    title: "Men's Health",
    description: "ED treatment, hair loss. Discreet, no call.",
    Icon: MensHealthIcon,
    color: 'blue',
    href: '/mens-health',
    treatments: ['Sildenafil', 'Tadalafil'],
  },
  {
    id: 'womens-health',
    title: "Women's Health",
    description: "UTI, contraception, morning-after pill.",
    Icon: WomensHealthIcon,
    color: 'pink',
    href: '/womens-health',
    treatments: ['UTI', 'Birth control'],
  },
  {
    id: 'weight-loss',
    title: "Weight Loss",
    description: "Medical weight management programs.",
    Icon: WeightLossIcon,
    color: 'violet',
    href: '/weight-loss',
    treatments: ['GLP-1', 'Duromine'],
  },
  {
    id: 'hair-loss',
    title: "Hair Loss",
    description: "Proven treatments for hair regrowth.",
    Icon: HairLossIcon,
    color: 'teal',
    href: '/hair-loss',
    treatments: ['Finasteride', 'Minoxidil'],
  },
  {
    id: 'performance-anxiety',
    title: "Performance Anxiety",
    description: "Stage fright, public speaking, interviews.",
    Icon: PerformanceAnxietyIcon,
    color: 'indigo',
    href: '/performance-anxiety',
    treatments: ['Propranolol'],
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
                  <GlowCard
                    glowColor={category.color === 'blue' ? 'blue' : category.color === 'pink' ? 'red' : category.color === 'violet' ? 'purple' : category.color === 'teal' ? 'green' : 'purple'}
                    customSize={true}
                    className="h-full w-full"
                  >
                    <Card 
                      isHoverable
                      isPressable
                      className="h-full bg-content1 border border-divider overflow-hidden hover:border-transparent"
                      shadow="sm"
                    >
                        <CardBody className="p-0">
                          {/* Gradient strip */}
                          <div className={`h-1 w-full bg-linear-to-r ${colors.gradient}`} />
                          
                          <div className="p-4 flex flex-col gap-3">
                            {/* Icon */}
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center icon-spin-hover"
                              style={{ backgroundColor: colors.light }}
                            >
                              <Icon className="h-5 w-5" style={{ color: colors.accent }} />
                            </div>
                            
                            {/* Title */}
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {category.title}
                            </h3>
                            
                            {/* Description */}
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {category.description}
                            </p>

                            {/* Treatment chips */}
                            <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
                              {category.treatments.map((treatment) => (
                                <Chip
                                  key={treatment}
                                  size="sm"
                                  variant="flat"
                                  color={colors.chipColor}
                                  classNames={{
                                    base: "h-5 interactive-pill",
                                    content: "text-[10px] font-medium px-1.5"
                                  }}
                                >
                                  {treatment}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        </CardBody>
                        
                        <CardFooter className="px-4 pb-4 pt-0">
                          <motion.div 
                            className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors"
                            whileHover={{ x: 2 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <span>Learn more</span>
                            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                          </motion.div>
                        </CardFooter>
                      </Card>
                    </GlowCard>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

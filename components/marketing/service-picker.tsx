'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Phone, PhoneOff } from 'lucide-react'
import { serviceCategories } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'
import { Card, CardBody, CardFooter, Chip, Divider } from '@heroui/react'
import { DocumentPremium, PillPremium, StethoscopePremium, SparklesPremium } from '@/components/icons/certification-logos'
import { GradientBorderChase, MagneticCard } from '@/components/ui/glowing-effect'
import { GlowCard } from '@/components/ui/spotlight-card'

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
    <section className="relative py-20 lg:py-28">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6 interactive-pill cursor-default"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <SparklesPremium className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">Get started in minutes</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
            What do you need today?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select a service to get started. Most requests reviewed within an hour.
          </p>
        </motion.div>

        {/* Service Cards Grid */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
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
                  <GlowCard
                    glowColor={service.color === 'emerald' ? 'green' : service.color === 'cyan' ? 'blue' : 'purple'}
                    customSize={true}
                    className="h-full w-full"
                  >
                    <Card 
                      isHoverable
                      isPressable
                      className="h-full bg-content1 border-0 overflow-hidden"
                      shadow="sm"
                    >
                    <CardBody className="p-0">
                      {/* Gradient header strip */}
                      <div className={`h-1.5 w-full bg-linear-to-r ${colors.gradient}`} />
                      
                      <div className="p-6 pb-4">
                        {/* Icon with animated background */}
                        <motion.div 
                          className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-5 overflow-hidden icon-spin-hover"
                          style={{ backgroundColor: colors.light }}
                        >
                          <motion.div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{ 
                              background: `radial-gradient(circle at center, ${colors.accent}30 0%, transparent 70%)` 
                            }}
                          />
                          <Icon className="w-8 h-8 relative z-10" style={{ color: colors.accent }} />
                        </motion.div>
                        
                        {/* Title */}
                        <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                          {service.title}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                          {service.description}
                        </p>
                        
                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {meta.time}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {meta.needsCall ? (
                              <>
                                <Phone className="h-3.5 w-3.5" />
                                Quick call
                              </>
                            ) : (
                              <>
                                <PhoneOff className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400">No call needed</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                    
                    <Divider />
                    
                    <CardFooter className="flex items-center justify-between px-6 py-4">
                      <Chip 
                        color={colors.chipColor} 
                        variant="flat" 
                        size="sm"
                        classNames={{
                          base: "interactive-pill",
                          content: "font-medium"
                        }}
                      >
                        From ${service.priceFrom.toFixed(2)}
                      </Chip>
                      
                      <motion.div 
                        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors duration-300"
                        whileHover={{ x: 4 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        Start now
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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

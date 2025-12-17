'use client'

import Link from 'next/link'
import { FileText, Pill, ArrowRight, Stethoscope } from 'lucide-react'
import { serviceCategories } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'
import { Card, CardBody, CardFooter, Chip } from '@heroui/react'

const iconMap = {
  FileText,
  Pill,
  Stethoscope,
}

const colorConfig: Record<string, { accent: string; glow: string; chipColor: "primary" | "secondary" | "success" | "warning" | "danger" }> = {
  emerald: { accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.15)', chipColor: 'primary' },
  cyan: { accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.15)', chipColor: 'secondary' },
  violet: { accent: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.15)', chipColor: 'secondary' },
  blue: { accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.15)', chipColor: 'primary' },
  amber: { accent: '#a855f7', glow: 'rgba(168, 85, 247, 0.15)', chipColor: 'warning' },
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
}

export function ServicePicker() {
  return (
    <section className="relative py-16 lg:py-24">
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Chip color="primary" variant="flat" className="mb-4">
            Get started in minutes
          </Chip>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            What do you need today?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select a service to get started. Most requests are reviewed within an hour.
          </p>
        </motion.div>

        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {serviceCategories.map((service) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap] || FileText
            const colors = colorConfig[service.color as keyof typeof colorConfig] || colorConfig.emerald
            
            return (
              <motion.div key={service.id} variants={itemVariants}>
                <Link
                  href={service.href || `/${service.slug}/request`}
                  className="group block h-full"
                >
                  <Card 
                    isHoverable
                    isPressable
                    className="h-full bg-white/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-500/30 card-glow"
                    shadow="sm"
                  >
                    <CardBody className="flex flex-col items-center text-center p-8 gap-4">
                      {/* Icon */}
                      <motion.div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(145deg, ${colors.accent}25, ${colors.accent}10)`,
                          boxShadow: `inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px ${colors.accent}15`,
                        }}
                        whileHover={{ scale: 1.1, rotate: 3 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <Icon className="h-8 w-8" style={{ color: colors.accent }} />
                      </motion.div>
                      
                      <h3 className="font-heading text-xl font-semibold text-foreground">
                        {service.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {service.description}
                      </p>
                    </CardBody>
                    
                    <CardFooter className="flex items-center justify-between px-8 pb-6 pt-0">
                      <Chip 
                        color={colors.chipColor} 
                        variant="flat" 
                        size="sm"
                      >
                        From ${service.priceFrom.toFixed(2)}
                      </Chip>
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1"
                        style={{ 
                          background: `linear-gradient(135deg, ${colors.accent}20, ${colors.accent}10)`,
                        }}
                      >
                        <ArrowRight className="h-5 w-5" style={{ color: colors.accent }} />
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

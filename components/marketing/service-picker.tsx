'use client'

import Link from 'next/link'
import { FileText, Pill, ArrowRight } from 'lucide-react'
import { serviceCategories } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'

const iconMap = {
  FileText,
  Pill,
}

const colorConfig: Record<string, { accent: string; glow: string }> = {
  emerald: { accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.15)' },
  cyan: { accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.15)' },
  violet: { accent: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.15)' },
  blue: { accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.15)' },
  amber: { accent: '#a855f7', glow: 'rgba(168, 85, 247, 0.15)' },
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
    <section className="relative py-16 lg:py-24 bg-background">
      {/* Subtle gradient orbs */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[100px] opacity-50" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full blur-[80px] opacity-50" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            What do you need today?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select a service to get started. Most requests are reviewed within an hour.
          </p>
        </motion.div>

        <motion.div 
          className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto"
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
                  href={service.slug === 'medical-certificate' ? '/medical-certificate/new' : '/prescriptions/new'}
                  className="group block"
                >
                  <motion.div 
                    className="glass-card relative flex flex-col items-center text-center p-8 rounded-3xl overflow-hidden"
                    whileHover={{ 
                      y: -8,
                      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
                    }}
                  >
                    {/* Top accent line */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1 opacity-70 group-hover:opacity-100 transition-opacity"
                      style={{ background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)` }}
                    />
                    
                    {/* Outer glow on hover */}
                    <div
                      className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        boxShadow: `0 0 60px ${colors.glow}, 0 0 100px ${colors.glow}`,
                      }}
                    />
                    
                    {/* Icon */}
                    <motion.div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                      style={{ 
                        background: `linear-gradient(145deg, ${colors.accent}25, ${colors.accent}10)`,
                        boxShadow: `inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px ${colors.accent}15`,
                      }}
                      whileHover={{ scale: 1.1, rotate: 3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Icon className="h-8 w-8" style={{ color: colors.accent }} />
                    </motion.div>
                    
                    <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                      {service.title}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-xs">
                      {service.description}
                    </p>
                    
                    {/* Price and CTA */}
                    <div className="flex items-center gap-4">
                      <span 
                        className="text-lg font-bold"
                        style={{ color: colors.accent }}
                      >
                        From ${service.priceFrom.toFixed(2)}
                      </span>
                      <motion.div 
                        className="w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                        style={{ 
                          background: `linear-gradient(135deg, ${colors.accent}30, ${colors.accent}15)`,
                        }}
                        initial={{ x: -8 }}
                        whileHover={{ x: 0 }}
                      >
                        <ArrowRight className="h-5 w-5" style={{ color: colors.accent }} />
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

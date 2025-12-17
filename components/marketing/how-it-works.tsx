'use client'

import { ClipboardList, Stethoscope, FileCheck, Clock, CheckCircle, Zap } from 'lucide-react'
import { howItWorks } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'
import { Chip, Progress } from '@heroui/react'

const iconMap = {
  ClipboardList,
  Stethoscope,
  FileCheck,
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 scroll-mt-20 relative overflow-hidden">
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Chip 
            color="primary" 
            variant="flat" 
            className="mb-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 hover:bg-primary/20 group"
            startContent={<Zap className="w-4 h-4 group-hover:animate-pulse" />}
          >
            <span className="group-hover:tracking-wide transition-all duration-300">How it works</span>
          </Chip>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            From request to done in three steps
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No phone trees. No video calls. No leaving your couch. Just healthcare that works.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Steps */}
          <motion.div 
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {howItWorks.map((step, index) => {
              const Icon = iconMap[step.icon as keyof typeof iconMap]
              const isLast = index === howItWorks.length - 1
              
              return (
                <motion.div 
                  key={step.step} 
                  className="relative flex gap-5 group"
                  variants={itemVariants}
                >
                  {/* Connector line with gradient */}
                  {!isLast && (
                    <div className="absolute left-6 top-14 w-0.5 h-[calc(100%-1rem)] bg-gradient-to-b from-indigo-300 to-violet-200" />
                  )}
                  
                  {/* Step number */}
                  <div className="relative shrink-0">
                    <motion.div 
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center shadow-lg shadow-indigo-500/10 group-hover:shadow-indigo-500/20 transition-shadow"
                      whileHover={{ scale: 1.05, rotate: 3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Icon className="h-6 w-6 text-indigo-600" />
                    </motion.div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      {step.step}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="pt-1">
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-indigo-500 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Right: Visual representation */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative bg-white dark:bg-white/5 backdrop-blur-sm border border-slate-200 dark:border-white/10 rounded-3xl p-8 lg:p-12 shadow-lg">
              {/* Timeline visual */}
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-white/10 flex items-center justify-center border border-indigo-100 dark:border-white/20">
                    <ClipboardList className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-white/10 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                    <p className="font-medium text-foreground">Submit your request</p>
                    <p className="text-sm text-muted-foreground">2-3 minutes</p>
                  </div>
                </div>
                
                {/* Connector */}
                <div className="ml-7 w-0.5 h-4 bg-gradient-to-b from-indigo-300 to-violet-300" />
                
                {/* Step 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-white/10 flex items-center justify-center border border-indigo-100 dark:border-white/20">
                    <Stethoscope className="w-7 h-7 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-white/10 rounded-xl p-4 border border-slate-200 dark:border-white/10">
                    <p className="font-medium text-foreground">GP reviews</p>
                    <p className="text-sm text-muted-foreground">~45 minutes</p>
                  </div>
                </div>
                
                {/* Connector */}
                <div className="ml-7 w-0.5 h-4 bg-gradient-to-b from-violet-300 to-green-300" />
                
                {/* Step 3 */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-500/20 flex items-center justify-center border border-green-200 dark:border-green-500/30">
                    <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 bg-green-50 dark:bg-green-500/20 rounded-xl p-4 border border-green-200 dark:border-green-500/30">
                    <p className="font-medium text-green-500 dark:text-green-400">Done! Document ready</p>
                    <p className="text-sm text-muted-foreground">42 min total</p>
                  </div>
                </div>
              </div>
              
              {/* Floating time badge */}
              <motion.div 
                className="absolute -top-4 -right-4 bg-white dark:bg-indigo-500/20 backdrop-blur-sm rounded-2xl px-5 py-3 border border-indigo-200 dark:border-indigo-500/30 shadow-lg"
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-indigo-600 dark:text-indigo-300">&lt; 1 hour</span>
                </div>
              </motion.div>
              
              {/* Progress indicator */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Typical completion</span>
                  <span className="text-sm text-muted-foreground">42 min</span>
                </div>
                <Progress 
                  value={70} 
                  color="success"
                  size="sm"
                  className="max-w-full"
                  aria-label="Completion progress"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

'use client'

import Image from 'next/image'
import { ClipboardList, Stethoscope, FileCheck, Clock } from 'lucide-react'
import { howItWorks } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'

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
    <section id="how-it-works" className="py-20 lg:py-28 bg-background scroll-mt-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }} />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4">
            ✨ How it works
          </span>
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
                    <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-indigo-600 transition-colors">
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

          {/* Right: Image */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/10">
              <Image
                src="/doctor-video-call-telehealth.jpg"
                alt="Doctor reviewing patient request"
                width={600}
                height={450}
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent" />
            </div>
            
            {/* Floating stat card */}
            <motion.div 
              className="absolute -bottom-6 -left-6 bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-gray-100"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">&lt; 1 hr</p>
                  <p className="text-sm text-muted-foreground">typical review time</p>
                </div>
              </div>
            </motion.div>

            {/* Decorative gradient blob */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-indigo-200 to-violet-200 rounded-3xl -z-10 blur-sm" />
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full -z-10 blur-md" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

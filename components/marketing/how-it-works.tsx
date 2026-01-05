'use client'

import { ArrowRight } from 'lucide-react'
import { Card, CardBody, Progress, Button } from '@heroui/react'
import { howItWorks } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ClipboardListPremium, StethoscopePremium, FileCheckPremium, ZapPremium, ClockPremium } from '@/components/icons/certification-logos'

const iconMap = {
  ClipboardList: ClipboardListPremium,
  Stethoscope: StethoscopePremium,
  FileCheck: FileCheckPremium,
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 scroll-mt-20 relative overflow-hidden section-premium">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
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
            <ZapPremium className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">How it works</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight spacing-premium">
            Three steps. Done in minutes.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No phone trees. No waiting rooms. Just healthcare that works.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Steps */}
          <motion.div 
            className="space-y-6"
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
                  className="relative group"
                  variants={itemVariants}
                >
                  <Card
                    className="bg-content1 border border-divider card-3d card-shine"
                    shadow="sm"
                  >
                    <CardBody className="p-5">
                      <div className="flex gap-4">
                        {/* Step indicator */}
                        <div className="relative shrink-0">
                          <motion.div 
                            className="w-12 h-12 rounded-xl bg-linear-to-br from-primary/10 to-secondary/10 flex items-center justify-center border border-primary/10 icon-spin-hover"
                          >
                            <Icon className="h-6 w-6 text-primary" />
                          </motion.div>
                          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                            {step.step}
                          </span>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <h3 className="text-lg font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                            {step.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                  
                  {/* Connector */}
                  {!isLast && (
                    <div className="absolute left-[1.75rem] top-full w-0.5 h-6 bg-linear-to-b from-primary/30 to-transparent" />
                  )}
                </motion.div>
              )
            })}
            
            {/* CTA below steps */}
            <motion.div 
              className="pt-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <Button
                as={Link}
                href="/start"
                color="primary"
                size="lg"
                className="w-full sm:w-auto px-8"
                endContent={<ArrowRight className="h-4 w-4" />}
              >
                Start your request
              </Button>
            </motion.div>
          </motion.div>

          {/* Right: Visual card */}
          <motion.div 
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-content1 border border-divider overflow-hidden">
              <CardBody className="p-8">
                {/* Timeline visual */}
                <div className="space-y-5">
                  {/* Step 1 */}
                  <motion.div 
                    className="flex items-center gap-4"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <ClipboardListPremium className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 bg-content2 rounded-xl p-4">
                      <p className="font-medium text-foreground">Submit your request</p>
                      <p className="text-sm text-muted-foreground">2-3 minutes</p>
                    </div>
                  </motion.div>
                  
                  {/* Connector */}
                  <div className="ml-6 w-0.5 h-3 bg-linear-to-b from-primary/40 to-secondary/40" />
                  
                  {/* Step 2 */}
                  <motion.div 
                    className="flex items-center gap-4"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                      <StethoscopePremium className="w-6 h-6 text-secondary" />
                    </div>
                    <div className="flex-1 bg-content2 rounded-xl p-4">
                      <p className="font-medium text-foreground">Doctor reviews</p>
                      <p className="text-sm text-muted-foreground">~15 minutes</p>
                    </div>
                  </motion.div>
                  
                  {/* Connector */}
                  <div className="ml-6 w-0.5 h-3 bg-linear-to-b from-secondary/40 to-success/40" />
                  
                  {/* Step 3 */}
                  <motion.div 
                    className="flex items-center gap-4"
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center border border-success/20">
                      <FileCheckPremium className="w-6 h-6 text-success" />
                    </div>
                    <div className="flex-1 bg-success/10 rounded-xl p-4 border border-success/20">
                      <p className="font-medium text-success">Done! Document ready</p>
                      <p className="text-sm text-muted-foreground">Sent to your email</p>
                    </div>
                  </motion.div>
                </div>
                
                {/* Floating time badge */}
                <motion.div 
                  className="absolute -top-3 -right-3 bg-content1 rounded-2xl px-4 py-2.5 border border-divider shadow-xl"
                  whileHover={{ y: -2, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center gap-2">
                    <ClockPremium className="w-4 h-4 text-primary" />
                    <span className="font-bold text-primary">~15 min</span>
                  </div>
                </motion.div>
                
                {/* Progress indicator */}
                <div className="mt-8 pt-6 border-t border-divider">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">Typical completion</span>
                    <span className="text-sm text-primary font-medium">15-20 min</span>
                  </div>
                  <Progress 
                    value={85} 
                    color="success"
                    size="sm"
                    className="max-w-full"
                    aria-label="Completion progress"
                  />
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

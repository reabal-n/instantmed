'use client'

import { ArrowRight, ClipboardList, Stethoscope, FileCheck, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Link from 'next/link'

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Answer a few questions",
    description: "Tell us what's going on. Takes about 2 minutes.",
    time: "2 min",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    number: "02",
    icon: Stethoscope,
    title: "A doctor reviews it",
    description: "A real Australian GP looks at your request and makes the call.",
    time: "~1 hour",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/20",
  },
  {
    number: "03",
    icon: FileCheck,
    title: "Done",
    description: "Certificate to your inbox, eScript to your phone. That's it.",
    time: "Same day",
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 lg:py-20 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-4">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground/80">How it works</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Three steps. That&apos;s it.
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            No appointments, no phone tag. A registered GP reviews every request.
          </p>
        </motion.div>

        {/* Steps - Horizontal Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <div className={`relative h-full rounded-2xl border ${step.borderColor} ${step.bgColor} p-6 lg:p-8 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-none`}>
                {/* Step number */}
                <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full bg-linear-to-br ${step.color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${step.color} flex items-center justify-center mb-4 shadow-md`}>
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {step.description}
                </p>
                
                {/* Time badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10">
                  <span className="text-xs font-medium text-foreground">{step.time}</span>
                </div>
                
                {/* Connector line (not on last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 lg:-right-5 w-8 lg:w-10 h-0.5 bg-linear-to-r from-border to-transparent" />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Button
            asChild
            variant="default"
            size="lg"
            className="px-8 h-12 font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
          >
            <Link href="/request">
              Get started now <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            Most people are sorted in under an hour
          </p>
        </motion.div>
      </div>
    </section>
  )
}

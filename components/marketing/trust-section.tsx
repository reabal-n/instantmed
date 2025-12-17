'use client'

import { Shield, Award, Clock, Users, CheckCircle, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Chip, Tooltip } from '@heroui/react'

const trustBadges = [
  {
    icon: Shield,
    title: 'AHPRA Registered',
    description: 'All doctors are registered with AHPRA',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-500/20',
  },
  {
    icon: Award,
    title: 'TGA Compliant',
    description: 'Prescriptions meet TGA requirements',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-500/20',
  },
  {
    icon: Lock,
    title: 'Bank-Level Security',
    description: '256-bit encryption for all data',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
  },
  {
    icon: CheckCircle,
    title: 'Legally Valid',
    description: 'Documents accepted Australia-wide',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-500/20',
  },
]

const stats = [
  { value: '50,000+', label: 'Requests completed', icon: Users },
  { value: '<1 hour', label: 'Average turnaround', icon: Clock },
  { value: '98%', label: 'Approval rate', icon: CheckCircle },
  { value: '4.9★', label: 'Patient rating', icon: Award },
]

export function TrustSection() {
  return (
    <section className="py-16 lg:py-20 bg-slate-50 dark:bg-white/[0.02]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <Chip color="success" variant="flat" className="mb-4">
            Trusted by Australians
          </Chip>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Healthcare you can trust
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Real Australian GPs. Legitimate documents. Complete peace of mind.
          </p>
        </motion.div>

        {/* Badge grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {trustBadges.map((badge, index) => (
            <motion.div
              key={badge.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Tooltip content={badge.description} placement="bottom">
                <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:shadow-lg transition-all cursor-default">
                  <div className={`w-14 h-14 rounded-xl ${badge.bg} flex items-center justify-center mb-4`}>
                    <badge.icon className={`w-7 h-7 ${badge.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {badge.title}
                  </h3>
                </div>
              </Tooltip>
            </motion.div>
          ))}
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 py-8 px-6 lg:px-12 rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center text-white">
              <div className="text-2xl lg:text-3xl font-bold mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-white/80">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

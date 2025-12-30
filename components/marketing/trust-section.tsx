'use client'

import { Shield, Award, Clock, Users, CheckCircle, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { MorphingCardStack, type CardData } from '@/components/ui/morphing-card-stack'
import { SectionPill } from '@/components/ui/section-pill'

const trustCards: CardData[] = [
  {
    id: 'ahpra',
    title: 'AHPRA Registered',
    description: 'Every doctor on our platform is fully registered with the Australian Health Practitioner Regulation Agency. Your care is in qualified hands.',
    icon: <Shield className="w-6 h-6" />,
  },
  {
    id: 'tga',
    title: 'TGA Compliant',
    description: 'All prescriptions and treatments meet Therapeutic Goods Administration requirements. Safe, legal, and properly regulated healthcare.',
    icon: <Award className="w-6 h-6" />,
  },
  {
    id: 'security',
    title: 'Bank-Level Security',
    description: '256-bit encryption protects all your personal and medical data. Your privacy is our priority with enterprise-grade security.',
    icon: <Lock className="w-6 h-6" />,
  },
  {
    id: 'valid',
    title: 'Legally Valid',
    description: 'Medical certificates and prescriptions are accepted by employers, universities, and pharmacies Australia-wide. Legitimate documents every time.',
    icon: <CheckCircle className="w-6 h-6" />,
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
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <SectionPill 
            emoji="🛡️" 
            text="Trusted by Australians" 
            hoverText="50,000+ patients served"
            className="mb-4"
          />
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Healthcare you can trust
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Real Australian GPs. Legitimate documents. Complete peace of mind.
          </p>
        </motion.div>

        {/* Morphing Card Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <MorphingCardStack 
            cards={trustCards} 
            defaultLayout="stack"
            showLayoutToggle={true}
          />
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 py-8 px-6 lg:px-12 rounded-3xl bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600"
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

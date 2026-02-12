"use client"

import { CheckCircle2, Shield, Zap, Lock, Heart } from "lucide-react"
import { motion } from "framer-motion"

import { SecurityBadges } from "@/components/security/security-badges"
import { SectionPill } from "@/components/ui/section-pill"

const trustPoints = [
  {
    icon: Shield,
    title: "Real doctors",
    description: "Not bots, not overseas call centres. Actual AHPRA-registered Aussie GPs who know their stuff.",
    color: "#6366f1",
  },
  {
    icon: Zap,
    title: "Stupid fast",
    description: "Most requests done within an hour. Yes, really. We've timed it.",
    color: "#8b5cf6",
  },
  {
    icon: Lock,
    title: "No Medicare BS",
    description: "Flat fee, you know what you&apos;re paying. No surprise bills, no rebate paperwork.",
    color: "#a855f7",
  },
  {
    icon: Heart,
    title: "Medical-grade security",
    description:
      "Your health data is protected with AES-256 encryption and stored on Australian servers. Full compliance with the Privacy Act 1988.",
    color: "#c084fc",
  },
]

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

export function TrustSection() {
  return (
    <section className="px-4 py-16 sm:py-20 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[100px] opacity-20" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)' }} />
      
      <div className="relative mx-auto max-w-5xl">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex justify-center mb-4">
            <SectionPill emoji="🛡️" text="Why trust us" hoverText="Your safety first" />
          </div>
          <h2
            className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl mb-3 text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Why Aussies trust InstantMed
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            We built this because doctor waitlists are ridiculous and you shouldn&apos;t need to take a half-day off work for a
            script renewal.
          </p>
        </motion.div>

        <motion.div 
          className="grid gap-6 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {trustPoints.map((point) => (
            <motion.div key={point.title} variants={itemVariants}>
              <div className="flex gap-4 p-6 h-full bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                {/* Icon with gradient background */}
                <div
                  className="shrink-0 h-12 w-12 rounded-xl flex items-center justify-center backdrop-blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${point.color}20, ${point.color}10)`,
                    border: `1px solid ${point.color}30`,
                  }}
                >
                  <point.icon className="h-6 w-6" style={{ color: point.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                    <h3 className="font-semibold text-foreground">{point.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="mt-12 pt-12 border-t border-gray-200/50 dark:border-white/10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-center text-sm text-muted-foreground mb-6">Certified and compliant with</p>
          <SecurityBadges />
        </motion.div>
      </div>
    </section>
  )
}

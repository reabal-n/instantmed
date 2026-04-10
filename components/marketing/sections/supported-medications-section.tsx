"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  Heart,
  Droplets,
  Shield,
  Wind,
  Thermometer,
  Sun,
  Brain,
  Pill,
} from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const CATEGORIES = [
  {
    icon: Heart,
    name: "Blood pressure",
    examples: "Amlodipine, Ramipril, Perindopril",
  },
  {
    icon: Droplets,
    name: "Cholesterol",
    examples: "Atorvastatin, Rosuvastatin",
  },
  {
    icon: Shield,
    name: "Contraceptives",
    examples: "Combined pill, mini pill",
  },
  {
    icon: Wind,
    name: "Asthma & COPD",
    examples: "Ventolin, Seretide, Symbicort",
  },
  {
    icon: Thermometer,
    name: "Reflux & gut",
    examples: "Omeprazole, Pantoprazole, Esomeprazole",
  },
  {
    icon: Sun,
    name: "Skin conditions",
    examples: "Topical steroids, tretinoin",
  },
  {
    icon: Brain,
    name: "Thyroid",
    examples: "Levothyroxine, Thyroxine",
  },
  {
    icon: Pill,
    name: "Other regular meds",
    examples: "Antihistamines, iron, metformin",
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Medication categories grid — shows common renewals we support */
export function SupportedMedicationsSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Supported medications" className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            Common medications we can renew
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            For medications you already take. If your medication isn&apos;t
            listed, submit a request and the doctor will let you know.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, index) => (
            <motion.div
              key={cat.name}
              className="rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none p-4"
              initial={animate ? { y: 20 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <cat.icon className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground mb-1">
                {cat.name}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {cat.examples}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

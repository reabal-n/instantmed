"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Stethoscope, Smartphone, ShoppingBag } from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const STEPS = [
  {
    icon: Stethoscope,
    title: "Doctor approves",
    description:
      "An AHPRA-registered GP reviews your request and confirms it\u2019s safe to continue your medication.",
  },
  {
    icon: Smartphone,
    title: "eScript sent via SMS",
    description:
      "A digital prescription token is sent straight to your phone \u2014 no paper, no printing.",
  },
  {
    icon: ShoppingBag,
    title: "Collect at any pharmacy",
    description:
      "Walk into any pharmacy in Australia, show your phone, and collect your medication. PBS subsidies apply.",
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** eScript explainer - visual 3-step walkthrough of the digital prescription process */
export function EScriptExplainerSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="What is an eScript" className="py-16 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 tracking-tight">
            What is an eScript?
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            eScripts are digital prescriptions - the national standard in
            Australia since 2020. No paper needed, works everywhere.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              className="rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none p-6 text-center"
              initial={animate ? { y: 20 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

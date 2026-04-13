"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

import { InteractiveProductMockup } from "@/components/marketing/shared/interactive-product-mockup"
import { useReducedMotion } from "@/components/ui/motion"
import { SectionPill } from "@/components/ui/section-pill"

// =============================================================================
// DATA
// =============================================================================

const KEY_FACTS = [
  "Accepted at every pharmacy in Australia",
  "No paper scripts or printing needed",
  "PBS subsidies apply at the pharmacy",
  "Includes repeats where appropriate",
  "National standard since 2020",
]

// =============================================================================
// COMPONENT
// =============================================================================

/** eScript explainer - split layout with interactive phone mockup + key facts */
export function EScriptExplainerSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="What is an eScript" className="py-16 lg:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <SectionPill>Digital prescriptions</SectionPill>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mt-4 mb-3 tracking-tight">
            What is an eScript?
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            eScripts are digital prescriptions. The national standard in
            Australia since 2020. No paper needed, works everywhere.
          </p>
        </motion.div>

        {/* Split layout: mockup + facts */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Phone mockup */}
          <InteractiveProductMockup variant="escript" className="max-w-[280px] mx-auto w-full">
            <div className="px-5 py-4">
              {/* Status bar */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-4">
                <span className="font-medium">InstantMed</span>
                <span>2:34 PM</span>
              </div>

              {/* SMS bubble */}
              <div className="bg-muted/40 dark:bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 mb-3">
                <p className="text-xs font-medium text-foreground mb-1">eScript Ready</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your electronic prescription is ready. Show this token at any pharmacy in Australia.
                </p>
              </div>

              {/* Token card */}
              <div className="bg-white dark:bg-card rounded-xl border border-border/30 p-3.5 shadow-sm shadow-primary/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Prescription Token
                  </span>
                  <span className="text-[10px] text-success font-medium">Active</span>
                </div>
                <div className="text-sm font-mono font-semibold text-primary tracking-wide">
                  ABCD-1234-EFGH
                </div>
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground">Atorvastatin 40mg</p>
                  <p className="text-[10px] text-muted-foreground">
                    Qty: 30 &middot; Repeats: 5
                  </p>
                </div>
              </div>

              {/* Bottom hint */}
              <p className="text-[10px] text-muted-foreground text-center mt-3 pb-1">
                Show to any pharmacist to collect
              </p>
            </div>
          </InteractiveProductMockup>

          {/* Key facts */}
          <div>
            <ul className="space-y-4">
              {KEY_FACTS.map((fact, i) => (
                <motion.li
                  key={fact}
                  className="flex items-start gap-3"
                  initial={animate ? { x: 12 } : {}}
                  whileInView={animate ? { x: 0, opacity: 1 } : undefined}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span className="text-sm text-foreground leading-relaxed">{fact}</span>
                </motion.li>
              ))}
            </ul>

            <motion.p
              className="mt-6 text-xs text-muted-foreground leading-relaxed"
              initial={animate ? {} : {}}
              whileInView={animate ? { opacity: 1 } : undefined}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              eScripts were introduced by the Australian Government in 2020 as
              the national standard for electronic prescriptions. They work with
              the same medications and PBS subsidies as paper scripts.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  )
}

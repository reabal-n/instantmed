"use client"

import { motion } from "framer-motion"
import { ArrowRight, ClipboardList, Shield, Sparkles, Stethoscope } from "lucide-react"
import Link from "next/link"

import { useReducedMotion } from "@/components/ui/motion"
import { PRICING_DISPLAY } from "@/lib/constants"

// =============================================================================
// DATA
// =============================================================================

const consults = [
  {
    icon: Shield,
    title: "Erectile Dysfunction",
    description:
      "Discreet assessment and treatment. Clinically proven medications prescribed if appropriate.",
    price: PRICING_DISPLAY.MENS_HEALTH,
    href: "/erectile-dysfunction",
  },
  {
    icon: Sparkles,
    title: "Hair Loss",
    description:
      "Medical assessment for hair loss. Evidence-based treatments prescribed by an Australian GP.",
    price: PRICING_DISPLAY.HAIR_LOSS,
    href: "/hair-loss",
  },
  {
    icon: Stethoscope,
    title: "Women\u2019s Health",
    description:
      "Contraception, hormonal concerns, and general women\u2019s health. Compassionate, confidential care.",
    price: PRICING_DISPLAY.WOMENS_HEALTH,
    href: "/request?service=consult&subtype=womens-health",
  },
  {
    icon: ClipboardList,
    title: "Weight Management",
    description:
      "Doctor-guided weight management plans. Medication options discussed if clinically appropriate.",
    price: PRICING_DISPLAY.WEIGHT_LOSS,
    href: "/request?service=consult&subtype=weight-loss",
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Specialised consultation type cards with pricing and links */
export function SpecialisedConsultsSection() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section aria-label="Specialised consultations" className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : {}}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Specialised consultations
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Looking for something specific? Dedicated pathways with doctors experienced in these
            areas.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {consults.map((consult, i) => (
            <motion.div
              key={consult.title}
              initial={animate ? { y: 20 } : {}}
              whileInView={animate ? { opacity: 1, y: 0 } : {}}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.3, delay: animate ? i * 0.05 : 0 }}
            >
              <Link
                href={consult.href}
                className="group flex flex-col h-full rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="flex-1 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                    <consult.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{consult.title}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {consult.description}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 dark:border-white/10 px-5 py-3">
                  <span className="text-sm font-semibold text-foreground">{consult.price}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

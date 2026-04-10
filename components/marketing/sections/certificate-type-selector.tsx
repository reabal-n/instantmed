"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  Briefcase,
  GraduationCap,
  Heart,
  ArrowRight,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MED_CERT_DURATIONS } from "@/lib/constants"
import { usePostHog } from "@/components/providers/posthog-provider"
import {
  CERT_CATEGORIES,
  CERT_TYPE_POSTHOG_EVENT,
  CERT_TYPE_POSTHOG_PROPERTY,
  type CertCategory,
} from "@/lib/marketing/med-cert-selector"

// =============================================================================
// DATA
// =============================================================================

/** Icon map — keeps lucide imports in the component (not the lib module). */
const CATEGORY_ICONS: Record<CertCategory, typeof Briefcase> = {
  work: Briefcase,
  study: GraduationCap,
  carer: Heart,
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Interactive certificate type selector — engagement hook for the med cert
 * landing page. Replaces the trust-strip wall between hero and HowItWorks.
 *
 * Shows 3 category cards (work / study / carer) with common reasons.
 * Selection reveals the pricing ladder + CTA that links to the intake with
 * `certType` pre-seeded via URL param.
 */
export function CertificateTypeSelector({
  className,
}: {
  className?: string
}) {
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion
  const [selected, setSelected] = useState<CertCategory | null>(null)

  const handleSelect = (category: CertCategory) => {
    setSelected(category)
    posthog?.capture(CERT_TYPE_POSTHOG_EVENT, { [CERT_TYPE_POSTHOG_PROPERTY]: category })
  }

  return (
    <section
      id="certificate-type"
      aria-label="Choose your certificate type"
      className={cn("py-12 lg:py-16 scroll-mt-20", className)}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={animate ? { y: 20 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Which certificate do you need?
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Select your situation — we&apos;ll tailor the form to match.
          </p>
        </motion.div>

        {/* Category cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {CERT_CATEGORIES.map((cat, i) => {
            const Icon = CATEGORY_ICONS[cat.id]
            const isSelected = selected === cat.id
            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                className={cn(
                  "relative rounded-2xl border p-5 text-left transition-all cursor-pointer",
                  "bg-white dark:bg-card shadow-md shadow-primary/[0.06]",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border/50 hover:border-primary/30 hover:shadow-lg",
                )}
                initial={animate ? { y: 16 } : {}}
                whileInView={animate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                )}
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                    isSelected ? "bg-primary/15" : "bg-primary/10",
                  )}
                >
                  <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {cat.label}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {cat.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="text-[10px] font-medium text-muted-foreground/70 px-2 py-0.5 rounded-full border border-border/40 bg-muted/30"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Pricing ladder + CTA — visible once a category is selected */}
        <motion.div
          className="mt-6 text-center"
          initial={false}
          animate={
            selected
              ? { opacity: 1, y: 0, height: "auto" }
              : { opacity: 0, y: 8, height: 0 }
          }
          transition={{ duration: 0.3 }}
          style={{ overflow: "hidden" }}
        >
          <div className="inline-flex items-center gap-4 sm:gap-6 mb-4">
            {MED_CERT_DURATIONS.options.map((days) => (
              <div key={days} className="text-center">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {MED_CERT_DURATIONS.labels[days]}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  ${MED_CERT_DURATIONS.prices[days].toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div>
            <Button
              asChild
              size="lg"
              className="px-8 h-11 font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 transition-all"
            >
              <Link
                href={`/request?service=med-cert${selected ? `&certType=${selected}` : ""}`}
              >
                Get your certificate
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Takes about 2 minutes &middot; Full refund if we can&apos;t help
            </p>
          </div>
        </motion.div>

        {/* Fallback CTA for users who don't want to pick */}
        {!selected && (
          <div className="mt-4 text-center">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href="/request?service=med-cert">
                Skip &mdash; I&apos;ll choose during the form
                <ArrowRight
                  className="ml-1.5 h-3.5 w-3.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

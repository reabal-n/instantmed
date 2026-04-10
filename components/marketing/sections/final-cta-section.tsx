"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PRICING } from "@/lib/constants"

// =============================================================================
// COMPONENT
// =============================================================================

/** Section 7: Final CTA */
export function FinalCtaSection({
  onCTAClick,
  title = "Let a doctor handle the paperwork.",
  subtitle = "Two minutes on your phone. A real doctor reviews it. Certificate in your inbox.",
  ctaText = "Get your certificate",
  ctaHref = "/request?service=med-cert",
  price = PRICING.MED_CERT,
}: {
  onCTAClick?: () => void
  title?: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
  price?: number
}) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section aria-label="Get started" className="py-20 lg:py-24 bg-linear-to-br from-primary/5 via-primary/10 to-sky-100/50 dark:from-primary/10 dark:via-primary/5 dark:to-card">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4 tracking-tight">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
          <Button
            asChild
            size="lg"
            className="px-10 h-14 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            onClick={onCTAClick}
          >
            <Link href={ctaHref}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-foreground/70 text-sm font-medium">
            From ${price.toFixed(2)} &middot; No account required
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Takes about 2 minutes &middot; Full refund if we can&apos;t help
          </p>
        </motion.div>
      </div>
    </section>
  )
}

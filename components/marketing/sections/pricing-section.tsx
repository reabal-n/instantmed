'use client'

import { motion } from 'framer-motion'
import { AlertCircle,ArrowRight, Check, RefreshCw } from 'lucide-react'
import Link from 'next/link'

import { StripePaymentLogos } from '@/components/checkout/payment-logos'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { useReducedMotion } from '@/components/ui/motion'
import { PRICING } from '@/lib/constants'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PricingSectionColors {
  light: string
  text: string
  border: string
  button: string
}

export interface PricingSectionProps {
  /** Section heading */
  title: string
  /** Section subheading */
  subtitle: string
  /** Price amount (number - displayed as $XX.XX) */
  price: number
  /** Optional strikethrough original price (number renders as $XX.XX, string renders as-is) */
  originalPrice?: number | string
  /** Feature bullet list */
  features: string[]
  /** Refund policy note (optional) */
  refundNote?: string
  /** Medicare note (optional) */
  medicareNote?: string
  /** CTA button text */
  ctaText: string
  /** CTA button href */
  ctaHref: string
  /** Color classes for theming */
  colors: PricingSectionColors
  /** Show the comparison table (med-cert only) */
  showComparisonTable?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingSection({
  title,
  subtitle,
  price,
  originalPrice,
  features,
  refundNote,
  medicareNote,
  ctaText,
  ctaHref,
  colors,
  showComparisonTable = false,
  className,
}: PricingSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section id="pricing" className={cn('py-16 lg:py-24', className)}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? {} : { y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <Heading level="h2" className="mb-4">
            {title}
          </Heading>
          <p className="text-lg text-muted-foreground">
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? {} : { y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn('rounded-2xl p-8 lg:p-10 border-2 text-center', colors.light, colors.border)}
        >
          {/* Price */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className={cn('text-4xl sm:text-5xl font-semibold', colors.text)}>
                ${price.toFixed(2)}
              </span>
              {originalPrice && (
                <span className="text-2xl text-muted-foreground line-through">
                  {typeof originalPrice === 'string' ? originalPrice : `$${originalPrice.toFixed(2)}`}
                </span>
              )}
            </div>
            <p className="text-muted-foreground">One-time fee</p>
          </div>

          {/* Features */}
          <ul className="text-left max-w-md mx-auto space-y-3 mb-8">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <Check className={cn('h-5 w-5 shrink-0', colors.text)} />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button
            asChild
            size="lg"
            className={cn('w-full sm:w-auto px-10 h-12 text-base font-semibold text-white', colors.button)}
          >
            <Link href={ctaHref}>
              {ctaText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-xs font-medium text-success">
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            100% refund if we can&apos;t help
          </div>
          <p className="mt-2 text-xs text-muted-foreground">No account required</p>
          <StripePaymentLogos className="mt-1.5 opacity-60" />

          {/* Optional footnotes */}
          {(refundNote || medicareNote) && (
            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              {refundNote && (
                <p className="flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  {refundNote}
                </p>
              )}
              {medicareNote && (
                <p className="flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {medicareNote}
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Comparison Table - optional */}
        {showComparisonTable && <ComparisonTable />}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Comparison Table (med-cert specific)
// ---------------------------------------------------------------------------

function ComparisonTable() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12"
    >
      <h3 className="text-lg font-semibold text-foreground text-center mb-6">How we compare</h3>
      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-lg dark:shadow-none">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/50">
              <th scope="col" className="text-left py-4 px-5 text-muted-foreground font-medium"><span className="sr-only">Feature</span></th>
              <th scope="col" className="text-center py-4 px-5 font-semibold text-primary bg-primary/5 dark:bg-primary/10">InstantMed</th>
              <th scope="col" className="text-center py-4 px-5 text-muted-foreground font-medium">GP Clinic</th>
              <th scope="col" className="text-center py-4 px-5 text-muted-foreground font-medium">Walk-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {comparisonRows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <th scope="row" className="py-3.5 px-5 text-left text-muted-foreground font-medium">{row.label}</th>
                <td className={cn('py-3.5 px-5 text-center font-semibold bg-primary/5 dark:bg-primary/10', row.instantHighlight ? 'text-foreground' : 'text-foreground')}>
                  {renderCell(row.instant)}
                </td>
                <td className="py-3.5 px-5 text-center text-muted-foreground">{renderCell(row.gp)}</td>
                <td className="py-3.5 px-5 text-center text-muted-foreground">{renderCell(row.walkin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground text-center leading-relaxed px-2">
        * Average review time based on recent requests. Individual times vary.{" "}
        † GP cost estimated from MBS item 23 standard consultation fee. Out-of-pocket costs vary by clinic.
      </p>
    </motion.div>
  )
}

function renderCell(value: string | boolean) {
  if (value === true) return <Check className="w-5 h-5 text-success mx-auto" />
  if (value === false)
    return (
      <span className="text-muted-foreground/70">
        <span className="sr-only">Not included</span>
        <span aria-hidden="true">-</span>
      </span>
    )
  return value
}

const comparisonRows: Array<{
  label: string
  instant: string | boolean
  gp: string | boolean
  walkin: string | boolean
  instantHighlight?: boolean
}> = [
  { label: 'Cost †', instant: `$${PRICING.MED_CERT.toFixed(2)}`, gp: SOCIAL_PROOF.gpPriceStandard, walkin: SOCIAL_PROOF.gpPriceComplex, instantHighlight: true },
  { label: 'Turnaround *', instant: `~${SOCIAL_PROOF.certTurnaroundMinutes} min avg`, gp: 'Requires booking', walkin: '2-4 hours', instantHighlight: true },
  { label: 'No waiting room visit', instant: true, gp: false, walkin: false, instantHighlight: true },
  { label: 'Employer accepted', instant: true, gp: true, walkin: true },
  { label: 'AHPRA doctor', instant: true, gp: true, walkin: true },
  { label: 'Open 7 days', instant: true, gp: 'Sometimes', walkin: 'Varies', instantHighlight: true },
  { label: 'No appointment needed', instant: true, gp: false, walkin: true, instantHighlight: true },
]

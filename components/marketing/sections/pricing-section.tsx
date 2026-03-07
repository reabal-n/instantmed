'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  /** Price amount (number — displayed as $XX.XX) */
  price: number
  /** Optional strikethrough original price */
  originalPrice?: number
  /** Feature bullet list */
  features: string[]
  /** Refund policy note */
  refundNote: string
  /** Medicare note */
  medicareNote: string
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
  return (
    <section id="pricing" className={cn('py-16 lg:py-24', className)}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={cn('rounded-2xl p-8 lg:p-10 border-2 text-center', colors.light, colors.border)}
        >
          {/* Price */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className={cn('text-5xl font-bold', colors.text)}>
                ${price.toFixed(2)}
              </span>
              {originalPrice && (
                <span className="text-2xl text-muted-foreground line-through">
                  ${originalPrice.toFixed(2)}
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
          <p className="mt-3 text-xs text-muted-foreground">
            No account required &middot; Pay only after doctor review
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay'].map((m) => (
              <span key={m} className="text-xs text-muted-foreground/50 px-1.5 py-0.5 rounded bg-background/50 border border-border/30">
                {m}
              </span>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              {refundNote}
            </p>
            <p className="flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {medicareNote}
            </p>
          </div>
        </motion.div>

        {/* Comparison Table — optional */}
        {showComparisonTable && <ComparisonTable />}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Comparison Table (med-cert specific)
// ---------------------------------------------------------------------------

function ComparisonTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12"
    >
      <h3 className="text-lg font-semibold text-foreground text-center mb-6">How we compare</h3>
      <div className="overflow-x-auto rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-lg">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-4 px-5 text-muted-foreground font-medium"></th>
              <th className="text-center py-4 px-5 font-semibold text-primary bg-primary/5 dark:bg-primary/10">InstantMed</th>
              <th className="text-center py-4 px-5 text-muted-foreground font-medium">GP Clinic</th>
              <th className="text-center py-4 px-5 text-muted-foreground font-medium">Walk-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {comparisonRows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="py-3.5 px-5 text-muted-foreground font-medium">{row.label}</td>
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
    </motion.div>
  )
}

function renderCell(value: string | boolean) {
  if (value === true) return <Check className="w-5 h-5 text-emerald-500 mx-auto" />
  if (value === false) return <span className="text-muted-foreground/40">—</span>
  return value
}

const comparisonRows: Array<{
  label: string
  instant: string | boolean
  gp: string | boolean
  walkin: string | boolean
  instantHighlight?: boolean
}> = [
  { label: 'Cost', instant: '$19.95', gp: '$60–90', walkin: '$80–120', instantHighlight: true },
  { label: 'Wait time', instant: 'Under 1 hour', gp: '1–3 days', walkin: '2–4 hours', instantHighlight: true },
  { label: 'Leave your couch?', instant: false, gp: true, walkin: true, instantHighlight: true },
  { label: 'Employer accepted', instant: true, gp: true, walkin: true },
  { label: 'AHPRA doctor', instant: true, gp: true, walkin: true },
  { label: 'Open 7 days', instant: true, gp: 'Sometimes', walkin: 'Varies', instantHighlight: true },
  { label: 'No appointment needed', instant: true, gp: false, walkin: true, instantHighlight: true },
]

"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  Briefcase,
  GraduationCap,
  Heart,
  ArrowRight,
  Check,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MED_CERT_DURATIONS, PRICING } from "@/lib/constants"
import { usePostHog } from "@/components/providers/posthog-provider"
import {
  CERT_CATEGORIES,
  CERT_TYPE_POSTHOG_EVENT,
  CERT_TYPE_POSTHOG_PROPERTY,
  type CertCategory,
} from "@/lib/marketing/med-cert-selector"
import { SectionPill } from "@/components/ui/section-pill"
import { SOCIAL_PROOF } from "@/lib/social-proof"

// =============================================================================
// DATA
// =============================================================================

/** Icon map - keeps lucide imports in the component (not the lib module). */
const CATEGORY_ICONS: Record<CertCategory, typeof Briefcase> = {
  work: Briefcase,
  study: GraduationCap,
  carer: Heart,
}

const CATEGORY_GRADIENTS: Record<CertCategory, { gradient: string; selectedGradient: string }> = {
  work: { gradient: "from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-card", selectedGradient: "from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card" },
  study: { gradient: "from-sky-50/50 to-white dark:from-sky-950/10 dark:to-card", selectedGradient: "from-sky-50 to-white dark:from-sky-950/20 dark:to-card" },
  carer: { gradient: "from-rose-50/50 to-white dark:from-rose-950/10 dark:to-card", selectedGradient: "from-rose-50 to-white dark:from-rose-950/20 dark:to-card" },
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Interactive certificate type selector - engagement hook for the med cert
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

  const searchParams = useSearchParams()

  // Auto-select from URL params (utm_content or certType)
  useEffect(() => {
    const certType = searchParams.get("certType") || searchParams.get("utm_content")
    if (certType && !selected && ["work", "study", "carer"].includes(certType)) {
      setSelected(certType as CertCategory)
    }
  }, [searchParams, selected])

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
          <div className="mb-4">
            <SectionPill>Certificates</SectionPill>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Which certificate do you need?
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Select your situation - we&apos;ll tailor the form to match.
          </p>
        </motion.div>

        {/* Category cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {CERT_CATEGORIES.map((cat, i) => {
            const Icon = CATEGORY_ICONS[cat.id]
            const isSelected = selected === cat.id
            const colors = CATEGORY_GRADIENTS[cat.id]
            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                className={cn(
                  "relative rounded-2xl border p-5 text-left transition-all cursor-pointer",
                  "bg-gradient-to-br shadow-md shadow-primary/[0.06]",
                  isSelected ? colors.selectedGradient : colors.gradient,
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

        {/* Pricing ladder + CTA - visible once a category is selected */}
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
                onClick={() => posthog?.capture("cta_clicked", { location: "cert_selector", cert_type: selected })}
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
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              From <span className="font-semibold text-foreground">${PRICING.MED_CERT.toFixed(2)}</span>
            </p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href="/request?service=med-cert">
                Skip - I&apos;ll choose during the form
                <ArrowRight
                  className="ml-1.5 h-3.5 w-3.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>
        )}

        {/* Compact comparison table */}
        <ComparisonTable />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Comparison Table - InstantMed vs GP vs Other Telehealth
// ---------------------------------------------------------------------------

const comparisonRows: Array<{
  label: string
  instant: string | boolean
  gp: string | boolean
  telehealth: string | boolean
  instantHighlight?: boolean
}> = [
  { label: 'Cost', instant: `$${PRICING.MED_CERT.toFixed(2)}`, gp: SOCIAL_PROOF.gpPriceStandard, telehealth: '~$60', instantHighlight: true },
  { label: 'Turnaround', instant: `~${SOCIAL_PROOF.certTurnaroundMinutes} min avg`, gp: 'Requires booking', telehealth: '1–2 hours', instantHighlight: true },
  { label: 'No waiting room', instant: true, gp: false, telehealth: true },
  { label: 'Employer accepted', instant: true, gp: true, telehealth: true },
  { label: 'AHPRA doctor', instant: true, gp: true, telehealth: true },
  { label: 'Open 24/7', instant: true, gp: false, telehealth: 'Limited', instantHighlight: true },
  { label: 'No appointment', instant: true, gp: false, telehealth: false, instantHighlight: true },
  { label: 'You save', instant: '-', gp: '~$50', telehealth: '~$40', instantHighlight: true },
]

function renderCell(value: string | boolean) {
  if (value === true) return <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
  if (value === false)
    return <span className="text-muted-foreground/50" aria-hidden="true">&mdash;</span>
  return <span>{value}</span>
}

function ComparisonTable() {
  const prefersReducedMotion = useReducedMotion()
  const tableRef = useRef<HTMLDivElement>(null)
  const posthog = usePostHog()
  const tracked = useRef(false)

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true
          posthog?.capture("comparison_table_viewed", { page: "med-cert" })
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [posthog])

  return (
    <motion.div
      ref={tableRef}
      className="mt-10"
      initial={prefersReducedMotion ? {} : { y: 16, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <h3 className="text-base font-semibold text-foreground text-center mb-4">
        How we compare
      </h3>
      <div className="overflow-x-auto rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/50">
              <th scope="col" className="text-left py-3 px-4 text-muted-foreground font-medium text-xs sticky left-0 z-10 bg-white dark:bg-card">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col" className="text-center py-3 px-4 font-semibold text-primary bg-primary/5 dark:bg-primary/10 text-xs">
                InstantMed
              </th>
              <th scope="col" className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">
                GP Clinic
              </th>
              <th scope="col" className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">
                Other Telehealth
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {comparisonRows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <th scope="row" className="py-2.5 px-4 text-left text-muted-foreground font-medium text-xs sticky left-0 z-10 bg-white dark:bg-card">
                  {row.label}
                </th>
                <td className={cn(
                  'py-2.5 px-4 text-center text-xs bg-primary/5 dark:bg-primary/10',
                  row.instantHighlight ? 'font-semibold text-foreground' : 'text-foreground',
                )}>
                  {renderCell(row.instant)}
                </td>
                <td className="py-2.5 px-4 text-center text-xs text-muted-foreground">
                  {renderCell(row.gp)}
                </td>
                <td className="py-2.5 px-4 text-center text-xs text-muted-foreground">
                  {renderCell(row.telehealth)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground/60 text-center leading-relaxed">
        GP cost estimated from MBS item 23 consultation fee. Telehealth prices based on comparable med-cert services.
      </p>
    </motion.div>
  )
}

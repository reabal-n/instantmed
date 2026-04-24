"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"

import { StickerIcon } from "@/components/icons/stickers"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { useReducedMotion } from "@/components/ui/motion"
import { MED_CERT_DURATIONS, PRICING } from "@/lib/constants"
import {
  CERT_CATEGORIES,
  CERT_TYPE_POSTHOG_EVENT,
  CERT_TYPE_POSTHOG_PROPERTY,
  type CertCategory,
} from "@/lib/marketing/med-cert-selector"
import { SOCIAL_PROOF } from "@/lib/social-proof"
import { cn } from "@/lib/utils"

// =============================================================================
// DATA
// =============================================================================

const CATEGORY_STICKERS: Record<CertCategory, import("@/components/icons/stickers").StickerIconName> = {
  work:  "briefcase",
  study: "graduation-cap",
  carer: "heart-with-pulse",
}

const CATEGORY_FEATURES: Record<CertCategory, string[]> = {
  work: [
    "Accepted by Fair Work Act employers",
    "Same-day PDF to your inbox",
    "AHPRA doctor on every certificate",
  ],
  study: [
    "Accepted by all Australian universities",
    "Supports exam deferral & special consideration",
    "Delivered before submission deadlines",
  ],
  carer: [
    "Valid under Fair Work Act s 107",
    "Covers any immediate family member",
    "Full refund if we can't help",
  ],
}

const CATEGORY_GRADIENTS: Record<CertCategory, { gradient: string; selectedGradient: string }> = {
  work:  { gradient: "from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-card",  selectedGradient: "from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card" },
  study: { gradient: "from-sky-50/50 to-white dark:from-sky-950/10 dark:to-card",          selectedGradient: "from-sky-50 to-white dark:from-sky-950/20 dark:to-card" },
  carer: { gradient: "from-rose-50/50 to-white dark:from-rose-950/10 dark:to-card",        selectedGradient: "from-rose-50 to-white dark:from-rose-950/20 dark:to-card" },
}

// =============================================================================
// COMPONENT
// =============================================================================

function SearchParamsAutoSelect({
  onAutoSelect,
}: {
  onAutoSelect: (cat: CertCategory) => void
}) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const certType = searchParams.get("certType") || searchParams.get("utm_content")
    if (certType && ["work", "study", "carer"].includes(certType)) {
      onAutoSelect(certType as CertCategory)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

export function CertificateTypeSelector({
  className,
}: {
  className?: string
}) {
  const posthog = usePostHog()
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion
  const [selected, setSelected] = useState<CertCategory | null>(null)
  const [selectedDays, setSelectedDays] = useState<number>(MED_CERT_DURATIONS.options[0])

  const handleAutoSelect = (cat: CertCategory) => {
    setSelected((prev) => prev ?? cat)
  }

  const handleSelect = (category: CertCategory) => {
    setSelected(category)
    posthog?.capture(CERT_TYPE_POSTHOG_EVENT, { [CERT_TYPE_POSTHOG_PROPERTY]: category })
  }

  const selectedPrice = MED_CERT_DURATIONS.prices[selectedDays as keyof typeof MED_CERT_DURATIONS.prices]
  const selectedLabel = MED_CERT_DURATIONS.labels[selectedDays as keyof typeof MED_CERT_DURATIONS.labels]

  return (
    <section
      id="certificate-type"
      aria-label="Choose your certificate type"
      className={cn("py-12 lg:py-16 scroll-mt-20", className)}
    >
      <Suspense fallback={null}>
        <SearchParamsAutoSelect onAutoSelect={handleAutoSelect} />
      </Suspense>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={animate ? { opacity: 0, y: 8 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Which certificate do you need?
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Select your situation. We&apos;ll tailor the form to match.
          </p>
        </motion.div>

        {/* Category cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {CERT_CATEGORIES.map((cat, i) => {
            const isSelected = selected === cat.id
            const colors = CATEGORY_GRADIENTS[cat.id]
            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                className={cn(
                  "relative rounded-2xl border p-5 text-left cursor-pointer",
                  "bg-gradient-to-br shadow-md shadow-primary/[0.06]",
                  "transition-[transform,box-shadow,border-color,background-image] duration-200",
                  isSelected ? colors.selectedGradient : colors.gradient,
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border/50 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5",
                )}
                initial={animate ? { opacity: 0, y: 8 } : {}}
                whileInView={animate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: i * 0.07 }}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                )}

                <div className="mb-3">
                  <StickerIcon name={CATEGORY_STICKERS[cat.id]} size={40} />
                </div>

                <h3 className="text-base font-semibold text-foreground mb-1">
                  {cat.label}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {cat.description}
                </p>

                <ul className="space-y-1.5 mb-3">
                  {CATEGORY_FEATURES[cat.id].map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-xs text-muted-foreground leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-1.5">
                  {cat.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full border border-border/40 bg-muted/30"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Pricing ladder + CTA */}
        <motion.div
          className="mt-6 text-center"
          animate={
            selected
              ? { opacity: 1, y: 0, height: "auto" }
              : { opacity: 0, y: 8, height: 0 }
          }
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          style={{ overflow: "hidden" }}
        >
          {/* Duration tiles */}
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-5 p-1 rounded-xl bg-muted/40 border border-border/30">
            {MED_CERT_DURATIONS.options.map((days) => {
              const isActive = selectedDays === days
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSelectedDays(days)}
                  className={cn(
                    "relative px-4 py-2 rounded-lg text-center cursor-pointer min-w-[80px]",
                    "transition-[transform,box-shadow,background-color,border-color] duration-150",
                    isActive
                      ? "bg-white dark:bg-card shadow-sm border border-border/50 ring-1 ring-primary/20"
                      : "hover:bg-white/60 dark:hover:bg-white/5",
                  )}
                >
                  <p className={cn("text-xs mb-0.5", isActive ? "text-primary font-medium" : "text-muted-foreground")}>
                    {MED_CERT_DURATIONS.labels[days as keyof typeof MED_CERT_DURATIONS.labels]}
                  </p>
                  <p className={cn("text-sm font-semibold", isActive ? "text-foreground" : "text-muted-foreground")}>
                    ${MED_CERT_DURATIONS.prices[days as keyof typeof MED_CERT_DURATIONS.prices].toFixed(2)}
                  </p>
                </button>
              )
            })}
          </div>
          <div>
            <Button
              asChild
              size="lg"
              className="px-8 h-11 font-semibold shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5"
            >
              <Link
                href={`/request?service=med-cert${selected ? `&certType=${selected}` : ""}`}
                onClick={() => posthog?.capture("cta_clicked", { location: "cert_selector", cert_type: selected, days: selectedDays })}
              >
                Get your {selectedLabel} certificate &middot; ${selectedPrice.toFixed(2)}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Takes about 2 minutes &middot; Full refund if we can&apos;t help
            </p>
          </div>
        </motion.div>

        {/* Fallback CTA */}
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
                I&apos;ll choose during the form
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        )}

        <ComparisonTable />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Comparison Table
// ---------------------------------------------------------------------------

const comparisonRows: Array<{
  label: string
  instant: string | boolean
  gp: string | boolean
  telehealth: string | boolean
  instantWins?: boolean
}> = [
  { label: 'Price',              instant: `$${PRICING.MED_CERT.toFixed(2)}`,              gp: SOCIAL_PROOF.gpPriceStandard,  telehealth: '~$60',          instantWins: true },
  { label: 'Turnaround',        instant: `~${SOCIAL_PROOF.certTurnaroundMinutes} min`,    gp: 'Needs booking',               telehealth: '1-2 hours',     instantWins: true },
  { label: 'Open 24/7',         instant: true,                                            gp: false,                         telehealth: 'Limited',       instantWins: true },
  { label: 'No appointment',    instant: true,                                            gp: false,                         telehealth: false,           instantWins: true },
  { label: 'Same-day cert',     instant: true,                                            gp: false,                         telehealth: 'Often next day',instantWins: true },
  { label: 'AHPRA doctor',      instant: true,                                            gp: true,                          telehealth: true },
]

function renderCell(value: string | boolean, isInstant = false, wins = false) {
  if (value === true)
    return <CheckCircle2 className={cn("w-4 h-4 mx-auto", isInstant && wins ? "text-primary" : "text-success")} />
  if (value === false)
    return <span className="text-muted-foreground/30" aria-hidden="true">&times;</span>
  return <span className={cn(isInstant && wins ? "font-semibold text-foreground" : "")}>{value}</span>
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
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
    >
      <h3 className="text-base font-semibold text-foreground text-center mb-4">
        How we compare
      </h3>
      <div className="overflow-x-auto rounded-xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none">
        <table className="w-full text-sm border-collapse bg-white dark:bg-card rounded-xl overflow-hidden">
          <thead>
            <tr className="border-b border-border/40">
              <th scope="col" className="text-left py-3 px-4 text-muted-foreground font-medium text-xs w-[30%] bg-white dark:bg-card sticky left-0 z-10">
                <span className="sr-only">Feature</span>
              </th>
              <th scope="col" className="text-center py-0 px-4 w-[23%] bg-primary/5 dark:bg-primary/10">
                <div className="flex flex-col items-center gap-1 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-[10px] font-semibold text-white uppercase tracking-wider">
                    Best value
                  </span>
                  <span className="text-xs font-semibold text-primary">InstantMed</span>
                </div>
              </th>
              <th scope="col" className="text-center py-3 px-4 text-muted-foreground font-medium text-xs w-[23%]">
                GP Clinic
              </th>
              <th scope="col" className="text-center py-3 px-4 text-muted-foreground font-medium text-xs w-[23%]">
                Other Telehealth
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/25">
            {comparisonRows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <th scope="row" className="py-2.5 px-4 text-left text-muted-foreground font-medium text-xs bg-white dark:bg-card sticky left-0 z-10">
                  {row.label}
                </th>
                <td className="py-2.5 px-4 text-center text-xs bg-primary/5 dark:bg-primary/10">
                  {renderCell(row.instant, true, row.instantWins)}
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
      <p className="mt-3 text-[11px] text-muted-foreground text-center leading-relaxed">
        GP cost estimated from MBS item 23 fee. Telehealth prices based on comparable services.
      </p>
    </motion.div>
  )
}

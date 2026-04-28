"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Sparkles,
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

// ---------------------------------------------------------------------------
// DATA
// ---------------------------------------------------------------------------

const CATEGORY_STICKERS: Record<CertCategory, import("@/components/icons/stickers").StickerIconName> = {
  work:  "briefcase",
  study: "graduation-cap",
  carer: "heart-with-pulse",
}

const CATEGORY_FEATURES: Record<CertCategory, string[]> = {
  work: [
    "Recognised under the Fair Work Act",
    "Same-day PDF to your inbox",
    "AHPRA doctor on every certificate",
  ],
  study: [
    "For uni and TAFE absences",
    "Same-day PDF to your inbox",
    "AHPRA doctor on every certificate",
  ],
  carer: [
    "Recognised under Fair Work Act s 107",
    "Covers any immediate family member",
    "Full refund if we cannot help",
  ],
}

// ---------------------------------------------------------------------------
// SearchParam auto-select
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

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
            Pick a category to tailor the form, or skip ahead and choose during the intake.
          </p>
        </motion.div>

        {/* Category cards - solid white surfaces, no gradients */}
        <div className="grid sm:grid-cols-3 gap-4">
          {CERT_CATEGORIES.map((cat, i) => {
            const isSelected = selected === cat.id
            const isMostChosen = cat.id === "work"
            return (
              <motion.button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                aria-pressed={isSelected}
                className={cn(
                  "group relative rounded-2xl border p-5 text-left cursor-pointer",
                  "bg-white dark:bg-card",
                  "shadow-sm shadow-primary/[0.04]",
                  "transition-[transform,box-shadow,border-color] duration-200",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/[0.08]"
                    : "border-border/60 hover:border-primary/40 hover:shadow-md hover:shadow-primary/[0.08] hover:-translate-y-0.5",
                )}
                initial={animate ? { opacity: 0, y: 8 } : {}}
                whileInView={animate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: i * 0.07 }}
              >
                {/* Most chosen badge - real-data positioning signal */}
                {isMostChosen && !isSelected && (
                  <div className="absolute -top-2 left-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                      Most chosen
                    </span>
                  </div>
                )}

                {/* Selected check */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />
                    </div>
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" aria-hidden="true" />
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

        {/* Pricing ladder + CTA - shown after a selection */}
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
              Takes about 2 minutes. Full refund if we cannot help.
            </p>
          </div>
        </motion.div>

        {/* Secondary action - only when nothing selected.
            Promoted from a near-invisible ghost link to a proper outline button
            so users who don't want to pre-select have a real path. */}
        {!selected && (
          <div className="mt-7 flex flex-col items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-7 h-11 font-medium border-border/70 hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <Link
                href="/request?service=med-cert"
                onClick={() => posthog?.capture("cta_clicked", { location: "cert_selector_skip", cert_type: null })}
              >
                Skip ahead, choose during the form
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              From <span className="font-semibold text-foreground">${PRICING.MED_CERT.toFixed(2)}</span> &middot; Most patients finish in under 2 minutes
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Comparison Table - exported standalone so the landing page can place it in
// its own section (after social proof) instead of inside the selector. Drops
// the "Other Telehealth" column because anchoring competitor prices in the
// patient's mental model hurts more than it helps.
// ---------------------------------------------------------------------------

const comparisonRows: Array<{
  label: string
  instant: string | boolean
  gp: string | boolean
  instantWins?: boolean
}> = [
  { label: 'Price',           instant: `$${PRICING.MED_CERT.toFixed(2)}`,           gp: SOCIAL_PROOF.gpPriceStandard, instantWins: true },
  { label: 'Turnaround',      instant: `~${SOCIAL_PROOF.certTurnaroundMinutes} min`, gp: 'Hours of waiting',           instantWins: true },
  { label: 'Open 24/7',       instant: true,                                         gp: false,                        instantWins: true },
  { label: 'No appointment',  instant: true,                                         gp: false,                        instantWins: true },
  { label: 'Same-day cert',   instant: true,                                         gp: false,                        instantWins: true },
  { label: 'AHPRA doctor',    instant: true,                                         gp: true },
]

function renderCell(value: string | boolean, isInstant = false, wins = false) {
  if (value === true)
    return <CheckCircle2 className={cn("w-4 h-4 mx-auto", isInstant && wins ? "text-primary" : "text-success")} />
  if (value === false)
    return <span className="text-muted-foreground/30" aria-hidden="true">&times;</span>
  return <span className={cn(isInstant && wins ? "font-semibold text-foreground" : "")}>{value}</span>
}

export function MedCertComparisonTable({ className }: { className?: string }) {
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
    <section
      aria-label="How online medical certificates compare to a GP visit"
      className={cn("py-10 sm:py-14", className)}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.div
          ref={tableRef}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              Online vs in-person GP
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Same legal weight under the Fair Work Act. Different experience.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/50 dark:border-white/10 shadow-md shadow-primary/[0.06] dark:shadow-none">
            <table className="w-full text-sm border-collapse bg-white dark:bg-card rounded-xl overflow-hidden">
              <thead>
                <tr className="border-b border-border/40">
                  <th scope="col" className="text-left py-3 px-4 text-muted-foreground font-medium text-xs w-[40%] bg-white dark:bg-card sticky left-0 z-10">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="text-center py-0 px-4 w-[30%] bg-primary/5 dark:bg-primary/10">
                    <div className="flex flex-col items-center gap-0.5 py-3">
                      <span className="text-xs font-semibold text-primary">InstantMed</span>
                      <span className="text-[10px] text-muted-foreground">Online</span>
                    </div>
                  </th>
                  <th scope="col" className="text-center py-3 px-4 text-muted-foreground font-medium text-xs w-[30%]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-semibold">GP Clinic</span>
                      <span className="text-[10px] text-muted-foreground/70">In-person</span>
                    </div>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground text-center leading-relaxed">
            GP cost estimated from MBS item 23 fee. Both certificate types are equally valid under Fair Work Act s 107.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

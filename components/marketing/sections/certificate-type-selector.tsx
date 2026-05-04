"use client"

import { motion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { StickerIcon } from "@/components/icons/stickers"
import { usePostHog } from "@/components/providers/posthog-provider"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { useReducedMotion } from "@/components/ui/motion"
import { MED_CERT_DURATIONS } from "@/lib/constants"
import {
  buildMedCertRequestHref,
  CERT_CATEGORIES,
  CERT_DURATION_POSTHOG_EVENT,
  CERT_DURATION_POSTHOG_PROPERTY,
  CERT_SELECTOR_CTA_POSTHOG_EVENT,
  CERT_TYPE_POSTHOG_EVENT,
  CERT_TYPE_POSTHOG_PROPERTY,
  type CertCategory,
  type CertDuration,
  isValidCertDuration,
} from "@/lib/marketing/med-cert-selector"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CATEGORY_STICKERS: Record<CertCategory, import("@/components/icons/stickers").StickerIconName> = {
  work: "briefcase",
  study: "graduation-cap",
  carer: "heart-with-pulse",
}

const CATEGORY_FEATURES: Record<CertCategory, readonly string[]> = {
  work: [
    "For ordinary sick leave or personal leave",
    "Standard workplace evidence details",
  ],
  study: [
    "For uni, TAFE, or course absence",
    "Study documentation without clinic travel",
  ],
  carer: [
    "For caring for a sick dependent",
    "Use when your leave is about someone else",
  ],
}

const REASSURANCE_POINTS = [
  "AHPRA-registered Australian doctor review",
  "1-3 day certificate options",
  "Refund if online review is not suitable",
] as const

// ---------------------------------------------------------------------------
// Search param auto-select
// ---------------------------------------------------------------------------

function SearchParamsAutoSelect({
  onAutoSelect,
  onDurationSelect,
}: {
  onAutoSelect: (cat: CertCategory) => void
  onDurationSelect: (duration: CertDuration) => void
}) {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const certType = searchParams.get("certType") || searchParams.get("utm_content")
    const duration = searchParams.get("duration")

    if (certType && ["work", "study", "carer"].includes(certType)) {
      onAutoSelect(certType as CertCategory)
    }

    if (duration && isValidCertDuration(duration)) {
      onDurationSelect(duration)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

// ---------------------------------------------------------------------------
// Component
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

  const selectedDuration = String(selectedDays) as CertDuration
  const selectedCategory = CERT_CATEGORIES.find((cat) => cat.id === selected) ?? null
  const selectedPrice = MED_CERT_DURATIONS.prices[selectedDays as keyof typeof MED_CERT_DURATIONS.prices]
  const selectedLabel = MED_CERT_DURATIONS.labels[selectedDays as keyof typeof MED_CERT_DURATIONS.labels]
  const ctaHref = buildMedCertRequestHref({
    category: selected,
    duration: selectedDuration,
  })

  const handleAutoSelect = (cat: CertCategory) => {
    setSelected((prev) => prev ?? cat)
  }

  const handleAutoDurationSelect = (duration: CertDuration) => {
    setSelectedDays(Number(duration))
  }

  const handleSelect = (category: CertCategory) => {
    setSelected(category)
    posthog?.capture(CERT_TYPE_POSTHOG_EVENT, {
      [CERT_TYPE_POSTHOG_PROPERTY]: category,
      [CERT_DURATION_POSTHOG_PROPERTY]: selectedDuration,
    })
  }

  const handleDurationSelect = (duration: CertDuration) => {
    setSelectedDays(Number(duration))
    posthog?.capture(CERT_DURATION_POSTHOG_EVENT, {
      [CERT_DURATION_POSTHOG_PROPERTY]: duration,
      [CERT_TYPE_POSTHOG_PROPERTY]: selected,
    })
  }

  const handleCtaClick = () => {
    posthog?.capture(CERT_SELECTOR_CTA_POSTHOG_EVENT, {
      action: selected ? "category_selected" : "choose_in_form",
      [CERT_TYPE_POSTHOG_PROPERTY]: selected,
      [CERT_DURATION_POSTHOG_PROPERTY]: selectedDuration,
    })
  }

  return (
    <section
      id="certificate-type"
      aria-label="Choose your certificate type"
      className={cn("py-10 lg:py-14 scroll-mt-20", className)}
    >
      <SearchParamsAutoSelect
        onAutoSelect={handleAutoSelect}
        onDurationSelect={handleAutoDurationSelect}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-white shadow-lg shadow-primary/[0.08] dark:border-white/15 dark:bg-card dark:shadow-none"
          initial={animate ? { opacity: 0, y: 8 } : {}}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="grid lg:grid-cols-[0.86fr_1.14fr]">
            <div className="border-b border-border/40 bg-muted/35 p-5 sm:p-7 lg:border-b-0 lg:border-r lg:p-8 dark:bg-white/[0.04]">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Faster setup
              </p>
              <Heading level="h2" className="mb-3 text-balance">
                Choose now, or choose inside the form.
              </Heading>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                If you already know what you need, we can pre-fill the first step.
                If not, start anyway and decide during intake.
              </p>

              <ul className="mt-6 space-y-2.5">
                {REASSURANCE_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 sm:p-5 lg:p-6">
              <div
                role="group"
                aria-label="Certificate category"
                className="grid gap-3 sm:grid-cols-3"
              >
                {CERT_CATEGORIES.map((cat) => {
                  const isSelected = selected === cat.id
                  const isMostChosen = cat.id === "work"
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelect(cat.id)}
                      aria-pressed={isSelected}
                      aria-describedby={`cert-${cat.id}-description`}
                      className={cn(
                        "group relative flex min-h-[104px] items-start gap-3 rounded-2xl border p-3.5 text-left",
                        "transition-[transform,box-shadow,border-color,background-color] duration-200",
                        isSelected
                          ? "border-primary bg-primary/[0.04] shadow-md shadow-primary/[0.08] ring-2 ring-primary/15"
                          : "border-border/60 bg-white hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md hover:shadow-primary/[0.08] dark:bg-card",
                      )}
                    >
                      <StickerIcon name={CATEGORY_STICKERS[cat.id]} size={36} className="shrink-0" />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-base font-semibold text-foreground">
                          {cat.label}
                          {isMostChosen && !isSelected && (
                            <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              Most chosen
                            </span>
                          )}
                        </span>
                        <span
                          id={`cert-${cat.id}-description`}
                          className="mt-1 block text-xs leading-relaxed text-muted-foreground"
                        >
                          {cat.description}
                        </span>
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-border/45 bg-muted/30 p-3.5 dark:bg-white/[0.04]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">How many days?</p>
                  <p className="text-xs text-muted-foreground">Max 3 days</p>
                </div>
                <div
                  role="group"
                  aria-label="Certificate duration"
                  className="grid grid-cols-3 gap-2"
                >
                  {MED_CERT_DURATIONS.options.map((days) => {
                    const duration = String(days) as CertDuration
                    const isActive = selectedDays === days
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleDurationSelect(duration)}
                        aria-pressed={isActive}
                        className={cn(
                          "min-h-14 rounded-xl border px-3 py-2 text-center transition-[transform,box-shadow,background-color,border-color] duration-150",
                          isActive
                            ? "border-primary bg-white text-foreground shadow-sm shadow-primary/[0.06] ring-1 ring-primary/15 dark:bg-card"
                            : "border-border/50 bg-white/60 text-muted-foreground hover:-translate-y-0.5 hover:border-primary/35 dark:bg-card/70",
                        )}
                      >
                        <span className={cn("block text-sm font-semibold", isActive && "text-primary")}>
                          {MED_CERT_DURATIONS.labels[days as keyof typeof MED_CERT_DURATIONS.labels]}
                        </span>
                        <span className="mt-0.5 block text-xs">
                          ${MED_CERT_DURATIONS.prices[days as keyof typeof MED_CERT_DURATIONS.prices].toFixed(2)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <motion.div
                key={`${selected ?? "none"}-${selectedDays}`}
                className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4"
                initial={animate ? { opacity: 0, y: 6 } : {}}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      {selectedCategory ? selectedCategory.label : "Choose during the form"}
                    </p>
                    <Heading level="h3" className="mt-1">
                      {selectedCategory
                        ? `${selectedLabel} certificate, ready to start.`
                        : `${selectedLabel} certificate from $${selectedPrice.toFixed(2)}.`}
                    </Heading>
                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {(selectedCategory ? CATEGORY_FEATURES[selectedCategory.id] : REASSURANCE_POINTS.slice(0, 2)).map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="md:min-w-[230px]">
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full px-5 font-semibold shadow-md shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
                    >
                      <Link href={ctaHref} onClick={handleCtaClick}>
                        {selectedCategory ? "Get this certificate" : "Start request"}
                        <span className="text-primary-foreground/80">· ${selectedPrice.toFixed(2)}</span>
                        <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      You can change this inside the form.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

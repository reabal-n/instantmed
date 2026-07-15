import { ArrowDown, ArrowRight, Droplets, HeartPulse, RefreshCw, Stethoscope } from "lucide-react"
import Link from "next/link"

import { Heading } from "@/components/ui/heading"
import { FORM_FIRST_WEDGE } from "@/lib/marketing/voice"

/**
 * Two-lane visual for the narrow women's-health hub. It makes UTI symptoms
 * and starting/switching the pill equal first-class pathways, then reunites
 * them at the shared doctor-review boundary.
 */
export function WomensHealthDecisionFork() {
  return (
    <figure
      aria-labelledby="womens-health-decision-title"
      className="w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/50 bg-white shadow-md shadow-primary/[0.06] dark:border-white/15 dark:bg-card dark:shadow-none sm:w-[360px]"
    >
      <figcaption className="border-b border-border/50 px-5 py-4 dark:border-white/10">
        <p className="text-xs font-medium text-primary">Choose the safety screen that fits</p>
        <Heading id="womens-health-decision-title" level="h3" as="h2" className="mt-1">
          UTI symptoms or the pill?
        </Heading>
      </figcaption>

      <div className="relative px-4 py-5">
        <span
          className="absolute bottom-8 left-1/2 top-8 w-px -translate-x-1/2 bg-border"
          aria-hidden="true"
        />

        <Link
          href="/uti-assessment-online"
          className="relative mr-8 flex min-h-24 items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 outline-none hover:border-sky-400 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-sky-800 dark:bg-sky-950/35"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white dark:bg-sky-400 dark:text-sky-950">
            <Droplets className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">UTI symptoms</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Urinary symptoms plus red-flag screening.
            </span>
          </span>
          <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden="true" />
        </Link>

        <div
          className="relative z-10 mx-auto my-3 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-[10px] font-semibold text-muted-foreground"
          aria-hidden="true"
        >
          OR
        </div>

        <Link
          href="/contraceptive-pill-assessment-online"
          className="relative ml-8 flex min-h-24 items-start gap-3 rounded-xl border border-pink-200 bg-pink-50 p-4 outline-none hover:border-pink-400 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-pink-800 dark:bg-pink-950/35"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-600 text-white dark:bg-pink-400 dark:text-pink-950">
            <HeartPulse className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Start or switch the pill</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Health history and prescribing safety screen.
            </span>
          </span>
          <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-pink-700 dark:text-pink-300" aria-hidden="true" />
        </Link>

        <ArrowDown
          className="relative z-10 mx-auto mt-4 h-4 w-4 bg-white text-primary dark:bg-card"
          aria-hidden="true"
        />

        <div className="relative z-10 mt-3 rounded-xl bg-muted/45 p-4 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
            Doctor review before prescribing
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {FORM_FIRST_WEDGE}
          </p>
        </div>
      </div>

      <Link
        href="/prescriptions"
        className="flex items-center justify-between gap-3 border-t border-border/50 px-5 py-3 text-xs text-muted-foreground outline-none hover:bg-muted/35 hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary dark:border-white/10"
      >
        <span className="inline-flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Continuing the same pill? Check repeat prescriptions.
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </figure>
  )
}

import { ArrowDownToLine, Check } from "lucide-react"

import { cn } from "@/lib/utils"

/** A clearly marked, fictional excerpt using the delivered certificate's wording. */
export function MedCertHeroMockup({ compact = false }: { compact?: boolean }) {
  return (
    <figure data-hero-facsimile="" aria-label="Example medical certificate, specimen only" className="relative mx-auto w-full max-w-md">
      <div className={cn("relative overflow-hidden rounded-2xl border border-border/60 bg-white shadow-xl shadow-primary/[0.08] dark:bg-card dark:shadow-none", compact ? "p-5" : "p-6 sm:p-8")}>
        <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-5">
          <span className="text-lg font-semibold tracking-tight text-primary">InstantMed<span className="text-brand-coral">.</span></span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Specimen</span>
        </div>
        <div className="py-6 sm:py-8">
          <p className="text-sm text-muted-foreground">23 September 2026</p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">Medical certificate</p>
          <p className="mt-6 text-sm italic text-muted-foreground">To whom it may concern,</p>
          <p className="mt-4 text-base leading-7 text-foreground/85">
            I certify that <strong className="font-semibold text-foreground">Alex Taylor</strong> consulted me on 23 September 2026. Based on my assessment, they were unable to attend their usual work duties on 23 September 2026.
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">This certificate relates to the absence stated above.</p>
          <div className="mt-6 border-t border-border/50 pt-4">
            <p className="text-sm font-medium text-foreground">AHPRA-registered medical practitioner</p>
            <p className="mt-1 text-sm text-muted-foreground">Practitioner details appear on your certificate.</p>
          </div>
        </div>
        <div className="border-t border-border/60 pt-4 text-sm leading-6 text-muted-foreground">
          <p className="font-[ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation_Mono','Courier_New',monospace] text-foreground">Reference: SPECIMEN</p>
          <p>Check authenticity at <span className="text-primary">instantmed.com.au/verify</span></p>
        </div>
      </div>
      {!compact && <figcaption className="hero-delivery-enter relative mx-4 -mt-3 flex items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 shadow-md shadow-primary/[0.06] dark:bg-card dark:shadow-none">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success-light text-success"><Check className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">Your certificate, ready to download</p><p className="text-sm text-muted-foreground">Secure link delivered by email</p></div>
        <ArrowDownToLine className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </figcaption>}
    </figure>
  )
}

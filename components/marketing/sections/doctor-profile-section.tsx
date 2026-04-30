import { BadgeCheck } from "lucide-react"

import { StickerIcon } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// COMPONENT
// =============================================================================

/** Doctor profile - trust signal, med-cert page only */
export function DoctorProfileSection() {
  return (
    <section aria-label="Reviewed by a real doctor" className="py-16 lg:py-20 bg-muted/20 dark:bg-muted/10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06] dark:shadow-none p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Icon */}
            <div className="shrink-0">
              <StickerIcon name="medical-doctor" size={64} />
            </div>

            {/* Details */}
            <div className="text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">AHPRA Verified</span>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                AHPRA-registered GPs
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every request is reviewed and approved by an experienced,
                AHPRA-registered Australian doctor. No automated clinical decisions.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Verify any doctor&apos;s registration on the{" "}
                <a
                  href="https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  AHPRA public register
                </a>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

import { Check } from "lucide-react"
import Image from "next/image"

import { InteractiveProductMockup } from "@/components/marketing/shared/interactive-product-mockup"
import { Heading } from "@/components/ui/heading"
import { Reveal } from "@/components/ui/reveal"
import { SectionPill } from "@/components/ui/section-pill"
import { cn } from "@/lib/utils"

// =============================================================================
// DATA
// =============================================================================

const KEY_FACTS = [
  "Accepted at every pharmacy in Australia",
  "No paper scripts or printing needed",
  "PBS subsidies apply at the pharmacy",
  "Includes repeats where appropriate",
  "National standard since 2020",
]

// =============================================================================
// COMPONENT
// =============================================================================

interface EScriptExplainerSectionProps {
  /**
   * Optional photographic accent rendered as a framed banner BELOW the
   * mockup + facts split. Used by /prescriptions to relocate its hero
   * lifestyle photo (rx-1.webp) into a contextual content moment instead
   * of a 16:9 scroll-break.
   */
  accentImage?: { src: string; alt: string }
  className?: string
}

/** eScript explainer - split layout with interactive phone mockup + key facts */
export function EScriptExplainerSection({ accentImage, className }: EScriptExplainerSectionProps = {}) {
  return (
    <section aria-label="What is an eScript" className={cn("py-16 lg:py-24", className)}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Reveal className="text-center mb-12">
          <SectionPill>Digital prescriptions</SectionPill>
          <Heading level="h2" className="mt-4 mb-3">
            What is an eScript?
          </Heading>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            eScripts are digital prescriptions. The national standard in
            Australia since 2020. No paper needed, works everywhere.
          </p>
        </Reveal>

        {/* Split layout: mockup + facts */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Phone mockup */}
          <InteractiveProductMockup variant="escript" className="max-w-[280px] mx-auto w-full">
            <div className="px-5 py-4">
              {/* Status bar */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-4">
                <span className="font-medium">InstantMed</span>
                <span>2:34 PM</span>
              </div>

              {/* SMS bubble */}
              <div className="bg-muted/40 dark:bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 mb-3">
                <p className="text-xs font-medium text-foreground mb-1">eScript Ready</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Your electronic prescription is ready. Show this token at any pharmacy in Australia.
                </p>
              </div>

              {/* Token card */}
              <div className="bg-white dark:bg-card rounded-xl border border-border/30 p-3.5 shadow-sm shadow-primary/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Prescription Token
                  </span>
                  <span className="text-[10px] text-success font-medium">Active</span>
                </div>
                <div className="text-sm font-mono font-semibold text-primary tracking-wide">
                  ABCD-1234-EFGH
                </div>
                <div className="mt-2 pt-2 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground">Atorvastatin 40mg</p>
                  <p className="text-[10px] text-muted-foreground">
                    Qty: 30 &middot; Repeats: 5
                  </p>
                </div>
              </div>

              {/* Bottom hint */}
              <p className="text-[10px] text-muted-foreground text-center mt-3 pb-1">
                Show to any pharmacist to collect
              </p>
            </div>
          </InteractiveProductMockup>

          {/* Key facts */}
          <Reveal>
            <ul className="space-y-4">
              {KEY_FACTS.map((fact) => (
                <li key={fact} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span className="text-sm text-foreground leading-relaxed">{fact}</span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
              eScripts were introduced by the Australian Government in 2020 as
              the national standard for electronic prescriptions. They work with
              the same medications and PBS subsidies as paper scripts.
            </p>
          </Reveal>
        </div>

        {/* Optional photographic accent — small, framed, contextual.
            Used by /prescriptions for its lifestyle photo. */}
        {accentImage && (
          <Reveal className="mt-12 lg:mt-16">
            <div className="relative aspect-[16/7] sm:aspect-[16/6] lg:aspect-[16/5] max-w-3xl mx-auto rounded-2xl overflow-hidden border border-border/40 shadow-lg shadow-primary/[0.06] dark:shadow-none">
              <Image
                src={accentImage.src}
                alt={accentImage.alt}
                fill
                className="object-cover object-center"
                loading="lazy"
                quality={85}
                sizes="(max-width: 1024px) calc(100vw - 4rem), 768px"
              />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

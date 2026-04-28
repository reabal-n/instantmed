import { CheckCircle2 } from "lucide-react"
import { type ReactNode } from "react"

import { Heading } from "@/components/ui/heading"
import { cn } from "@/lib/utils"

interface ServiceClaimSectionProps {
  /**
   * Small uppercase eyebrow above the headline. e.g. "Pharmacy pricing",
   * "Accepted everywhere it counts". Renders in success-green tracking.
   */
  eyebrow: string
  /**
   * The display claim. Pass a string for plain text, or pass JSX to highlight
   * a span (e.g. <><span className="text-success">PBS subsidies</span> apply.</>).
   */
  headline: ReactNode
  /** Supporting paragraph below the headline. */
  body?: ReactNode
  /**
   * Optional content rendered inside the card after the body. Used for
   * things like the EmployerCalloutStrip scrolling-logo marquee, or
   * footer link rows separated by a hairline.
   */
  children?: ReactNode
  className?: string
}

/**
 * Service-page "superpower" claim section.
 *
 * One per service page, anchoring the page's strongest trust signal in a
 * Morning Canvas warm card. Used by:
 *   - /medical-certificate → EmployerCalloutStrip (98% AU employers accept)
 *   - /prescriptions → PBSCalloutStrip (PBS subsidies apply)
 *   - future service pages get a consistent superpower-section pattern.
 *
 * Visual treatment:
 *   - Soft peach radial backdrop (Morning Canvas warmth)
 *   - White rounded-3xl card with shadow-lg
 *   - Eyebrow → display-tier headline → supporting body → optional children
 */
export function ServiceClaimSection({
  eyebrow,
  headline,
  body,
  children,
  className,
}: ServiceClaimSectionProps) {
  return (
    <section
      className={cn(
        "relative py-10 sm:py-14 lg:py-16 overflow-hidden",
        className,
      )}
    >
      {/* Morning Canvas warmth — soft peach radial that fades into ivory.
          Anchors the section as a warm trust moment. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 dark:opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(245, 198, 160, 0.18) 0%, rgba(245, 198, 160, 0.06) 40%, transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.08] dark:shadow-none p-7 sm:p-10 lg:p-12">
          <div className="text-center mb-6 sm:mb-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-success uppercase tracking-[0.12em] mb-3">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {eyebrow}
            </p>
            <Heading level="h1" as="h2" className="mb-3 text-balance">
              {headline}
            </Heading>
            {body && (
              <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                {body}
              </p>
            )}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}

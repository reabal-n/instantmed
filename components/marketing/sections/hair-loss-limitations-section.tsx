import { CheckCircle2, AlertCircle } from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const CAN_HELP = [
  "Androgenetic alopecia (male-pattern hair loss)",
  "Repeat treatment prescriptions for hair loss",
  "First-time assessment for men experiencing thinning or recession",
] as const

const SEE_GP_IN_PERSON = [
  "Sudden or patchy hair loss",
  "Hair loss with scalp pain, redness, or scaling",
  "Female-pattern hair loss with other symptoms (possible hormonal investigation needed)",
  "Hair loss in children or adolescents",
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Pre-qualifies hair loss patients before pricing - honest scope boundary */
export function HairLossLimitationsSection() {
  return (
    <section aria-label="Hair loss service scope" className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-2">
            Is online hair loss treatment right for you?
          </h2>
          <p className="text-sm text-muted-foreground">
            Honest about what we can and can't do - before you pay.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Can help with */}
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                What we can help with
              </h3>
            </div>
            <ul className="space-y-2.5">
              {CAN_HELP.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                >
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* See a GP in person */}
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                When to see a GP in person
              </h3>
            </div>
            <ul className="space-y-2.5">
              {SEE_GP_IN_PERSON.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                >
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

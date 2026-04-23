import { AlertCircle,CheckCircle2, Info } from "lucide-react"

// =============================================================================
// DATA
// =============================================================================

const WHAT_IT_DOES = [
  "Restores erectile function in the majority of patients screened appropriately.",
  "Works with sexual stimulation - not instead of it.",
  "Well-tolerated by most healthy adults once the safety questionnaire clears them.",
] as const

const WHAT_IT_DOESNT = [
  "Not an aphrodisiac - it doesn't create desire on its own.",
  "Doesn't address underlying cardiovascular risk factors. Those need a separate conversation with your doctor.",
  "Not a substitute for addressing mental health or relationship stress when those are the driver.",
] as const

const NOT_APPROPRIATE = [
  "Currently taking nitrates (e.g. GTN spray, isosorbide mononitrate).",
  "Taking alpha-blockers without GP clearance (e.g. tamsulosin, prazosin).",
  "Recent heart attack or stroke (within 6 months).",
  "Severe heart disease or unstable angina.",
  "Certain eye conditions (e.g. non-arteritic ischaemic optic neuropathy).",
  "Significant liver or kidney disease.",
] as const

// =============================================================================
// COMPONENT
// =============================================================================

/** Balanced three-column framing: what treatment does / doesn't / when it's not appropriate */
export function EdOutcomesSection() {
  return (
    <section aria-label="ED treatment outcomes and boundaries" className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            What treatment is - and isn&apos;t
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Balanced framing so you know what you&apos;re signing up for.
          </p>
        </div>

        {/* Three-column grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Column 1: What treatment typically does */}
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 mb-4">
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
              <span className="text-xs font-semibold text-success">
                What treatment typically does
              </span>
            </div>
            <ul className="space-y-2.5">
              {WHAT_IT_DOES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                >
                  <CheckCircle2
                    className="h-4 w-4 text-success shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: What it doesn't do */}
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 mb-4">
              <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-semibold text-muted-foreground">
                What it doesn&apos;t do
              </span>
            </div>
            <ul className="space-y-2.5">
              {WHAT_IT_DOESNT.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                >
                  <Info
                    className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: When it's not appropriate */}
          <div className="rounded-2xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 mb-4">
              <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />
              <span className="text-xs font-semibold text-warning">
                When it&apos;s not appropriate
              </span>
            </div>
            <ul className="space-y-2.5">
              {NOT_APPROPRIATE.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                >
                  <AlertCircle
                    className="h-4 w-4 text-warning shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground italic leading-relaxed">
              The safety questionnaire screens for these, and the doctor confirms before prescribing.
            </p>
          </div>
        </div>

        {/* Clinical references */}
        <p className="text-[10px] text-muted-foreground text-center mt-8 max-w-3xl mx-auto leading-relaxed">
          PDE5 inhibitors restore erectile function in 60-70% of men across all aetiologies (Hatzimouratidis et al., <em>Eur Urol</em>, 2010). Nitrate co-administration contraindication per TGA Product Information and ACC/AHA guidelines. Telehealth-delivered ED assessment shows equivalent prescribing accuracy to face-to-face consultation (Ellimoottil et al., <em>J Urol</em>, 2022).
        </p>
      </div>
    </section>
  )
}

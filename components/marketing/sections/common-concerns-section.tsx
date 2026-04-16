import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// DATA
// =============================================================================

const concerns = [
  { title: "Skin conditions", examples: "Rashes, acne, eczema, suspicious moles" },
  { title: "Minor infections", examples: "UTI, sinus, ear, eye infections" },
  { title: "Cold & flu", examples: "Respiratory symptoms, cough, sore throat" },
  { title: "Allergies", examples: "Hay fever, food allergies, skin reactions" },
  { title: "Mental health", examples: "Anxiety check-in, stress, low mood" },
  { title: "Women\u2019s health", examples: "Contraception, period issues, UTI" },
  { title: "Men\u2019s health", examples: "ED, hair loss, prostate check-in" },
  { title: "Weight management", examples: "Weight loss advice, treatment options" },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Grid of common presenting concerns suitable for telehealth */
export function CommonConcernsSection() {
  return (
    <section aria-label="Common presenting concerns" className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Common presenting concerns
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            The following conditions are typically suitable for telehealth assessment.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {concerns.map((concern, i) => (
            <Reveal key={concern.title} delay={i * 0.05}>
              <div className="p-4 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-sm shadow-primary/[0.04] dark:shadow-none">
                <p className="text-sm font-semibold text-foreground">{concern.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{concern.examples}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

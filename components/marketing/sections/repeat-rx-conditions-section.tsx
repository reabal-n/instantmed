import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"

// =============================================================================
// DATA
// =============================================================================

const CONDITIONS: Array<{
  sticker: StickerIconName
  title: string
  subtitle: string
}> = [
  { sticker: "heart-with-pulse", title: "Blood pressure",      subtitle: "ACE inhibitors, ARBs, calcium channel blockers" },
  { sticker: "scales",           title: "Cholesterol",         subtitle: "Statins and lipid-lowering therapy" },
  { sticker: "heart",            title: "Contraceptives",      subtitle: "Oral contraceptive pill and hormonal methods" },
  { sticker: "lungs",            title: "Asthma",              subtitle: "Preventers, relievers, and combination inhalers" },
  { sticker: "pill-bottle",      title: "Acid reflux",         subtitle: "Proton pump inhibitors and H2 blockers" },
  { sticker: "synchronize",      title: "Thyroid",             subtitle: "Levothyroxine and thyroid hormone replacement" },
  { sticker: "brain",            title: "Mental health",       subtitle: "Stable antidepressants and anti-anxiety (existing Rx)" },
  { sticker: "diabetes",         title: "Type 2 diabetes",     subtitle: "Metformin and stable oral hypoglycaemics" },
  { sticker: "bandage",          title: "Skin conditions",     subtitle: "Topical steroids, retinoids, and stable treatments" },
  { sticker: "stethoscope",      title: "General medicine",    subtitle: "Most stable, ongoing medications not listed above" },
]

// =============================================================================
// COMPONENT
// =============================================================================

export function RepeatRxConditionsSection() {
  return (
    <section aria-label="Conditions we prescribe for" className="py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
            Conditions we prescribe for
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Repeat prescriptions for stable, ongoing medications. If you&apos;re already on it and it&apos;s working, we can renew it.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CONDITIONS.map((condition, i) => (
            <Reveal key={condition.title} delay={Math.min(i, 4) * 0.05}>
              <div className="group flex flex-col items-center text-center rounded-2xl border border-border/50 bg-white dark:bg-card p-4 shadow-sm shadow-primary/[0.04] hover:shadow-md hover:shadow-primary/[0.07] hover:-translate-y-0.5 transition-all duration-200">
                <StickerIcon name={condition.sticker} size={44} className="mb-3" />
                <p className="text-sm font-semibold text-foreground leading-tight mb-1">
                  {condition.title}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                  {condition.subtitle}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15} className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Can&apos;t see your medication?{" "}
            <a href="/request?service=scripts" className="text-primary hover:underline underline-offset-2">
              Submit your request
            </a>{" "}
            and the doctor will let you know if it&apos;s suitable.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

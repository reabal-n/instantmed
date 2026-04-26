import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { Reveal } from "@/components/ui/reveal"
import { PRICING_DISPLAY } from "@/lib/constants"

// =============================================================================
// DATA
// =============================================================================

const consults: Array<{
  icon: StickerIconName
  title: string
  description: string
  price: string
  href: string
}> = [
  {
    icon: 'security-shield',
    title: "Erectile Dysfunction",
    description:
      "Discreet assessment and treatment. Clinically proven medications prescribed if appropriate.",
    price: PRICING_DISPLAY.MENS_HEALTH,
    href: "/erectile-dysfunction",
  },
  {
    icon: 'hair-brush',
    title: "Hair Loss",
    description:
      "Medical assessment for hair loss. Evidence-based treatments prescribed by an Australian GP.",
    price: PRICING_DISPLAY.HAIR_LOSS,
    href: "/hair-loss",
  },
  {
    icon: 'stethoscope',
    title: "Women\u2019s Health",
    description:
      "Contraception, hormonal concerns, and general women\u2019s health. Compassionate, confidential care.",
    price: PRICING_DISPLAY.WOMENS_HEALTH,
    href: "/request?service=consult&subtype=womens-health",
  },
  {
    icon: 'medical-history',
    title: "Weight Management",
    description:
      "Doctor-guided weight management plans. Medication options discussed if clinically appropriate.",
    price: PRICING_DISPLAY.WEIGHT_LOSS,
    href: "/request?service=consult&subtype=weight-loss",
  },
]

// =============================================================================
// COMPONENT
// =============================================================================

/** Specialised consultation type cards with pricing and links */
export function SpecialisedConsultsSection() {
  return (
    <section aria-label="Specialised consultations" className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Specialised consultations
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">
            Looking for something specific? Dedicated pathways with doctors experienced in these
            areas.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {consults.map((consult, i) => (
            <Reveal key={consult.title} delay={i * 0.05}>
              <Link
                href={consult.href}
                className="group flex flex-col h-full rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-md shadow-primary/[0.06] dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 transition-[transform,box-shadow]"
              >
                <div className="flex-1 p-5">
                  <div className="mb-3">
                    <StickerIcon name={consult.icon} size={40} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{consult.title}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {consult.description}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-border/50 dark:border-white/10 px-5 py-3">
                  <span className="text-sm font-semibold text-foreground">{consult.price}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

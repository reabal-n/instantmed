import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/ui/reveal"
import { getPatientCount } from "@/lib/social-proof"

interface ServiceFinalCTAProps {
  title: string
  ctaHref: string
  price: number
  onCTAClick?: () => void
  isDisabled?: boolean
  subtitle?: string
  ctaText?: string
}

export function ServiceFinalCTA({
  title,
  ctaHref,
  price,
  onCTAClick,
  isDisabled,
  subtitle,
  ctaText,
}: ServiceFinalCTAProps) {
  const defaultSubtitle = `Trusted by ${getPatientCount().toLocaleString()}+ Australians. Fill a short form, a doctor reviews it, and your treatment is sent same day.`

  return (
    <section aria-label="Get started" className="py-20 lg:py-24 bg-linear-to-br from-primary/5 via-primary/10 to-sky-100/50 dark:from-primary/10 dark:via-primary/5 dark:to-card">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground mb-4 tracking-tight">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            {subtitle ?? defaultSubtitle}
          </p>
          <Button
            asChild
            size="lg"
            className="px-10 h-14 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-[transform,box-shadow]"
            onClick={onCTAClick}
            disabled={isDisabled}
          >
            <Link href={isDisabled ? "/contact" : ctaHref}>
              {isDisabled ? "Contact us" : (ctaText ?? "Start your assessment")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-muted-foreground text-sm font-medium">
            ${price.toFixed(2)} &middot; No account required
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Takes about 2 minutes &middot; Full refund if we can&apos;t help
          </p>
        </Reveal>
      </div>
    </section>
  )
}

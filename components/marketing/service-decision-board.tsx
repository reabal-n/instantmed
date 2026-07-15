import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { Button } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { getActiveServiceDecisions, type ServiceDecision } from "@/lib/marketing/service-decisions"
import { FORM_FIRST_WEDGE } from "@/lib/marketing/voice"
import { cn } from "@/lib/utils"

interface ServiceDecisionBoardProps {
  className?: string
  id?: string
}

function ServiceChoiceCard({
  decision,
  featured,
}: {
  decision: ServiceDecision
  featured: boolean
}) {
  return (
    <article
      data-service-id={decision.id}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border bg-white p-5 transition-colors dark:bg-card sm:p-6",
        featured
          ? "border-primary/25 shadow-md shadow-primary/[0.06] hover:border-primary/45 dark:border-primary/35"
          : "border-border/60 shadow-sm shadow-primary/[0.04] hover:border-primary/30 dark:border-white/15 dark:shadow-none",
      )}
    >
      <header className="flex min-w-0 items-start gap-4">
        <ServiceIconTile
          iconKey={decision.iconKey}
          color={decision.colorToken}
          size={featured ? "lg" : "md"}
          variant="sticker"
          stickerLoading="eager"
        />
        <div className="min-w-0 flex-1">
          <Heading level="h3" className="text-xl sm:text-2xl">
            {decision.title}
          </Heading>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {decision.suitability}
          </p>
        </div>
      </header>

      <div className="mt-5 border-t border-border/50 pt-5 dark:border-white/10">
        <p className="text-xs font-medium text-muted-foreground">Request fee</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {decision.pricePrefix ? `${decision.pricePrefix} ` : null}
          {decision.price}
          <span className="ml-1 text-sm font-normal text-muted-foreground">AUD</span>
        </p>
      </div>

      {decision.doctorRole ? (
        <div className="mt-5 rounded-xl bg-muted/35 p-4 dark:bg-white/[0.04]">
          <p className="text-xs font-medium text-foreground">Clinical path</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {decision.doctorRole}
          </p>
        </div>
      ) : null}

      <div className="mt-auto pt-6">
        <Button asChild size="lg" className="h-auto min-h-12 w-full whitespace-normal py-3 text-center">
          <Link href={decision.requestHref}>
            {decision.ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <Link
          href={decision.marketingHref}
          className="mt-3 block rounded-md text-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Learn about {decision.title.toLowerCase()}
        </Link>
      </div>

    </article>
  )
}

export function ServiceDecisionBoard({
  className,
  id = "service-choices",
}: ServiceDecisionBoardProps) {
  const decisions = getActiveServiceDecisions()
  const core = decisions.filter(({ group }) => group === "core")
  const focused = decisions.filter(({ group }) => group === "focused")

  return (
    <section id={id} aria-label="Choose a service" className={cn("scroll-mt-24", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <aside
          aria-label="Prescription review model"
          className="mb-10 max-w-3xl rounded-2xl border border-border/60 bg-muted/25 p-5 dark:border-white/15 dark:bg-white/[0.03] sm:p-6"
        >
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-primary">
            Prescription requests
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            {FORM_FIRST_WEDGE}
          </p>
        </aside>

        <section aria-labelledby={`${id}-core`}>
          <div className="mb-6 max-w-2xl">
            <Heading id={`${id}-core`} level="h2" className="text-2xl sm:text-3xl">
              Common requests
            </Heading>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Short certificates and repeat medication reviews, with the fee shown before you start.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2">
            {core.map((decision) => (
              <ServiceChoiceCard
                key={decision.id}
                decision={decision}
                featured
              />
            ))}
          </div>
        </section>

        <section aria-labelledby={`${id}-focused`} className="mt-12 sm:mt-16">
          <div className="mb-6 max-w-2xl">
            <Heading id={`${id}-focused`} level="h2" className="text-2xl sm:text-3xl">
              Focused assessments
            </Heading>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Private, condition-specific pathways with structured safety screening and doctor review.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-3">
            {focused.map((decision) => (
              <ServiceChoiceCard
                key={decision.id}
                decision={decision}
                featured={false}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

import { ArrowDown, ArrowRight, ClipboardCheck, Send, Stethoscope } from "lucide-react"
import Link from "next/link"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { Heading } from "@/components/ui/heading"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { FORM_FIRST_WEDGE } from "@/lib/marketing/voice"
import {
  getActiveServices,
  getServiceMarketingHref,
} from "@/lib/services/service-catalog"

const CLINICAL_SPINE = [
  {
    icon: ClipboardCheck,
    title: "Secure clinical form",
    body: "Questions change with the service and its safety rules.",
  },
  {
    icon: Stethoscope,
    title: "Clinical review path",
    body: "Prescribing requests receive doctor review before any prescription is issued.",
  },
  {
    icon: Send,
    title: "Digital outcome",
    body: "If appropriate, the result is delivered digitally with the next step.",
  },
] as const

const CLINICAL_REVIEW_SEQUENCE = getApprovedClaim("clinical_review_sequence")

/**
 * Homepage portfolio map: five bounded service doorways feeding one shared
 * clinical system. This replaces generic lifestyle photography with a useful
 * model of how the active portfolio actually works.
 */
export function PortfolioRouteMap() {
  const services = getActiveServices()

  return (
    <section aria-labelledby="portfolio-route-map-title" className="px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-primary text-primary-foreground">
        <div className="grid lg:grid-cols-[minmax(0,0.86fr)_auto_minmax(0,1.14fr)]">
          <div className="p-6 sm:p-10 lg:p-12">
            <p className="text-sm font-medium text-primary-foreground">
              The active InstantMed portfolio
            </p>
            <Heading
              id="portfolio-route-map-title"
              level="h1"
              as="h2"
              className="mt-3 max-w-xl text-primary-foreground"
            >
              Five doorways. One clinical system.
            </Heading>
            <p className="mt-4 max-w-xl text-sm leading-6 text-primary-foreground sm:text-base sm:leading-7">
              Choose the focused service that fits. Each route starts with its own secure form and follows service-specific safety rules.
            </p>

            <nav aria-label="Active service pathways" className="mt-8">
              <ul className="divide-y divide-primary-foreground/15 border-y border-primary-foreground/15">
                {services.map((service) => (
                  <li key={service.id}>
                    <Link
                      href={getServiceMarketingHref(service)}
                      className="flex min-h-14 items-center gap-3 py-3 text-primary-foreground outline-none hover:bg-primary-foreground/[0.06] focus-visible:bg-primary-foreground/[0.1] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground"
                    >
                      <ServiceIconTile
                        iconKey={service.iconKey}
                        color={service.colorToken}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold sm:text-base">
                          {service.title}
                        </span>
                        {service.id === "womens-health" ? (
                          <span className="mt-0.5 block text-xs text-primary-foreground">
                            UTI symptoms + start/switch pill
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-primary-foreground">
                        {service.pricePrefix ? `${service.pricePrefix} ` : null}
                        {service.price}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="hidden items-center lg:flex" aria-hidden="true">
            <div className="h-px w-12 bg-primary-foreground/35" />
            <ArrowRight className="h-5 w-5 text-primary-foreground/70" />
          </div>

          <div className="relative bg-background p-6 text-foreground sm:p-10 lg:p-12">
            <div className="mb-7 flex items-center gap-3 lg:hidden" aria-hidden="true">
              <div className="h-px flex-1 bg-border" />
              <ArrowDown className="h-5 w-5 text-primary" />
              <div className="h-px flex-1 bg-border" />
            </div>
            <p className="text-sm font-medium text-primary">The shared clinical spine</p>
            <ol className="mt-7">
              {CLINICAL_SPINE.map((step, index) => {
                const Icon = step.icon

                return (
                  <li
                    key={step.title}
                    className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 pb-8 last:pb-0"
                  >
                    {index < CLINICAL_SPINE.length - 1 ? (
                      <span
                        className="absolute bottom-1 left-5 top-10 w-px bg-border"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {index + 1}
                      </span>
                      <Heading level="h3" className="mt-1">
                        {step.title}
                      </Heading>
                      <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>

            <p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
              {CLINICAL_REVIEW_SEQUENCE} {FORM_FIRST_WEDGE}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

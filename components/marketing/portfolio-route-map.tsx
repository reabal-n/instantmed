"use client"

import { AlertCircle, ArrowRight, Check, ClipboardCheck, Heart, Leaf, Pill, Scale, Sparkles, Stethoscope } from "lucide-react"
import Link from "next/link"

import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { Heading } from "@/components/ui/heading"
import { FORM_FIRST_WEDGE } from "@/lib/marketing/voice"
import {
  getActiveServices,
  getServiceMarketingHref,
  getServiceRequestHref,
  type ServiceDef,
} from "@/lib/services/service-catalog"
import { cn } from "@/lib/utils"

const SERVICE_DETAILS: Record<
  ServiceDef["id"],
  { benefits: readonly [string, string]; cta: string }
> = {
  "med-cert": {
    benefits: ["Work, study or carer's leave", "No Medicare card needed"],
    cta: "Get a certificate",
  },
  "repeat-rx": {
    benefits: ["For your regular medication", "Doctor review before prescribing"],
    cta: "Get your repeat",
  },
  ed: {
    benefits: ["Private doctor assessment", "eScript if the doctor prescribes"],
    cta: "View ED assessment",
  },
  "hair-loss": {
    benefits: ["Doctor-assessed options", "eScript if the doctor prescribes"],
    cta: "View hair loss assessment",
  },
  "womens-health": {
    benefits: ["UTI symptoms or start/switch pill", "Doctor-reviewed safety screen"],
    cta: "View women's health",
  },
  "weight-loss": {
    benefits: ["Eligibility screening first", "Doctor calls when history needs it"],
    cta: "View weight management",
  },
}

function getHomepageServiceHref(service: ServiceDef): string {
  return service.id === "med-cert" || service.id === "repeat-rx"
    ? getServiceRequestHref(service)
    : getServiceMarketingHref(service)
}

function ServiceCard({ service }: { service: ServiceDef }) {
  const { isServiceDisabled } = useServiceAvailability()
  const disabled = isServiceDisabled(service.id)
  const detail = SERVICE_DETAILS[service.id]
  const Icon = { "med-cert": ClipboardCheck, "repeat-rx": Pill, ed: Heart, "hair-loss": Leaf, "womens-health": Sparkles, "weight-loss": Scale }[service.id]

  return (
    <li className="min-w-0">
      <Link
        href={disabled ? "/contact" : getHomepageServiceHref(service)}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        className={cn(
          "group relative grid h-full grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-border/60 bg-white p-4 sm:flex sm:min-h-64 sm:flex-col sm:items-stretch sm:rounded-2xl sm:p-6 shadow-sm shadow-primary/[0.04] outline-none transition-[transform,translate,box-shadow,border-color] duration-200 motion-reduce:transform-none motion-reduce:transition-none dark:border-white/15 dark:bg-card dark:shadow-none sm:p-6",
          disabled
            ? "pointer-events-none opacity-60"
            : "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.06] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        )}
      >
        {disabled ? (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-warning-light px-2.5 py-1 text-sm font-medium text-warning">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Unavailable
          </span>
        ) : null}

        <Icon className="row-span-2 h-5 w-5 text-primary sm:mb-3 sm:h-7 sm:w-7" aria-hidden="true" />
        <Heading level="h3" className="col-start-2 row-start-1 text-base sm:mt-2 sm:text-xl">{service.title}</Heading>
        <p className="col-start-2 row-start-2 text-sm leading-5 text-muted-foreground sm:mt-1.5 sm:text-base sm:leading-6">{service.subtitle}</p>
        <p className="col-start-3 row-start-1 self-center text-sm font-semibold tabular-nums sm:mt-4 sm:text-lg">{service.pricePrefix ? `${service.pricePrefix} ` : null}{service.price}</p>
        <ArrowRight className="col-start-3 row-start-2 ml-auto h-4 w-4 text-primary sm:hidden" aria-hidden="true" />

        <ul className="mt-4 hidden space-y-2 sm:block text-base text-muted-foreground">
          {detail.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <span className="mt-auto hidden sm:flex items-center gap-2 pt-6 text-base font-semibold text-primary">
          {detail.cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}

/** Homepage service chooser with the shared safety model secondary. */
export function PortfolioRouteMap() {
  const services = getActiveServices()

  return (
    <section
      id="pricing"
      aria-labelledby="portfolio-route-map-title"
      className="scroll-mt-20 px-4 pt-6 pb-10 sm:px-6 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Services and pricing</p>
          <Heading id="portfolio-route-map-title" level="h1" as="h2" className="mt-2">
            What do you need?
          </Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
            Choose the service that fits. The fee is shown before you start.
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-2 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </ul>

        <div className="mt-5 flex max-w-4xl items-start gap-3 border-t border-border/60 pt-4 dark:border-white/15 sm:mt-8 sm:pt-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">One secure form per service</p>
            <p className="mt-1 text-base leading-6 text-muted-foreground">
              Each service has its own secure form and safety rules. {FORM_FIRST_WEDGE}
            </p>
            <p className="mt-2 text-base leading-6 text-muted-foreground">
              Broader concerns, ongoing care, or anything needing an examination belongs with
              your regular GP or an in-person service.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

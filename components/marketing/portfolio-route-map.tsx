"use client"

import { AlertCircle, ArrowRight, Check, Stethoscope } from "lucide-react"
import Link from "next/link"

import { ServiceIconTile } from "@/components/icons/service-icons"
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
    cta: "Renew medication",
  },
  ed: {
    benefits: ["Private, focused assessment", "eScript if clinically appropriate"],
    cta: "View ED assessment",
  },
  "hair-loss": {
    benefits: ["Doctor-assessed options", "eScript if clinically appropriate"],
    cta: "View hair loss assessment",
  },
  "womens-health": {
    benefits: ["UTI symptoms or start/switch pill", "Doctor-reviewed safety screen"],
    cta: "View women's health",
  },
  "weight-loss": {
    benefits: ["Not taking requests", "Launch readiness still gated"],
    cta: "Planned",
  },
}

function getHomepageServiceHref(service: ServiceDef): string {
  return service.id === "med-cert" || service.id === "repeat-rx"
    ? getServiceRequestHref(service)
    : getServiceMarketingHref(service)
}

function ServiceCard({ service, index }: { service: ServiceDef; index: number }) {
  const { isServiceDisabled } = useServiceAvailability()
  const disabled = isServiceDisabled(service.id)
  const detail = SERVICE_DETAILS[service.id]
  const isCoreService = index < 2

  return (
    <li
      className={cn(
        "min-w-0",
        isCoreService ? "lg:col-span-3" : "lg:col-span-2",
        index === 4 && "sm:col-span-2 lg:col-span-2",
      )}
    >
      <Link
        href={getHomepageServiceHref(service)}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        className={cn(
          "group relative flex h-full min-h-64 flex-col rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-primary/[0.04] outline-none transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transform-none motion-reduce:transition-none dark:border-white/15 dark:bg-card dark:shadow-none sm:p-6",
          disabled
            ? "pointer-events-none opacity-60"
            : "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/[0.06] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        )}
      >
        {disabled ? (
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-warning-light px-2.5 py-1 text-xs font-medium text-warning">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Unavailable
          </span>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <ServiceIconTile
            iconKey={service.iconKey}
            color={service.colorToken}
            size="lg"
            variant="sticker"
            stickerLoading="eager"
          />
          <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {service.pricePrefix ? `${service.pricePrefix} ` : null}
            {service.price}
          </p>
        </div>

        <Heading level="h3" className="mt-5 text-xl sm:text-2xl">
          {service.title}
        </Heading>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          {service.subtitle}
        </p>

        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {detail.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-primary">
          {detail.cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>
    </li>
  )
}

/** Homepage service chooser: five distinct cards with the shared safety model secondary. */
export function PortfolioRouteMap() {
  const services = getActiveServices()

  return (
    <section
      id="pricing"
      aria-labelledby="portfolio-route-map-title"
      className="scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Services and pricing</p>
          <Heading id="portfolio-route-map-title" level="h1" as="h2" className="mt-2">
            What do you need?
          </Heading>
          <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-lg">
            Choose the focused service that fits. The fee is shown before you start.
          </p>
        </div>

        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {services.map((service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          ))}
        </ul>

        <div className="mt-8 flex max-w-4xl items-start gap-3 border-t border-border/60 pt-6 dark:border-white/15">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Doctor-owned clinical pathways</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Each service has its own secure form and safety rules. {FORM_FIRST_WEDGE}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

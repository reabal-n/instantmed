"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { usePostHog } from "@/components/providers/posthog-provider"

// Service names only — no Schedule 4 drug names per TGA rules.
const PROBE_SERVICES = [
  {
    key: "ed" as const,
    label: "Erectile dysfunction",
    href: "/request?service=consult&subtype=ed",
  },
  {
    key: "hair_loss" as const,
    label: "Hair loss",
    href: "/request?service=consult&subtype=hair_loss",
  },
]

/**
 * Demand probe shown post-payment to surface adjacent services the patient
 * may not know we offer. Filters out the service they just ordered.
 * TGA: service names only — no Schedule 4 drug names.
 * PostHog: fires `related_service_probe_clicked` on link tap.
 */
export function RelatedServicesProbe({
  currentSubtype,
}: {
  currentSubtype?: string | null
}) {
  const posthog = usePostHog()

  const services = PROBE_SERVICES.filter((s) => s.key !== currentSubtype)
  if (services.length === 0) return null

  return (
    <div className="rounded-2xl border border-border/50 bg-white dark:bg-card p-4 shadow-sm shadow-primary/[0.04]">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
        We also help with
      </p>
      <div className="flex flex-col gap-2">
        {services.map((service) => (
          <Link
            key={service.key}
            href={service.href}
            onClick={() =>
              posthog?.capture("related_service_probe_clicked", {
                from_subtype: currentSubtype ?? "unknown",
                to_subtype: service.key,
              })
            }
            className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2.5 text-sm text-foreground hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
          >
            <span>{service.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}

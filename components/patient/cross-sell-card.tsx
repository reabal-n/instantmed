"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import type { ServiceType } from "@/types/db"

interface CrossSellCardProps {
  serviceType: ServiceType | undefined
}

interface CrossSellConfig {
  headline: string
  description: string
  price: string
  href: string
  cta: string
}

function getCrossSell(serviceType: ServiceType | undefined): CrossSellConfig | null {
  switch (serviceType) {
    case "med_certs":
      return {
        headline: "Need a prescription renewal?",
        description: "A doctor reviews repeat medication requests the same way. No appointment needed.",
        price: "from $29.95",
        href: "/request?service=prescription",
        cta: "Renew a prescription",
      }
    case "common_scripts":
      return {
        headline: "Need a GP consultation?",
        description: "For ongoing conditions, referrals, or anything that needs a more detailed review.",
        price: "from $49.95",
        href: "/request?service=consult",
        cta: "Start a consultation",
      }
    case "weight_loss":
    case "womens_health":
    case "mens_health":
      return {
        headline: "Need a medical certificate?",
        description: "For time off work, school, or caring for someone else. Reviewed the same way.",
        price: "from $19.95",
        href: "/request?service=med-cert",
        cta: "Get a certificate",
      }
    default:
      return null
  }
}

export function CrossSellCard({ serviceType }: CrossSellCardProps) {
  const posthog = usePostHog()
  const config = getCrossSell(serviceType)
  if (!config) return null

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Also available
          </p>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {config.headline}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {config.description}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{config.price}</p>
        </div>
        <Link
          href={config.href}
          onClick={() => {
            posthog?.capture("cross_sell_clicked", {
              from_service: serviceType,
              to_service: config.cta,
            })
          }}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {config.cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

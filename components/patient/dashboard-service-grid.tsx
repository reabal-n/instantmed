"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { buildRequestServiceHref } from "@/lib/dashboard/routes"
import { getActiveServices } from "@/lib/services/service-catalog"
import { cn } from "@/lib/utils"

export function DashboardServiceGrid({ compact = false }: { compact?: boolean }) {
  const services = getActiveServices().slice(0, compact ? 4 : 5)

  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {services.map((service) => (
        <Link
          key={service.id}
          href={buildRequestServiceHref({
            service: service.serviceRoute,
            subtype: service.subtype,
          })}
          className={cn(
            "group flex items-center gap-3 rounded-xl p-3",
            "bg-white dark:bg-card border border-border/50 dark:border-white/15",
            "shadow-sm shadow-primary/[0.04] dark:shadow-none",
            "transition-[transform,box-shadow,border-color] duration-300",
            "hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/[0.06] hover:border-primary/40",
          )}
        >
          <ServiceIconTile iconKey={service.iconKey} color={service.colorToken} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{service.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {service.pricePrefix ? `${service.pricePrefix} ${service.price}` : service.price}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
        </Link>
      ))}
    </div>
  )
}

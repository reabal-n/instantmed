import {
  Activity,
  ArrowUpRight,
  Cog,
  ShieldCheck,
  Users,
} from "lucide-react"
import Link from "next/link"
import type { ComponentType } from "react"

import { DashboardCard } from "@/components/dashboard"
import { cn } from "@/lib/utils"

interface ZoneStat {
  label: string
  value: number
  href: string
  /** Highlight the stat in destructive red when value > 0. */
  attentionWhenNonZero?: boolean
}

interface ZoneLink {
  label: string
  href: string
  description?: string
}

interface ZoneProps {
  title: string
  subtitle: string
  icon: ComponentType<{ className?: string }>
  stats?: ZoneStat[]
  links: ZoneLink[]
}

interface AdminHubZonesProps {
  inQueue: number
  scriptsPending: number
  totalIntakes: number
  pendingInfo: number
}

/**
 * 4-zone navigation hub for the /admin landing.
 *
 * Phase 3 of the doctor + admin portal rebuild (2026-04-29). Replaces
 * the implicit "scan the sidebar" navigation pattern with an explicit
 * orientation surface that surfaces today's operational pulse + deep
 * links into the most-used adjacent surfaces.
 *
 * Zones map to the four operator mental models:
 *
 *   - Today        operational pulse (queue, scripts, finance)
 *   - Patients     records & intake history
 *   - Operations   refunds, errors, webhooks, ops health
 *   - Settings     services, feature flags, content, emails
 *
 * Stats reuse the values already fetched by /admin/page.tsx so no
 * additional DB calls are introduced. All other shortcuts are
 * link-only.
 */
export function AdminHubZones({
  inQueue,
  scriptsPending,
  totalIntakes,
  pendingInfo,
}: AdminHubZonesProps) {
  const zones: ZoneProps[] = [
    {
      title: "Today",
      subtitle: "Operational pulse",
      icon: Activity,
      stats: [
        { label: "In queue", value: inQueue, href: "/doctor/queue" },
        {
          label: "Scripts pending",
          value: scriptsPending,
          href: "/doctor/scripts",
          attentionWhenNonZero: true,
        },
      ],
      links: [
        { label: "Finance dashboard", href: "/admin/finance" },
        { label: "Doctor analytics", href: "/admin/analytics" },
      ],
    },
    {
      title: "Patients",
      subtitle: "Records & intake history",
      icon: Users,
      stats: [
        { label: "All intakes", value: totalIntakes, href: "/admin#intakes" },
        {
          label: "Needs info",
          value: pendingInfo,
          href: "/admin#intakes",
          attentionWhenNonZero: true,
        },
      ],
      links: [
        { label: "Patient list", href: "/doctor/patients" },
        { label: "Audit log", href: "/admin/audit" },
      ],
    },
    {
      title: "Operations",
      subtitle: "Health & exceptions",
      icon: ShieldCheck,
      links: [
        { label: "Refunds", href: "/admin/refunds" },
        { label: "Errors", href: "/admin/errors" },
        { label: "Webhooks", href: "/admin/webhooks" },
        { label: "Ops health", href: "/admin/ops" },
        { label: "Compliance", href: "/admin/compliance" },
      ],
    },
    {
      title: "Settings",
      subtitle: "Configuration & content",
      icon: Cog,
      links: [
        { label: "Services", href: "/admin/services" },
        { label: "Feature flags", href: "/admin/features" },
        { label: "Email templates", href: "/admin/emails" },
        { label: "Content", href: "/admin/content" },
        { label: "Doctors", href: "/admin/doctors" },
      ],
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Quick navigation
        </h2>
        <p className="text-xs text-muted-foreground">
          Jump straight into the surface you need
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {zones.map((zone) => (
          <Zone key={zone.title} {...zone} />
        ))}
      </div>
    </div>
  )
}

function Zone({ title, subtitle, icon: Icon, stats, links }: ZoneProps) {
  return (
    <DashboardCard tier="standard" padding="sm">
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {stats.map((stat) => {
            const isAttention =
              stat.attentionWhenNonZero && stat.value > 0
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className={cn(
                  "group flex flex-col gap-0.5 rounded-lg border p-2.5 transition-[border-color,background-color]",
                  "border-border/40 hover:border-primary/40 hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "text-xl font-semibold tabular-nums tracking-tight",
                    isAttention ? "text-destructive" : "text-foreground",
                  )}
                >
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-[color,background-color] hover:bg-muted/50 hover:text-foreground"
            >
              <span>{link.label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </DashboardCard>
  )
}

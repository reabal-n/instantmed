import {
  Activity,
  ArrowUpRight,
  ListOrdered,
  Users,
} from "lucide-react"
import Link from "next/link"
import type { ComponentType } from "react"

import { DashboardCard } from "@/components/dashboard"
import {
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_INTAKE_LEDGER_HREF,
  ADMIN_OPS_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
} from "@/lib/dashboard/routes"
import { cn } from "@/lib/utils"

interface ZoneStat {
  label: string
  value: number
  href: string
  attentionWhenNonZero?: boolean
}

interface ZoneLink {
  label: string
  href: string
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

export function AdminHubZones({
  inQueue,
  scriptsPending,
  totalIntakes,
  pendingInfo,
}: AdminHubZonesProps) {
  const zones: ZoneProps[] = [
    {
      title: "Review work",
      subtitle: "Cases that need clinical attention",
      icon: ListOrdered,
      stats: [
        { label: "In queue", value: inQueue, href: ADMIN_INTAKE_LEDGER_HREF },
        {
          label: "Scripts pending",
          value: scriptsPending,
          href: ADMIN_INTAKE_LEDGER_HREF,
          attentionWhenNonZero: true,
        },
      ],
      links: [
        { label: "Open intake ledger", href: ADMIN_INTAKE_LEDGER_HREF },
      ],
    },
    {
      title: "Patient work",
      subtitle: "Records and intake follow-up",
      icon: Users,
      stats: [
        { label: "All intakes", value: totalIntakes, href: ADMIN_INTAKE_LEDGER_HREF },
        {
          label: "Needs info",
          value: pendingInfo,
          href: ADMIN_INTAKE_LEDGER_HREF,
          attentionWhenNonZero: true,
        },
      ],
      links: [
        { label: "Search intake ledger", href: ADMIN_INTAKE_LEDGER_HREF },
      ],
    },
    {
      title: "Recovery work",
      subtitle: "Vendor, webhook, and communication exceptions",
      icon: Activity,
      links: [
        { label: "Open operations", href: ADMIN_OPS_HREF },
        { label: "Parchment ops", href: ADMIN_PARCHMENT_OPS_HREF },
        { label: "Webhook DLQ", href: ADMIN_WEBHOOK_DLQ_HREF },
        { label: "Email queue", href: ADMIN_EMAIL_HUB_HREF },
      ],
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Operational focus
        </h2>
        <p className="text-xs text-muted-foreground">
          The few places worth opening mid-shift
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
            const isAttention = stat.attentionWhenNonZero && stat.value > 0
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
              className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-[background-color,color] hover:bg-muted/50 hover:text-foreground"
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

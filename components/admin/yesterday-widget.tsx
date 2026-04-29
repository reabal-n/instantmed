import { AlertCircle, CheckCircle2, Clock, DollarSign, Users, XCircle } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { cn } from "@/lib/utils"

import { YesterdayWidgetWindowToggle } from "./yesterday-widget-toggle"

/**
 * YesterdayWidget — mirrors the daily digest email on /admin.
 *
 * Source of truth for both this widget and the cron digest is the same
 * Supabase/Stripe query set. Keeps the "log in to admin" view in lock-step
 * with the 8am AEST email the founder already got that morning, so there's
 * never a discrepancy between inbox and dashboard.
 *
 * Two windows via `?window=today|yesterday` query (URL-driven so you can
 * bookmark either). Default is "yesterday" to match the digest email.
 * Compute cost is low (4 Supabase queries + 1 Stripe list). Runs on each
 * /admin visit; no caching because stale numbers > live numbers for ops.
 */
export async function YesterdayWidget({
  window = "yesterday",
}: {
  window?: "today" | "yesterday"
}) {
  const supabase = createServiceRoleClient()
  const now = new Date()

  // "today"     = midnight-to-now in Sydney time (today's running totals)
  // "yesterday" = last 24 hours rolling window (matches the digest email)
  let since: Date
  let windowLabel: string
  if (window === "today") {
    const sydneyNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Australia/Sydney" }),
    )
    sydneyNow.setHours(0, 0, 0, 0)
    // Adjust back from Sydney local to UTC
    const offsetMs = sydneyNow.getTime() - new Date(
      sydneyNow.toLocaleString("en-US", { timeZone: "UTC" }),
    ).getTime()
    since = new Date(sydneyNow.getTime() - offsetMs)
    windowLabel = "Today"
  } else {
    since = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    windowLabel = "Yesterday"
  }

  const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000)

  // Parallelise all reads
  const [
    intakeCountsResult,
    newPatientsResult,
    stuckPaidResult,
    revenueResult,
    openDisputesResult,
  ] = await Promise.allSettled([
    supabase
      .from("intakes")
      .select("id, status, payment_status", { count: "exact" })
      .gte("created_at", since.toISOString()),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString()),
    supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .lt("created_at", eightHoursAgo.toISOString()),
    (async () => {
      try {
        const charges = await stripe.charges.list({
          created: { gte: Math.floor(since.getTime() / 1000) },
          limit: 100,
        })
        let cents = 0
        let count = 0
        for (const c of charges.data) {
          if (c.paid && !c.refunded && c.status === "succeeded") {
            cents += c.amount
            count++
          }
        }
        return { cents, count }
      } catch {
        return { cents: 0, count: 0 }
      }
    })(),
    (async () => {
      try {
        const disputes = await stripe.disputes.list({ limit: 20 })
        return disputes.data.filter(
          (d) =>
            d.status === "warning_needs_response" || d.status === "needs_response",
        ).length
      } catch {
        return 0
      }
    })(),
  ])

  const intakes =
    intakeCountsResult.status === "fulfilled"
      ? intakeCountsResult.value.data ?? []
      : []
  const paidCount = intakes.filter((i) => i.payment_status === "paid").length
  const approved = intakes.filter((i) => i.status === "approved").length
  const declined = intakes.filter((i) => i.status === "declined").length
  const newPatients =
    newPatientsResult.status === "fulfilled"
      ? newPatientsResult.value.count ?? 0
      : 0
  // Needs-attention is always a live "right now" view — not scoped to the
  // window. A stuck intake is a stuck intake regardless of which column
  // you're looking at.
  const stuckPaid =
    stuckPaidResult.status === "fulfilled"
      ? stuckPaidResult.value.count ?? 0
      : 0
  const revenue =
    revenueResult.status === "fulfilled"
      ? revenueResult.value
      : { cents: 0, count: 0 }
  const openDisputes =
    openDisputesResult.status === "fulfilled" ? openDisputesResult.value : 0

  const revenueDisplay = `$${(revenue.cents / 100).toFixed(2)}`
  const attentionCount = stuckPaid + openDisputes

  const cells: Array<{
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    tone?: "default" | "success" | "warning" | "danger"
  }> = [
    { icon: DollarSign, label: `${windowLabel}'s revenue`, value: revenueDisplay, tone: "success" },
    { icon: CheckCircle2, label: "Paid orders", value: paidCount },
    { icon: CheckCircle2, label: "Approved", value: approved },
    { icon: XCircle, label: "Declined", value: declined },
    { icon: Users, label: "New patients", value: newPatients },
    {
      icon: AlertCircle,
      label: "Needs attention",
      value: attentionCount,
      tone: attentionCount > 0 ? "warning" : "default",
    },
  ]

  return (
    <Card className="rounded-xl border-border/60 bg-card shadow-sm shadow-primary/[0.03]">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
              {windowLabel}
            </div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
              {revenueDisplay} &middot; {paidCount} order{paidCount === 1 ? "" : "s"}
              {attentionCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-warning">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {attentionCount}
                </span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <YesterdayWidgetWindowToggle current={window} />
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {window === "today" ? "Since midnight" : "Last 24h"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/40 bg-border/40 sm:grid-cols-3 lg:grid-cols-6">
          {cells.map(({ icon: Icon, label, value, tone = "default" }) => (
            <div
              key={label}
              className="flex min-h-[74px] flex-col justify-center gap-1 bg-card px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <Icon className="h-3 w-3" aria-hidden="true" />
                {label}
              </div>
              <div
                className={cn(
                  "text-lg sm:text-xl font-semibold tabular-nums tracking-tight",
                  tone === "success" && "text-success",
                  tone === "warning" && "text-warning",
                  tone === "danger" && "text-destructive",
                )}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {(stuckPaid > 0 || openDisputes > 0) && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <ul className="text-xs text-warning space-y-1">
              {stuckPaid > 0 && (
                <li>
                  &middot; {stuckPaid} intake{stuckPaid === 1 ? "" : "s"} stuck in &lsquo;paid&rsquo; &gt;8h
                </li>
              )}
              {openDisputes > 0 && (
                <li>
                  &middot; {openDisputes} open Stripe dispute{openDisputes === 1 ? "" : "s"}
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import { AlertTriangle, ArrowRight, Inbox, Megaphone, Target } from "lucide-react"
import Link from "next/link"

import { DashboardCard, StatusBadge, type StatusBadgeStatus } from "@/components/dashboard"
import type { OperatorBrief } from "@/lib/admin/operator-brief"
import type { GoogleAdsReturnSnapshot } from "@/lib/analytics/google-ads-return-summary"
import { formatAudDollars } from "@/lib/format/aud"

function exceptionBadgeStatus(status: OperatorBrief["exceptions"]["status"]): StatusBadgeStatus {
  if (status === "critical") return "error"
  if (status === "attention") return "warning"
  return "success"
}

function formatRatio(value: number | null | undefined): string {
  return value == null ? "No data" : `${value.toFixed(2)}x`
}

function campaignStateLabel(snapshot: GoogleAdsReturnSnapshot | null): string {
  if (!snapshot || snapshot.campaignState === "unknown") return "Campaign state needs verification"
  if (snapshot.campaignState === "paused") return "Campaigns are paused"
  if (snapshot.campaignState === "mixed") return "Campaign state is mixed"
  return "Low-budget pilots remain live"
}

export function OperatorBriefPanel({
  brief,
  googleAdsReturn,
}: {
  brief: OperatorBrief
  googleAdsReturn: GoogleAdsReturnSnapshot | null
}) {
  const { milestone, exceptions } = brief

  return (
    <section aria-labelledby="operator-brief-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Controlled demand validation</p>
          <h2 id="operator-brief-heading" className="mt-1 text-base font-semibold text-foreground">Operator brief</h2>
        </div>
        <p className="text-xs text-muted-foreground">Decision support only · every Google Ads change requires approval</p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <DashboardCard padding="md" className="flex min-h-[220px] flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Target className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Revenue milestone</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {milestone?.activeMilestone.label ?? "Revenue data unavailable"}
                </p>
              </div>
            </div>
            <StatusBadge status={!milestone ? "warning" : milestone.capacityReviewTriggered ? "warning" : "info"} size="sm">
              {milestone ? `${milestone.progressPercent}%` : "Unavailable"}
            </StatusBadge>
          </div>
          {milestone ? (
            <>
              <p className="mt-5 text-xl font-semibold tabular-nums text-foreground">{milestone.progressLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">{milestone.activeHorizonLabel}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${milestone.progressPercent}%` }} />
              </div>
              <div className="mt-auto pt-4 text-xs leading-relaxed text-muted-foreground">
                <p>{milestone.remainingLabel}</p>
                <p className="mt-1">{milestone.nextRungLabel}</p>
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-amber-200/70 bg-amber-50 px-3 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              The paid-order or refund read did not complete. Verify payment truth before using milestone progress.
            </p>
          )}
        </DashboardCard>

        <DashboardCard padding="md" className="flex min-h-[220px] flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Actionable exceptions</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{exceptions.summaryLabel}</p>
              </div>
            </div>
            <StatusBadge status={exceptionBadgeStatus(exceptions.status)} size="sm">
              {exceptions.status === "clear" ? "Clear" : exceptions.status === "critical" ? "Critical" : "Review"}
            </StatusBadge>
          </div>
          {exceptions.items.length > 0 ? (
            <ul className="mt-4 grid gap-2">
              {exceptions.items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="group flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 hover:border-primary/40 hover:bg-muted/50">
                    <span>
                      <span className="block text-xs font-medium text-foreground">{item.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{item.detail}</span>
                    </span>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
              Queue, recovery, and Ads checks returned with no actionable exception. This is not a blanket production all-clear.
            </p>
          )}
        </DashboardCard>

        <DashboardCard padding="md" className="flex min-h-[220px] flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-blue-500/10 p-2 text-blue-700 dark:text-blue-300"><Megaphone className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.10em] text-muted-foreground">Google Ads decision</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{campaignStateLabel(googleAdsReturn)}</p>
              </div>
            </div>
            <StatusBadge status="info" size="sm">Approval required</StatusBadge>
          </div>
          {googleAdsReturn ? (
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground">30d spend</p><p className="mt-0.5 font-semibold tabular-nums text-foreground">{googleAdsReturn.returnMetricsAvailability === "available" ? formatAudDollars(googleAdsReturn.summary.spendAud) : "Unavailable"}</p></div>
              <div><p className="text-muted-foreground">Local orders</p><p className="mt-0.5 font-semibold tabular-nums text-foreground">{googleAdsReturn.summary.localOrders}</p></div>
              <div><p className="text-muted-foreground">CAC</p><p className="mt-0.5 font-semibold tabular-nums text-foreground">{googleAdsReturn.returnMetricsAvailability === "available" ? formatAudDollars(googleAdsReturn.summary.costPerLocalOrderAud) : "Unavailable"}</p></div>
              <div><p className="text-muted-foreground">Net-retained ROAS</p><p className="mt-0.5 font-semibold tabular-nums text-foreground">{googleAdsReturn.returnMetricsAvailability === "available" ? formatRatio(googleAdsReturn.summary.localRoas) : "Unavailable"}</p></div>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">Ads performance is unavailable in this snapshot.</p>
          )}
          <p className="mt-auto pt-4 text-xs leading-relaxed text-muted-foreground">
            Codex presents the exact budget, keyword, negative, asset, or sitelink change. You approve or decline before validation and application.
          </p>
        </DashboardCard>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          Support inbox: count-only Telegram alerts; message content and drafts stay in Gmail pending the privacy-processor gate.
        </span>
        <a href="https://mail.google.com/mail/u/0/#inbox" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Open Gmail <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  )
}

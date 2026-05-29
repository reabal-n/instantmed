"use client"

import {
  CounterCard,
  type CounterCardTone,
  OperatorPage,
  OperatorPageHeader,
  OperatorScrollArea,
  RecoveryRow,
  type RecoverySeverity,
} from "@/components/operator"

type CounterCellData = {
  count: number
  helperText: string
  tone: CounterCardTone
  href: string
}

export interface OpsDashboardClientProps {
  counters: {
    paymentFailures: CounterCellData
    webhookDlq: CounterCellData
    parchmentUnsynced: CounterCellData
    missingIdentity: CounterCellData
  }
  invariants: {
    slaBreachBacklog: CounterCellData
    certRefundOrphans: CounterCellData
    refundRecordAnomalies: CounterCellData
  }
  recoveries: Array<{
    id: string
    title: string
    detail: string
    occurredAt: string
    severity: RecoverySeverity
    href: string
  }>
}

export function OpsDashboardClient({ counters, invariants, recoveries }: OpsDashboardClientProps) {
  return (
    <OperatorPage>
      <OperatorPageHeader
        title="Operations"
        description="Resolve payment, sync, and identity issues."
      />
      <OperatorScrollArea>
        <section
          aria-label="Recovery counters"
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          <CounterCard
            count={counters.paymentFailures.count}
            label="Payment failures"
            helperText={counters.paymentFailures.helperText}
            tone={counters.paymentFailures.tone}
            href={counters.paymentFailures.href}
          />
          <CounterCard
            count={counters.webhookDlq.count}
            label="Webhook DLQ"
            helperText={counters.webhookDlq.helperText}
            tone={counters.webhookDlq.tone}
            href={counters.webhookDlq.href}
          />
          <CounterCard
            count={counters.parchmentUnsynced.count}
            label="Parchment unsynced"
            helperText={counters.parchmentUnsynced.helperText}
            tone={counters.parchmentUnsynced.tone}
            href={counters.parchmentUnsynced.href}
          />
          <CounterCard
            count={counters.missingIdentity.count}
            label="Missing identity"
            helperText={counters.missingIdentity.helperText}
            tone={counters.missingIdentity.tone}
            href={counters.missingIdentity.href}
          />
        </section>

        <section aria-label="Operational invariants">
          <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
            Integrity (weekly invariants)
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <CounterCard
              count={invariants.slaBreachBacklog.count}
              label="Review SLA backlog"
              helperText={invariants.slaBreachBacklog.helperText}
              tone={invariants.slaBreachBacklog.tone}
              href={invariants.slaBreachBacklog.href}
            />
            <CounterCard
              count={invariants.certRefundOrphans.count}
              label="Cert + refund orphans"
              helperText={invariants.certRefundOrphans.helperText}
              tone={invariants.certRefundOrphans.tone}
              href={invariants.certRefundOrphans.href}
            />
            <CounterCard
              count={invariants.refundRecordAnomalies.count}
              label="Refund record anomalies"
              helperText={invariants.refundRecordAnomalies.helperText}
              tone={invariants.refundRecordAnomalies.tone}
              href={invariants.refundRecordAnomalies.href}
            />
          </div>
        </section>

        <section
          aria-label="Recent recoveries"
          className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04]"
        >
          <header className="border-b border-border/40 px-4 py-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Recent (last 24h)
            </h2>
          </header>
          {recoveries.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Nothing to recover. All systems clear.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {recoveries.map((r) => (
                <li key={r.id}>
                  <RecoveryRow
                    title={r.title}
                    detail={r.detail}
                    occurredAt={r.occurredAt}
                    severity={r.severity}
                    href={r.href}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </OperatorScrollArea>
    </OperatorPage>
  )
}

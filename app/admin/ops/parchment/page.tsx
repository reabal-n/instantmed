import { AlertTriangle, CheckCircle, ExternalLink, Pill, RefreshCw, UserCheck, Users, Webhook } from "lucide-react"
import Link from "next/link"

import { DashboardPageHeader, StatusBadge } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getParchmentOpsDashboard } from "@/lib/parchment/ops"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { RetryParchmentWebhookButton } from "./retry-webhook-button"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Parchment Ops",
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not recorded"
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatCard({
  label,
  value,
  tone = "neutral",
  icon: Icon,
}: {
  label: string
  value: number
  tone?: "neutral" | "success" | "warning" | "destructive"
  icon: typeof Webhook
}) {
  const toneClass = {
    neutral: "bg-info-light text-info",
    success: "bg-success-light text-success",
    warning: "bg-warning-light text-warning",
    destructive: "bg-destructive-light text-destructive",
  }[tone]

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm shadow-primary/[0.04] dark:shadow-none">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default async function ParchmentOpsPage() {
  const dashboard = await getParchmentOpsDashboard(createServiceRoleClient())
  const degraded = dashboard.stats.failedWebhooks7d > 0
    || dashboard.stats.unlinkedPrescribers > 0
    || dashboard.stats.unsyncedPatients > 0

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Parchment Ops"
        description="Parchment prescribing health, failed prescription webhooks, and sync recovery."
        backHref="/admin/ops"
        backLabel="Operations"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/parchment-conformance">
                <ExternalLink className="h-4 w-4" />
                Conformance helper
              </Link>
            </Button>
            <StatusBadge status={degraded ? "warning" : "success"}>
              {degraded ? "Needs attention" : "Healthy"}
            </StatusBadge>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Linked prescribers"
          value={dashboard.stats.linkedPrescribers}
          tone={dashboard.stats.linkedPrescribers > 0 ? "success" : "warning"}
          icon={UserCheck}
        />
        <StatCard
          label="Unsynced patients"
          value={dashboard.stats.unsyncedPatients}
          tone={dashboard.stats.unsyncedPatients > 0 ? "warning" : "success"}
          icon={Users}
        />
        <StatCard
          label="Failed webhooks 7d"
          value={dashboard.stats.failedWebhooks7d}
          tone={dashboard.stats.failedWebhooks7d > 0 ? "destructive" : "success"}
          icon={Webhook}
        />
        <StatCard
          label="Synced scripts 7d"
          value={dashboard.stats.syncedPrescriptions7d}
          tone="neutral"
          icon={Pill}
        />
      </div>

      <div className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none">
        <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Failed prescription webhooks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Retryable rows contain the Parchment patient, prescriber, and SCID metadata needed to re-fetch the prescription.
            </p>
          </div>
          <Badge variant={dashboard.stats.retryableFailures > 0 ? "warning" : "success"} size="sm">
            {dashboard.stats.retryableFailures} retryable
          </Badge>
        </div>

        {dashboard.failedWebhooks.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-success" />
            <p>No Parchment webhook failures in the last 7 days.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {dashboard.failedWebhooks.map((failure) => (
              <div key={failure.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.2fr_1.3fr_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{failure.reason}</p>
                    <Badge variant={failure.retryable ? "warning" : "outline"} size="sm">
                      {failure.retryable ? "Retryable" : "Needs context"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{failure.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(failure.createdAt)}</p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {failure.scid && <Badge variant="outline" size="sm">SCID {failure.scid}</Badge>}
                  {failure.eventId && <Badge variant="outline" size="sm">Event {failure.eventId}</Badge>}
                  {failure.intakeId && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                      <Link href={`/doctor/intakes/${failure.intakeId}`}>
                        <ExternalLink className="h-3 w-3" />
                        Intake
                      </Link>
                    </Button>
                  )}
                  {failure.patientProfileId && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                      <Link href={`/doctor/patients/${failure.patientProfileId}`}>
                        <ExternalLink className="h-3 w-3" />
                        Patient
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="flex justify-start lg:justify-end">
                  <RetryParchmentWebhookButton auditLogId={failure.id} disabled={!failure.retryable} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-base font-semibold">Linked Parchment prescribers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {dashboard.stats.unlinkedPrescribers} doctor/admin profile{dashboard.stats.unlinkedPrescribers === 1 ? "" : "s"} still unlinked.
            </p>
          </div>
          {dashboard.linkedPrescribers.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-warning" />
              <p>No linked Parchment prescribers.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {dashboard.linkedPrescribers.slice(0, 8).map((prescriber) => (
                <div key={prescriber.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{prescriber.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{prescriber.email || prescriber.role}</p>
                  </div>
                  <Badge variant="outline" size="sm">{prescriber.parchmentUserId}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/50 bg-card shadow-sm shadow-primary/[0.04] dark:shadow-none">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Recent synced prescriptions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Latest local PMS records created from Parchment.</p>
            </div>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </div>
          {dashboard.recentPrescriptions.length === 0 ? (
            <div className="px-5 py-10 text-center text-muted-foreground">
              <Pill className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No synced prescriptions yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {dashboard.recentPrescriptions.map((prescription) => (
                <div key={prescription.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{prescription.medicationName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {prescription.patientName}
                        {prescription.prescriberName ? ` · ${prescription.prescriberName}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" size="sm">{prescription.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {prescription.parchmentReference && <span>SCID {prescription.parchmentReference}</span>}
                    <span>{formatDateTime(prescription.updatedAt)}</span>
                    {prescription.intakeId && (
                      <Link href={`/doctor/intakes/${prescription.intakeId}`} className="text-primary hover:underline">
                        Intake
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

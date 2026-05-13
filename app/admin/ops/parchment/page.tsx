import { AlertTriangle, CheckCircle, ExternalLink, LinkIcon, ServerCrash, Webhook } from "lucide-react"
import Link from "next/link"

import { StatusBadge, type StatusBadgeStatus } from "@/components/dashboard"
import { OperatorPage, OperatorPageHeader, OperatorPanel, OperatorScrollArea } from "@/components/operator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireRole } from "@/lib/auth/helpers"
import { hasAdminAccess, hasSupportAccess } from "@/lib/auth/staff-capabilities"
import { buildAdminIntakeHref, buildStaffPatientHref } from "@/lib/dashboard/routes"
import {
  getParchmentOpsDashboard,
  type ParchmentFailedWebhook,
  type ParchmentHandoffRecoveryItem,
  type ParchmentOpsEvent,
} from "@/lib/parchment/ops"
import { getParchmentProductionReadiness } from "@/lib/parchment/readiness"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { CopyTokenButton } from "./copy-token-button"
import { RetryParchmentWebhookButton } from "./retry-webhook-button"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Parchment Ops",
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not recorded"
  return new Date(value).toLocaleString("en-AU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  })
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function mapEventStatus(status: ParchmentOpsEvent["status"]): StatusBadgeStatus {
  if (status === "destructive") return "error"
  return status
}

function PatientLink({
  patientProfileId,
  supportMode = false,
}: {
  patientProfileId: string | null
  supportMode?: boolean
}) {
  if (supportMode) {
    return <span className="text-xs text-muted-foreground">Patient hidden in support view</span>
  }

  if (!isUuid(patientProfileId)) {
    return <span className="text-xs text-muted-foreground">Patient not linked</span>
  }

  return (
    <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
      <Link href={buildStaffPatientHref(patientProfileId)}>
        <ExternalLink className="h-3 w-3" />
        Patient
      </Link>
    </Button>
  )
}

function IntakeLink({
  intakeId,
  supportMode = false,
}: {
  intakeId: string | null
  supportMode?: boolean
}) {
  if (supportMode) {
    return <span className="text-xs text-muted-foreground">Intake hidden in support view</span>
  }

  if (!isUuid(intakeId)) return null

  return (
    <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
      <Link href={buildAdminIntakeHref(intakeId)}>
        <ExternalLink className="h-3 w-3" />
        Intake
      </Link>
    </Button>
  )
}

function EvidenceItem({ event, supportMode = false }: { event: ParchmentOpsEvent; supportMode?: boolean }) {
  return (
    <div className="rounded-lg border border-border/70 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{event.label}</p>
            <StatusBadge status={mapEventStatus(event.status)} size="sm">
              {event.status}
            </StatusBadge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{event.detail}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(event.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {event.eventId ? <CopyTokenButton label="Event" value={event.eventId} /> : null}
          {event.scid ? <CopyTokenButton label="SCID" value={event.scid} /> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <PatientLink patientProfileId={event.patientProfileId} supportMode={supportMode} />
        <IntakeLink intakeId={event.intakeId} supportMode={supportMode} />
      </div>
    </div>
  )
}

function FailureItem({ failure, supportMode = false }: { failure: ParchmentFailedWebhook; supportMode?: boolean }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50/70 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={failure.retryable ? "warning" : "error"} size="sm">
              {failure.retryable ? "Retryable" : "Needs context"}
            </StatusBadge>
            <p className="text-sm font-semibold text-red-950">{failure.reason}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-red-800">
            {supportMode
              ? "Parchment webhook failed. Patient, intake, and retry details are held for admin/doctor review."
              : failure.description}
          </p>
          <p className="mt-2 text-[11px] text-red-700">{formatDateTime(failure.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {supportMode ? null : (
            <RetryParchmentWebhookButton auditLogId={failure.id} disabled={!failure.retryable} />
          )}
          <PatientLink patientProfileId={failure.patientProfileId} supportMode={supportMode} />
          <IntakeLink intakeId={failure.intakeId} supportMode={supportMode} />
        </div>
      </div>
    </div>
  )
}

function HandoffRecoveryItem({
  item,
  supportMode = false,
}: {
  item: ParchmentHandoffRecoveryItem
  supportMode?: boolean
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.retryable ? "warning" : "info"} size="sm">
              {item.kind === "failed_webhook" ? "Webhook" : "Handoff"}
            </StatusBadge>
            <p className="text-sm font-semibold text-amber-950">{item.reason}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-amber-800">
            {supportMode
              ? "Parchment handoff needs admin or doctor review. Patient and intake details are hidden here."
              : item.detail}
          </p>
          <p className="mt-2 text-[11px] text-amber-700">{formatDateTime(item.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <PatientLink patientProfileId={item.patientProfileId} supportMode={supportMode} />
          <IntakeLink intakeId={item.intakeId} supportMode={supportMode} />
        </div>
      </div>
    </div>
  )
}

export default async function ParchmentOpsPage() {
  const authUser = await requireRole(["admin", "support"], { redirectTo: "/admin/ops" })
  const isSupportOnly = hasSupportAccess(authUser.profile) && !hasAdminAccess(authUser.profile)

  const dashboard = await getParchmentOpsDashboard(createServiceRoleClient())
  const readiness = getParchmentProductionReadiness()
  const actionableFailures = dashboard.failedWebhooks
  const handoffRecovery = dashboard.handoffRecovery
  const recentEvidence = dashboard.recentEvents.slice(0, 5)
  const readinessTone: StatusBadgeStatus =
    readiness.status === "ready"
      ? "success"
      : readiness.status === "misconfigured"
        ? "error"
        : "warning"
  const degraded = handoffRecovery.length > 0 || dashboard.stats.unlinkedPrescribers > 0

  return (
    <OperatorPage className="bg-background">
      <OperatorPageHeader
        title="Parchment ops"
        description={isSupportOnly
          ? "Support view: current blockers and masked webhook evidence. PHI links, prescriber evidence, and retry actions stay admin-only."
          : "Prescribing integration recovery, current blockers, and production-readiness evidence."}
        backHref="/admin/ops"
        actions={
          <div className="flex items-center gap-2">
            {isSupportOnly ? <Badge variant="outline" size="sm">Support view</Badge> : null}
            <StatusBadge status={degraded ? "warning" : "success"} size="sm">
              {degraded ? "Needs attention" : "Healthy"}
            </StatusBadge>
          </div>
        }
      />

      <OperatorScrollArea>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="space-y-4">
            <OperatorPanel>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold">Parchment handoff recovery</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Failed SSO, patient sync, webhook, and stale script handoffs that need one clinical/admin action.
                  </p>
                </div>
                <Badge variant={handoffRecovery.length > 0 ? "warning" : "success"} size="sm">
                  {handoffRecovery.length} open
                </Badge>
              </div>

              {handoffRecovery.length > 0 ? (
                <div className="space-y-3">
                  {handoffRecovery.map((item) => (
                    <HandoffRecoveryItem key={item.id} item={item} supportMode={isSupportOnly} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    No Parchment handoffs need recovery.
                  </div>
                  <p className="mt-1 text-xs text-emerald-800">
                    Embedded prescribing can fall back to the normal queue if a case still needs action.
                  </p>
                </div>
              )}
            </OperatorPanel>

            <OperatorPanel>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ServerCrash className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold">Actionable failures</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Only webhooks that still need staff attention appear here.
                  </p>
                </div>
                <Badge variant={actionableFailures.length > 0 ? "warning" : "success"} size="sm">
                  {actionableFailures.length} open
                </Badge>
              </div>

              {actionableFailures.length > 0 ? (
                <div className="space-y-3">
                  {actionableFailures.map((failure) => (
                    <FailureItem key={failure.id} failure={failure} supportMode={isSupportOnly} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    No failed Parchment webhooks need recovery.
                  </div>
                  <p className="mt-1 text-xs text-emerald-800">
                    Recent prescribing events are processing without staff intervention.
                  </p>
                </div>
              )}
            </OperatorPanel>

            <OperatorPanel>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold">Recent webhook evidence</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Latest processed events that prove the integration is alive.
                  </p>
                </div>
                <Badge variant={recentEvidence.length > 0 ? "info" : "outline"} size="sm">
                  {recentEvidence.length} shown
                </Badge>
              </div>

              {recentEvidence.length > 0 ? (
                <div className="space-y-2">
                  {recentEvidence.map((event) => (
                    <EvidenceItem key={event.id} event={event} supportMode={isSupportOnly} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                  No recent Parchment webhook events found.
                </div>
              )}
            </OperatorPanel>
          </div>

          <div className="space-y-4">
            <OperatorPanel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {readiness.status === "ready" ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    )}
                    <h2 className="text-base font-semibold">Production prescribing gate</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{readiness.message}</p>
                </div>
                <StatusBadge status={readinessTone} size="sm">
                  {readiness.label}
                </StatusBadge>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="font-medium text-foreground">Environment</p>
                  <p className="mt-1 capitalize">{readiness.environment}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="font-medium text-foreground">API host</p>
                  <p className="mt-1 truncate">{readiness.apiHost}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="font-medium text-foreground">Iframe hosts</p>
                  <p className="mt-1">
                    {readiness.iframeHosts.filter((host) => host.allowed).length}/
                    {readiness.iframeHosts.length} allowed
                  </p>
                </div>
              </div>

              {readiness.missingProductionKeys.length > 0 && readiness.status !== "sandbox_only" ? (
                <details className="mt-3 rounded-lg border border-border/70 bg-white px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    Missing production keys
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {readiness.missingProductionKeys.map((key) => (
                      <Badge key={key} variant="outline" size="sm">
                        {key}
                      </Badge>
                    ))}
                  </div>
                </details>
              ) : null}
            </OperatorPanel>

            <OperatorPanel>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-base font-semibold">Prescriber links</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Only linkage gaps are shown by default.
                  </p>
                </div>
                <StatusBadge status={dashboard.stats.unlinkedPrescribers > 0 ? "warning" : "success"} size="sm">
                  {dashboard.stats.unlinkedPrescribers} unlinked
                </StatusBadge>
              </div>

              {dashboard.stats.unlinkedPrescribers > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  {dashboard.stats.unlinkedPrescribers} doctor/admin profile
                  {dashboard.stats.unlinkedPrescribers === 1 ? "" : "s"} still need a Parchment user ID.
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
                  All active prescribers are linked.
                </div>
              )}

              {isSupportOnly ? (
                <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  Linked prescriber names, emails, and user IDs are hidden in support view.
                </div>
              ) : (
                <details className="mt-3 rounded-lg border border-border/70 bg-white px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    Show linked prescriber evidence
                  </summary>
                  <div className="mt-3 space-y-2">
                    {dashboard.linkedPrescribers.length > 0 ? (
                      dashboard.linkedPrescribers.slice(0, 8).map((prescriber) => (
                        <div
                          key={prescriber.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">{prescriber.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {prescriber.email || prescriber.role}
                            </p>
                          </div>
                          <CopyTokenButton label="User" value={prescriber.parchmentUserId} />
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No linked prescriber profiles found.</p>
                    )}
                  </div>
                </details>
              )}
            </OperatorPanel>

            <details className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">
                More evidence
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Historical sandbox failures
                  </p>
                  <div className="mt-2 space-y-2">
                    {dashboard.historicalWebhookFailures.length > 0 ? (
                      dashboard.historicalWebhookFailures.slice(0, 4).map((failure) => (
                        <div key={failure.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                          <p className="text-xs font-semibold text-foreground">{failure.reason}</p>
                          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                            {failure.description}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No sandbox failures found.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Synced prescriptions
                  </p>
                  <div className="mt-2 space-y-2">
                    {isSupportOnly ? (
                      <p className="text-xs text-muted-foreground">Synced prescription details are hidden in support view.</p>
                    ) : dashboard.recentPrescriptions.length > 0 ? (
                      dashboard.recentPrescriptions.slice(0, 4).map((prescription) => (
                        <div key={prescription.id} className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                          <p className="text-xs font-semibold text-foreground">{prescription.patientName}</p>
                          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                            {prescription.medicationName} - {formatDateTime(prescription.updatedAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No synced prescriptions found.</p>
                    )}
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </OperatorScrollArea>
    </OperatorPage>
  )
}

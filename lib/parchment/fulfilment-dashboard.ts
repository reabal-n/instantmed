import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { filterReportableIntakes } from "@/lib/data/reporting-filters"
import { PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES } from "@/lib/doctor/parchment-claim"

const DEFAULT_LOOKBACK_DAYS = 180
const PRESCRIBING_CONSULT_SUBTYPES = new Set<string>(PARCHMENT_PRESCRIBING_CONSULT_SUBTYPES)

const FULFILMENT_STAGE_LABELS = {
  approved_not_prescribed: "Approved but not prescribed",
  parchment_opened: "Parchment opened",
  webhook_received: "Webhook received",
  patient_notified: "Patient notified",
} as const

const FULFILMENT_STAGE_DETAILS = {
  approved_not_prescribed: "Doctor approved the prescribing pathway, but no Parchment handoff is recorded yet.",
  parchment_opened: "Parchment SSO opened. No sent-script confirmation is recorded yet.",
  webhook_received: "Script confirmation exists, but notification has not landed yet.",
  patient_notified: "The script_sent email is recorded in the outbox.",
} as const

const FULFILMENT_STAGE_SLA_MINUTES = {
  approved_not_prescribed: 120,
  parchment_opened: 30,
  webhook_received: 10,
  patient_notified: null,
} as const

export type PrescriptionFulfilmentStage = keyof typeof FULFILMENT_STAGE_LABELS
export type PrescriptionFulfilmentConfirmationSource = "manual_or_pms" | "parchment_webhook" | null
export type ScriptSentNotificationStatus = "failed" | "pending" | "sent" | null

export const PRESCRIPTION_FULFILMENT_STAGES: PrescriptionFulfilmentStage[] = [
  "approved_not_prescribed",
  "parchment_opened",
  "webhook_received",
  "patient_notified",
]

type FulfilmentIntakeRow = {
  approved_at: string | null
  category: string | null
  created_at: string | null
  id: string
  paid_at: string | null
  parchment_reference: string | null
  reference_number: string | null
  script_sent: boolean | null
  script_sent_at: string | null
  status: string | null
  subtype: string | null
  updated_at: string | null
}

type ComplianceEventRow = {
  created_at: string
  event_type: string
  intake_id: string | null
}

type AuditEventRow = {
  created_at: string
  intake_id: string | null
  metadata: Record<string, unknown> | null
}

type ScriptSentEmailRow = {
  created_at: string | null
  delivery_status: string | null
  intake_id: string | null
  sent_at: string | null
  status: string | null
}

export interface PrescriptionFulfilmentEvidence {
  parchmentOpenedAt: string | null
  patientNotifiedAt: string | null
  webhookReceivedAt: string | null
}

export interface PrescriptionFulfilmentItem {
  confirmationSource: PrescriptionFulfilmentConfirmationSource
  id: string
  notificationStatus: ScriptSentNotificationStatus
  referenceNumber: string
  serviceLabel: string
  stage: PrescriptionFulfilmentStage
  stageAt: string | null
  status: string | null
}

export interface PrescriptionFulfilmentStageSummary {
  count: number
  detail: string
  emailFailedCount: number
  emailPendingCount: number
  items: PrescriptionFulfilmentItem[]
  key: PrescriptionFulfilmentStage
  label: string
  manualConfirmedCount: number
  oldestMinutes: number | null
  slaBreachedCount: number
  slaMinutes: number | null
  webhookConfirmedCount: number
}

export interface PrescriptionFulfilmentDashboard {
  firstNotificationIssueIntakeId: string | null
  firstNotificationIssueStatus: Exclude<ScriptSentNotificationStatus, "sent"> | null
  lookbackDays: number
  manualConfirmationCount: number
  notificationFailedCount: number
  notificationPendingCount: number
  stages: PrescriptionFulfilmentStageSummary[]
  total: number
  webhookConfirmationCount: number
}

export const EMPTY_PRESCRIPTION_FULFILMENT_DASHBOARD: PrescriptionFulfilmentDashboard = {
  firstNotificationIssueIntakeId: null,
  firstNotificationIssueStatus: null,
  lookbackDays: DEFAULT_LOOKBACK_DAYS,
  manualConfirmationCount: 0,
  notificationFailedCount: 0,
  notificationPendingCount: 0,
  stages: PRESCRIPTION_FULFILMENT_STAGES.map((stage) => ({
    count: 0,
    detail: FULFILMENT_STAGE_DETAILS[stage],
    emailFailedCount: 0,
    emailPendingCount: 0,
    items: [],
    key: stage,
    label: FULFILMENT_STAGE_LABELS[stage],
    manualConfirmedCount: 0,
    oldestMinutes: null,
    slaBreachedCount: 0,
    slaMinutes: FULFILMENT_STAGE_SLA_MINUTES[stage],
    webhookConfirmedCount: 0,
  })),
  total: 0,
  webhookConfirmationCount: 0,
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function latest(values: Array<string | null | undefined>): string | null {
  const timestamps = values.filter((value): value is string => Boolean(value))
  if (timestamps.length === 0) return null
  return timestamps.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
}

function minutesSince(value: string | null, now = Date.now()): number | null {
  if (!value) return null
  const then = new Date(value).getTime()
  if (!Number.isFinite(then)) return null
  return Math.max(0, Math.round((now - then) / 60_000))
}

function isPrescriptionFulfilmentRelevant(row: FulfilmentIntakeRow): boolean {
  if (row.status === "awaiting_script") return true
  if (row.script_sent === true) return true
  if (row.parchment_reference?.trim()) return true

  const approvedWithoutScriptEvidence = row.status === "approved" && Boolean(row.approved_at)
  if (!approvedWithoutScriptEvidence) return false

  if (row.category === "prescription") return true
  return row.category === "consult"
    && PRESCRIBING_CONSULT_SUBTYPES.has(row.subtype ?? "")
}

function serviceLabel(row: FulfilmentIntakeRow): string {
  const subtype = row.subtype?.replace(/_/g, " ")
  if (row.subtype === "ed") return "ED consult"
  if (row.subtype === "hair_loss") return "Hair loss consult"
  if (row.subtype === "womens_health") return "Women's health consult"
  if (row.subtype === "weight_loss") return "Weight loss consult"
  if (row.subtype === "repeat") return "Repeat prescription"
  if (row.category === "prescription") return subtype ? `Prescription, ${subtype}` : "Prescription"
  if (subtype) return subtype
  return row.category || "Prescription request"
}

function successfulScriptEmailAt(emails: ScriptSentEmailRow[]): string | null {
  const successful = emails.filter((email) => {
    const deliveryStatus = email.delivery_status?.toLowerCase()
    const status = email.status?.toLowerCase()

    return Boolean(
      email.sent_at ||
        status === "sent" ||
        status === "skipped_e2e" ||
        deliveryStatus === "delivered" ||
        deliveryStatus === "opened" ||
        deliveryStatus === "clicked",
    )
  })

  return latest(successful.map((email) => email.sent_at || email.created_at))
}

function scriptEmailNotificationStatus(emails: ScriptSentEmailRow[]): ScriptSentNotificationStatus {
  if (emails.length === 0) return null

  const hasSuccessful = Boolean(successfulScriptEmailAt(emails))
  if (hasSuccessful) return "sent"

  const hasFailed = emails.some((email) => {
    const deliveryStatus = email.delivery_status?.toLowerCase()
    const status = email.status?.toLowerCase()
    return status === "failed" || deliveryStatus === "bounced" || deliveryStatus === "complained"
  })
  if (hasFailed) return "failed"

  const hasPending = emails.some((email) => {
    const status = email.status?.toLowerCase()
    return status === "pending" || status === "sending"
  })
  return hasPending ? "pending" : null
}

function mapByIntake<T extends { intake_id: string | null }>(rows: T[]): Map<string, T[]> {
  const mapped = new Map<string, T[]>()

  for (const row of rows) {
    if (!row.intake_id) continue
    const existing = mapped.get(row.intake_id) || []
    existing.push(row)
    mapped.set(row.intake_id, existing)
  }

  return mapped
}

export function classifyPrescriptionFulfilment(
  row: Pick<FulfilmentIntakeRow, "parchment_reference" | "script_sent" | "script_sent_at">,
  evidence: PrescriptionFulfilmentEvidence,
): PrescriptionFulfilmentStage {
  if (evidence.patientNotifiedAt) return "patient_notified"
  if (evidence.webhookReceivedAt || row.script_sent || row.script_sent_at || row.parchment_reference) {
    return "webhook_received"
  }
  if (evidence.parchmentOpenedAt) return "parchment_opened"
  return "approved_not_prescribed"
}

function resolveConfirmationSource(
  row: Pick<FulfilmentIntakeRow, "parchment_reference" | "script_sent" | "script_sent_at">,
  evidence: PrescriptionFulfilmentEvidence,
): PrescriptionFulfilmentConfirmationSource {
  if (evidence.webhookReceivedAt) return "parchment_webhook"
  if (row.script_sent || row.script_sent_at || row.parchment_reference) return "manual_or_pms"
  return null
}

function isSlaBreached(
  item: Pick<PrescriptionFulfilmentItem, "stage" | "stageAt">,
  now: number,
): boolean {
  const slaMinutes = FULFILMENT_STAGE_SLA_MINUTES[item.stage]
  if (slaMinutes == null) return false

  const age = minutesSince(item.stageAt, now)
  return age != null && age > slaMinutes
}

export function buildPrescriptionFulfilmentDashboard({
  auditEvents,
  complianceEvents,
  emails,
  intakes,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  now = Date.now(),
}: {
  auditEvents: AuditEventRow[]
  complianceEvents: ComplianceEventRow[]
  emails: ScriptSentEmailRow[]
  intakes: FulfilmentIntakeRow[]
  lookbackDays?: number
  now?: number
}): PrescriptionFulfilmentDashboard {
  const complianceByIntake = mapByIntake(complianceEvents)
  const auditByIntake = mapByIntake(auditEvents)
  const emailsByIntake = mapByIntake(emails)

  const items = intakes
    .filter(isPrescriptionFulfilmentRelevant)
    .map((row): PrescriptionFulfilmentItem => {
      const compliance = complianceByIntake.get(row.id) || []
      const audits = auditByIntake.get(row.id) || []
      const scriptEmails = emailsByIntake.get(row.id) || []
      const parchmentOpenedAt = latest(
        compliance
          .filter((event) => event.event_type === "no_prescribing_in_platform")
          .map((event) => event.created_at),
      )
      const webhookReceivedAt = latest(
        audits
          .filter((event) => {
            const actionType = metadataString(event.metadata, "action_type")
            return (
              actionType === "parchment_webhook_script_sent" ||
              actionType === "parchment_webhook_prescription_synced" ||
              actionType === "parchment_webhook_already_processed"
            )
          })
          .map((event) => event.created_at),
      )
      const patientNotifiedAt = successfulScriptEmailAt(scriptEmails)
      const evidence = { parchmentOpenedAt, patientNotifiedAt, webhookReceivedAt }
      const stage = classifyPrescriptionFulfilment(row, evidence)
      const stageAt = {
        approved_not_prescribed: row.approved_at || row.updated_at || row.paid_at || row.created_at,
        parchment_opened: parchmentOpenedAt,
        webhook_received: webhookReceivedAt || row.script_sent_at || row.updated_at,
        patient_notified: patientNotifiedAt,
      }[stage]

      return {
        confirmationSource: resolveConfirmationSource(row, evidence),
        id: row.id,
        notificationStatus: scriptEmailNotificationStatus(scriptEmails),
        referenceNumber: row.reference_number || row.id.slice(0, 8),
        serviceLabel: serviceLabel(row),
        stage,
        stageAt,
        status: row.status,
      }
    })

  const stages = PRESCRIPTION_FULFILMENT_STAGES.map((stage) => {
    const stageItems = items
      .filter((item) => item.stage === stage)
      .sort((a, b) => {
        const aTime = a.stageAt ? new Date(a.stageAt).getTime() : 0
        const bTime = b.stageAt ? new Date(b.stageAt).getTime() : 0
        return bTime - aTime
      })
    const oldest = stageItems.reduce<number | null>((current, item) => {
      const age = minutesSince(item.stageAt, now)
      if (age == null) return current
      return current == null ? age : Math.max(current, age)
    }, null)

    return {
      count: stageItems.length,
      detail: FULFILMENT_STAGE_DETAILS[stage],
      emailFailedCount: stageItems.filter((item) => item.notificationStatus === "failed").length,
      emailPendingCount: stageItems.filter((item) => item.notificationStatus === "pending").length,
      items: stageItems.slice(0, 3),
      key: stage,
      label: FULFILMENT_STAGE_LABELS[stage],
      manualConfirmedCount: stageItems.filter((item) => item.confirmationSource === "manual_or_pms").length,
      oldestMinutes: oldest,
      slaBreachedCount: stageItems.filter((item) => isSlaBreached(item, now)).length,
      slaMinutes: FULFILMENT_STAGE_SLA_MINUTES[stage],
      webhookConfirmedCount: stageItems.filter((item) => item.confirmationSource === "parchment_webhook").length,
    }
  })

  const notificationIssue = items.find((item) =>
    item.notificationStatus === "failed" || item.notificationStatus === "pending"
  )

  return {
    firstNotificationIssueIntakeId: notificationIssue?.id ?? null,
    firstNotificationIssueStatus:
      notificationIssue?.notificationStatus === "failed" || notificationIssue?.notificationStatus === "pending"
        ? notificationIssue.notificationStatus
        : null,
    lookbackDays,
    manualConfirmationCount: items.filter((item) => item.confirmationSource === "manual_or_pms").length,
    notificationFailedCount: items.filter((item) => item.notificationStatus === "failed").length,
    notificationPendingCount: items.filter((item) => item.notificationStatus === "pending").length,
    stages,
    total: items.length,
    webhookConfirmationCount: items.filter((item) => item.confirmationSource === "parchment_webhook").length,
  }
}

export async function getPrescriptionFulfilmentDashboard(
  supabase: SupabaseClient,
  options: { lookbackDays?: number } = {},
): Promise<PrescriptionFulfilmentDashboard> {
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString()

  const intakesQuery = supabase
    .from("intakes")
    .select("id, reference_number, status, category, subtype, paid_at, approved_at, script_sent, script_sent_at, parchment_reference, updated_at, created_at")
    .not("paid_at", "is", null)
    .gte("paid_at", since)
    .in("category", ["prescription", "consult"])
    .order("updated_at", { ascending: false })
    .limit(500)

  const { data, error } = await filterReportableIntakes(intakesQuery)
  if (error) {
    throw new Error(`Prescription fulfilment intake query failed: ${error.message}`)
  }

  const intakes = ((data || []) as FulfilmentIntakeRow[]).filter(isPrescriptionFulfilmentRelevant)
  const intakeIds = intakes.map((intake) => intake.id)

  if (intakeIds.length === 0) {
    return buildPrescriptionFulfilmentDashboard({ auditEvents: [], complianceEvents: [], emails: [], intakes, lookbackDays })
  }

  const [complianceResult, auditResult, emailResult] = await Promise.all([
    supabase
      .from("compliance_audit_log")
      .select("intake_id, event_type, created_at")
      .in("intake_id", intakeIds)
      .in("event_type", ["no_prescribing_in_platform", "external_prescribing_indicated"])
      .order("created_at", { ascending: false }),

    supabase
      .from("audit_logs")
      .select("intake_id, metadata, created_at")
      .in("intake_id", intakeIds)
      .in("action", ["admin_action", "webhook_failed"])
      .order("created_at", { ascending: false }),

    supabase
      .from("email_outbox")
      .select("intake_id, status, delivery_status, sent_at, created_at")
      .in("intake_id", intakeIds)
      .eq("email_type", "script_sent")
      .order("created_at", { ascending: false }),
  ])

  if (complianceResult.error) {
    throw new Error(`Prescription fulfilment compliance query failed: ${complianceResult.error.message}`)
  }
  if (auditResult.error) {
    throw new Error(`Prescription fulfilment audit query failed: ${auditResult.error.message}`)
  }
  if (emailResult.error) {
    throw new Error(`Prescription fulfilment email query failed: ${emailResult.error.message}`)
  }

  return buildPrescriptionFulfilmentDashboard({
    auditEvents: (auditResult.data || []) as AuditEventRow[],
    complianceEvents: (complianceResult.data || []) as ComplianceEventRow[],
    emails: (emailResult.data || []) as ScriptSentEmailRow[],
    intakes,
    lookbackDays,
  })
}

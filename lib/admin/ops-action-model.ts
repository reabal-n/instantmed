import type { CertificateDeliveryRescueOverview } from "@/lib/admin/certificate-delivery-rescue"
import type {
  OperationalFailureCategory,
  OperationalFailureOverview,
} from "@/lib/admin/ops-failures"
import type { OperationalInvariants } from "@/lib/admin/ops-invariants"
import {
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_REFUNDS_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildAdminIntakeHref,
  buildStaffEmailHubHref,
  buildStaffLedgerHref,
  STAFF_ANALYTICS_HREF,
  STAFF_OPS_HREF,
} from "@/lib/dashboard/routes"
import type { PrescribingIdentityBlockerReport } from "@/lib/doctor/prescribing-identity-blockers"

export const OPS_GROUP_ORDER = [
  "payments",
  "fulfilment",
  "identity_access",
  "delivery",
  "measurement",
] as const

export type OpsActionGroupKey = (typeof OPS_GROUP_ORDER)[number]
export type OpsActionSeverity = "critical" | "warning"

export interface OpsActionIssue {
  action: "link" | "repair_certificate_timestamps" | "resend_certificate"
  certificateIntakeId: string | null
  count: number
  detail: string
  group: OpsActionGroupKey
  href: string
  id: string
  nextAction: string
  occurredAt: string | null
  owner: "Admin" | "Doctor" | "Support"
  severity: OpsActionSeverity
  title: string
}

export interface OpsActionGroup {
  count: number
  detail: string
  issues: OpsActionIssue[]
  key: OpsActionGroupKey
  label: string
}

export interface OpsActionModel {
  allClear: boolean
  generatedAt: string
  groups: OpsActionGroup[]
  openCount: number
}

const GROUP_COPY: Record<OpsActionGroupKey, { label: string; detail: string }> = {
  payments: { label: "Payments", detail: "Checkout, refund, and Stripe webhook recovery." },
  fulfilment: { label: "Fulfilment", detail: "Clinical review and prescription handoff work." },
  identity_access: { label: "Identity & access", detail: "Prescribing identity blockers." },
  delivery: { label: "Delivery", detail: "Certificate and email delivery exceptions." },
  measurement: { label: "Measurement", detail: "Reporting and conversion evidence failures." },
}

type FailureCategoryId = OperationalFailureCategory["id"]

const FAILURE_GROUP: Record<FailureCategoryId, OpsActionGroupKey> = {
  stripe_webhooks: "payments",
  checkout: "payments",
  refund_failures: "payments",
  incomplete_requests: "payments",
  prescription_delivery: "fulfilment",
  stale_scripts: "fulfilment",
  email_delivery: "delivery",
  certificate_delivery: "delivery",
}

const FAILURE_NEXT_ACTION: Record<FailureCategoryId, string> = {
  stripe_webhooks: "Retry or resolve the dead-letter events.",
  checkout: "Open failed payments and retry or close each request.",
  refund_failures: "Reconcile the failed Stripe refunds.",
  incomplete_requests: "Decide whether recovery or closure is required.",
  prescription_delivery: "Inspect the Parchment webhook failures.",
  stale_scripts: "Resolve the oldest prescription handoff first.",
  email_delivery: "Inspect the failed or suppressed email rows.",
  certificate_delivery: "Restore secure certificate delivery.",
}

function oldestTimestamp(values: Array<string | null | undefined>): string | null {
  const timestamps = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => ({ value, time: Date.parse(value) }))
    .filter(({ time }) => Number.isFinite(time))
    .sort((left, right) => left.time - right.time)
  return timestamps[0]?.value ?? null
}

function failureHref(category: FailureCategoryId, isAdmin: boolean): string {
  if (category === "stripe_webhooks") return ADMIN_WEBHOOK_DLQ_HREF
  if (category === "checkout" || category === "incomplete_requests") {
    return buildStaffLedgerHref({ chips: category === "checkout" ? ["failed_payment"] : undefined })
  }
  if (category === "refund_failures") {
    return isAdmin ? `${ADMIN_REFUNDS_HREF}?status=failed` : buildStaffLedgerHref({ chips: ["refund_failed"] })
  }
  if (category === "prescription_delivery" || category === "stale_scripts") {
    return ADMIN_PARCHMENT_OPS_HREF
  }
  if (category === "email_delivery") return isAdmin ? buildStaffEmailHubHref({ tab: "queue" }) : STAFF_OPS_HREF
  return buildStaffLedgerHref({ status: "approved" })
}

function failureOwner(category: FailureCategoryId): OpsActionIssue["owner"] {
  if (category === "prescription_delivery" || category === "stale_scripts") return "Doctor"
  if (category === "email_delivery" || category === "certificate_delivery" || category === "refund_failures") {
    return "Admin"
  }
  return "Support"
}

function failureIssues(
  overview: OperationalFailureOverview,
  isAdmin: boolean,
): OpsActionIssue[] {
  return overview.categories.flatMap((category) => {
    if (category.count <= 0) return []
    const categoryRows = overview.recent.filter((item) => item.categoryId === category.id)
    return [{
      action: "link" as const,
      certificateIntakeId: null,
      count: category.count,
      detail: `${category.count} open ${category.label.toLowerCase()} ${category.count === 1 ? "exception" : "exceptions"}.`,
      group: FAILURE_GROUP[category.id],
      href: failureHref(category.id, isAdmin),
      id: `failure:${category.id}`,
      nextAction: FAILURE_NEXT_ACTION[category.id],
      occurredAt: oldestTimestamp(categoryRows.map((item) => item.occurredAt)),
      owner: failureOwner(category.id),
      severity: category.severity,
      title: category.label,
    }]
  })
}

function invariantIssues(
  invariants: OperationalInvariants,
  isAdmin: boolean,
  generatedAt: string,
  certificateEscalations: number,
): OpsActionIssue[] {
  const issues: OpsActionIssue[] = []
  const add = (issue: Omit<OpsActionIssue, "action" | "certificateIntakeId" | "occurredAt"> & {
    action?: OpsActionIssue["action"]
  }) => issues.push({
    action: issue.action ?? "link",
    certificateIntakeId: null,
    occurredAt: generatedAt,
    ...issue,
  })

  if (invariants.slaBreachBacklog > 0) {
    add({
      count: invariants.slaBreachBacklog,
      detail: `${invariants.slaBreachBacklog} paid ${invariants.slaBreachBacklog === 1 ? "request is" : "requests are"} past the 24-hour review ceiling.`,
      group: "fulfilment",
      href: buildStaffLedgerHref({ workLane: "clinical" }),
      id: "invariant:sla_breach_backlog",
      nextAction: "Review the oldest paid request first.",
      owner: "Doctor",
      severity: invariants.slaBreachBacklog >= 10 ? "critical" : "warning",
      title: "Review SLA backlog",
    })
  }
  if ((invariants.paidButCancelled ?? 0) > 0) {
    const count = invariants.paidButCancelled ?? 0
    add({
      count,
      detail: `${count} paid ${count === 1 ? "request was" : "requests were"} cancelled without a recorded refund.`,
      group: "payments",
      href: buildStaffLedgerHref({ status: "cancelled" }),
      id: "invariant:paid_but_cancelled",
      nextAction: "Confirm fulfilment and refund state before closing.",
      owner: "Admin",
      severity: "critical",
      title: "Paid and cancelled",
    })
  }
  if (invariants.certRefundOrphans > 0) {
    add({
      count: invariants.certRefundOrphans,
      detail: `${invariants.certRefundOrphans} refunded certificate ${invariants.certRefundOrphans === 1 ? "still verifies" : "records still verify"} as valid.`,
      group: "payments",
      href: buildStaffLedgerHref({ chips: ["refunded"] }),
      id: "invariant:certificate_refund_orphans",
      nextAction: "Revoke or document the exception.",
      owner: "Admin",
      severity: "critical",
      title: "Certificate refund orphans",
    })
  }
  if (invariants.refundRecordAnomalies > 0) {
    add({
      count: invariants.refundRecordAnomalies,
      detail: `${invariants.refundRecordAnomalies} refunded ${invariants.refundRecordAnomalies === 1 ? "request is" : "requests are"} missing complete refund metadata.`,
      group: "payments",
      href: buildStaffLedgerHref({ chips: ["refunded"] }),
      id: "invariant:refund_record_anomalies",
      nextAction: "Reconcile the payment and intake records.",
      owner: "Admin",
      severity: "warning",
      title: "Refund record anomalies",
    })
  }

  const missingCertificateCount = Math.max(
    0,
    (invariants.approvedCertificateMissingRecord ?? 0) - certificateEscalations,
  )
  if (missingCertificateCount > 0) {
    add({
      count: missingCertificateCount,
      detail: `${missingCertificateCount} approved ${missingCertificateCount === 1 ? "request has" : "requests have"} no visible certificate record.`,
      group: "delivery",
      href: buildStaffLedgerHref({ status: "approved" }),
      id: "invariant:approved_certificate_missing_record",
      nextAction: "Escalate for certificate generation review.",
      owner: "Doctor",
      severity: "critical",
      title: "Certificate record missing",
    })
  }
  if ((invariants.certificateSentMissingTimestamp ?? 0) > 0) {
    const count = invariants.certificateSentMissingTimestamp ?? 0
    add({
      action: isAdmin ? "repair_certificate_timestamps" : "link",
      count,
      detail: `${count} sent certificate ${count === 1 ? "email lacks" : "emails lack"} the patient-facing sent timestamp.`,
      group: "delivery",
      href: STAFF_OPS_HREF,
      id: "invariant:certificate_sent_missing_timestamp",
      nextAction: isAdmin ? "Mirror durable sent-email evidence into the request record." : "Escalate the timestamp repair to an admin.",
      owner: "Admin",
      severity: "warning",
      title: "Certificate timestamp drift",
    })
  }
  if ((invariants.queryFailures?.length ?? 0) > 0) {
    const count = invariants.queryFailures?.length ?? 0
    add({
      count,
      detail: `${count} operational invariant ${count === 1 ? "query failed" : "queries failed"}; a zero count cannot be trusted.`,
      group: "measurement",
      href: STAFF_OPS_HREF,
      id: "invariant:query_failures",
      nextAction: "Inspect server logs and restore the failed checks.",
      owner: "Admin",
      severity: "critical",
      title: "Operational checks unavailable",
    })
  }

  return issues
}

function certificateIssues(
  overview: CertificateDeliveryRescueOverview,
  isAdmin: boolean,
): OpsActionIssue[] {
  return overview.cases.flatMap((row) => {
    if (row.recommendation.action === "none") return []
    const owner: OpsActionIssue["owner"] = row.recommendation.action === "resend_secure_link"
      ? "Support"
      : row.recommendation.action === "escalate"
        ? "Doctor"
        : "Admin"
    const href = isAdmin
      ? row.recommendation.action === "resend_receipt"
        ? row.emailHubHref
        : buildAdminIntakeHref(row.intakeId)
      : row.referenceNumber
        ? buildStaffLedgerHref({ q: row.referenceNumber })
        : STAFF_OPS_HREF

    return [{
      action: row.recommendation.action === "resend_secure_link" ? "resend_certificate" as const : "link" as const,
      certificateIntakeId: row.recommendation.action === "resend_secure_link" ? row.intakeId : null,
      count: 1,
      detail: row.recommendation.reason,
      group: "delivery" as const,
      href,
      id: `certificate:${row.intakeId}`,
      nextAction: row.recommendation.label,
      occurredAt: row.updatedAt,
      owner,
      severity: row.recommendation.severity === "critical" ? "critical" as const : "warning" as const,
      title: `${row.referenceNumber || `Request ${row.shortIntakeId}`} · certificate delivery`,
    }]
  })
}

function sortIssues(issues: OpsActionIssue[]): OpsActionIssue[] {
  return [...issues].sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "critical" ? -1 : 1
    const leftTime = left.occurredAt ? Date.parse(left.occurredAt) : Number.POSITIVE_INFINITY
    const rightTime = right.occurredAt ? Date.parse(right.occurredAt) : Number.POSITIVE_INFINITY
    return leftTime - rightTime
  })
}

export function buildOpsActionModel(args: {
  certificateDelivery: CertificateDeliveryRescueOverview
  failureOverview: OperationalFailureOverview
  googleAdsConversionHealth: { notReaching: number; queryFailed: boolean }
  identity: PrescribingIdentityBlockerReport
  isAdmin: boolean
  invariants: OperationalInvariants
  now?: Date
  sourceQueryFailures?: string[]
}): OpsActionModel {
  const now = args.now ?? new Date()
  const generatedAt = now.toISOString()
  const certificateActions = certificateIssues(args.certificateDelivery, args.isAdmin)
  const certificateEscalations = args.certificateDelivery.cases.filter(
    (row) => row.recommendation.action === "escalate",
  ).length
  const issues = [
    ...failureIssues(args.failureOverview, args.isAdmin),
    ...certificateActions,
    ...invariantIssues(args.invariants, args.isAdmin, generatedAt, certificateEscalations),
  ]

  if (args.identity.queryFailed) {
    issues.push({
      action: "link",
      certificateIntakeId: null,
      count: 1,
      detail: "The prescribing identity blocker read failed; zero blockers cannot be assumed.",
      group: "identity_access",
      href: ADMIN_PRESCRIBING_IDENTITY_HREF,
      id: "identity:query_failed",
      nextAction: "Restore the identity readiness check.",
      occurredAt: generatedAt,
      owner: "Admin",
      severity: "critical",
      title: "Identity readiness unavailable",
    })
  } else if (args.identity.blockedCount > 0) {
    issues.push({
      action: "link",
      certificateIntakeId: null,
      count: args.identity.blockedCount,
      detail: `${args.identity.blockedCount} paid prescribing ${args.identity.blockedCount === 1 ? "request is" : "requests are"} blocked by missing identity data.`,
      group: "identity_access",
      href: ADMIN_PRESCRIBING_IDENTITY_HREF,
      id: "identity:blocked",
      nextAction: "Resolve the oldest identity blocker first.",
      occurredAt: oldestTimestamp(args.identity.items.map((item) => item.paidAt ?? item.createdAt)),
      owner: "Support",
      severity: "warning",
      title: "Prescribing identity blocked",
    })
  }

  if (args.googleAdsConversionHealth.queryFailed || args.googleAdsConversionHealth.notReaching > 0) {
    const queryFailed = args.googleAdsConversionHealth.queryFailed
    issues.push({
      action: "link",
      certificateIntakeId: null,
      count: queryFailed ? 1 : args.googleAdsConversionHealth.notReaching,
      detail: queryFailed
        ? "Google Ads conversion delivery could not be checked."
        : `${args.googleAdsConversionHealth.notReaching} paid ${args.googleAdsConversionHealth.notReaching === 1 ? "conversion is" : "conversions are"} not reaching Google.`,
      group: "measurement",
      href: args.isAdmin ? STAFF_ANALYTICS_HREF : STAFF_OPS_HREF,
      id: "measurement:google_ads_conversions",
      nextAction: args.isAdmin ? "Open Business and inspect tracking evidence." : "Escalate conversion delivery to an admin.",
      occurredAt: generatedAt,
      owner: "Admin",
      severity: queryFailed ? "warning" : "critical",
      title: queryFailed ? "Ads conversion health unavailable" : "Ads conversions missing",
    })
  }

  if (args.certificateDelivery.queryFailed) {
    issues.push({
      action: "link",
      certificateIntakeId: null,
      count: 1,
      detail: "Certificate delivery state could not be read; successful delivery cannot be assumed.",
      group: "delivery",
      href: buildStaffLedgerHref({ status: "approved" }),
      id: "delivery:certificate_query_failed",
      nextAction: "Restore the certificate delivery check.",
      occurredAt: generatedAt,
      owner: "Admin",
      severity: "critical",
      title: "Certificate delivery check unavailable",
    })
  }

  const sourceFailures = args.sourceQueryFailures ?? []
  if (sourceFailures.length > 0) {
    issues.push({
      action: "link",
      certificateIntakeId: null,
      count: sourceFailures.length,
      detail: `${sourceFailures.length} operational ${sourceFailures.length === 1 ? "source read failed" : "source reads failed"}: ${sourceFailures.join(", ")}.`,
      group: "measurement",
      href: STAFF_OPS_HREF,
      id: "measurement:source_query_failures",
      nextAction: "Inspect server logs before treating any affected lane as clear.",
      occurredAt: generatedAt,
      owner: "Admin",
      severity: "critical",
      title: "Operations data incomplete",
    })
  }

  const groups = OPS_GROUP_ORDER.flatMap((key): OpsActionGroup[] => {
    const groupIssues = sortIssues(issues.filter((issue) => issue.group === key))
    if (groupIssues.length === 0) return []
    return [{
      count: groupIssues.reduce((sum, issue) => sum + issue.count, 0),
      detail: GROUP_COPY[key].detail,
      issues: groupIssues,
      key,
      label: GROUP_COPY[key].label,
    }]
  })

  return {
    allClear: groups.length === 0,
    generatedAt,
    groups,
    openCount: groups.reduce((sum, group) => sum + group.count, 0),
  }
}

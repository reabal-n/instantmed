import {
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_INTAKE_LEDGER_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_REFUNDS_HREF,
  ADMIN_STALE_INTAKES_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  buildAdminIntakeHref,
  buildAdminIntakeLedgerHref,
} from "@/lib/dashboard/routes"

type Severity = "critical" | "warning"

type StripeDlqRow = {
  id: string
  created_at: string
  event_type?: string | null
}

type EmailFailureRow = {
  id: string
  created_at: string
  email_type?: string | null
  status?: string | null
  error_message?: string | null
  delivery_status?: string | null
}

type CheckoutFailureRow = {
  id: string
  created_at: string
  updated_at?: string | null
  category?: string | null
  subtype?: string | null
  checkout_error?: string | null
}

type IncompleteRequestRow = {
  id: string
  created_at: string
  updated_at?: string | null
  category?: string | null
  subtype?: string | null
}

type CertificateFailureRow = {
  id: string
  intake_id?: string | null
  updated_at?: string | null
  email_failed_at?: string | null
  email_failure_reason?: string | null
}

type AuditFailureRow = {
  id: string
  action: string
  created_at: string
  metadata: Record<string, unknown> | null
}

type StaleScriptIntakeRow = {
  id: string
  created_at: string
  updated_at?: string | null
  category?: string | null
  subtype?: string | null
}

type RefundFailureRow = {
  id: string
  created_at: string
  updated_at?: string | null
  intake_id?: string | null
  refund_reason?: string | null
}

export interface OperationalFailureOverviewInput {
  stripeDlq: StripeDlqRow[]
  emailFailures: EmailFailureRow[]
  checkoutFailures: CheckoutFailureRow[]
  incompleteRequests: IncompleteRequestRow[]
  certificateFailures: CertificateFailureRow[]
  prescriptionWebhookFailures: AuditFailureRow[]
  staleScriptIntakes: StaleScriptIntakeRow[]
  refundFailures: RefundFailureRow[]
}

export interface OperationalFailureCategory {
  id:
    | "stripe_webhooks"
    | "email_delivery"
    | "checkout"
    | "incomplete_requests"
    | "certificate_delivery"
    | "prescription_delivery"
    | "stale_scripts"
    | "refund_failures"
  label: string
  count: number
  href: string
  severity: Severity
  emptyLabel: string
}

export interface OperationalFailureItem {
  id: string
  categoryId: OperationalFailureCategory["id"]
  title: string
  detail: string
  occurredAt: string
  href: string
  severity: Severity
}

export interface OperationalFailureOverview {
  openCount: number
  categories: OperationalFailureCategory[]
  recent: OperationalFailureItem[]
}

function metadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function sortByOccurredAtDesc(items: OperationalFailureItem[]): OperationalFailureItem[] {
  return [...items].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}

export function buildOperationalFailureOverview(input: OperationalFailureOverviewInput): OperationalFailureOverview {
  const categories: OperationalFailureCategory[] = [
    {
      id: "stripe_webhooks",
      label: "Payment webhooks",
      count: input.stripeDlq.length,
      href: ADMIN_WEBHOOK_DLQ_HREF,
      severity: "critical",
      emptyLabel: "No open payment webhook failures",
    },
    {
      id: "email_delivery",
      label: "Email delivery",
      count: input.emailFailures.length,
      href: ADMIN_EMAIL_HUB_HREF,
      severity: "warning",
      emptyLabel: "No failed or bounced emails",
    },
    {
      id: "checkout",
      label: "Checkout",
      count: input.checkoutFailures.length,
      href: ADMIN_INTAKE_LEDGER_HREF,
      severity: "critical",
      emptyLabel: "No failed checkout sessions",
    },
    {
      id: "incomplete_requests",
      label: "Incomplete requests",
      count: input.incompleteRequests.length,
      href: ADMIN_INTAKE_LEDGER_HREF,
      severity: "warning",
      emptyLabel: "No abandoned checkout requests",
    },
    {
      id: "certificate_delivery",
      label: "Medical certificates",
      count: input.certificateFailures.length,
      href: buildAdminIntakeLedgerHref({ status: "approved" }),
      severity: "critical",
      emptyLabel: "No certificate send failures",
    },
    {
      id: "prescription_delivery",
      label: "Prescription delivery",
      count: input.prescriptionWebhookFailures.length,
      href: ADMIN_PARCHMENT_OPS_HREF,
      severity: "critical",
      emptyLabel: "No prescription webhook failures",
    },
    {
      id: "stale_scripts",
      label: "Scripts waiting",
      count: input.staleScriptIntakes.length,
      href: ADMIN_STALE_INTAKES_HREF,
      severity: "warning",
      emptyLabel: "No stale script tasks",
    },
    {
      id: "refund_failures",
      label: "Refund failures",
      count: input.refundFailures.length,
      href: `${ADMIN_REFUNDS_HREF}?status=failed`,
      severity: "critical",
      emptyLabel: "No failed refunds",
    },
  ]

  const recent: OperationalFailureItem[] = [
    ...input.stripeDlq.map((row) => ({
      id: row.id,
      categoryId: "stripe_webhooks" as const,
      title: "Payment webhook failed",
      detail: row.event_type || "Unknown event",
      occurredAt: row.created_at,
      href: ADMIN_WEBHOOK_DLQ_HREF,
      severity: "critical" as const,
    })),
    ...input.emailFailures.map((row) => ({
      id: row.id,
      categoryId: "email_delivery" as const,
      title: "Email delivery failed",
      detail: row.error_message || row.delivery_status || row.email_type || row.status || "Email needs review",
      occurredAt: row.created_at,
      href: ADMIN_EMAIL_HUB_HREF,
      severity: "warning" as const,
    })),
    ...input.checkoutFailures.map((row) => ({
      id: row.id,
      categoryId: "checkout" as const,
      title: "Checkout failed",
      detail: row.checkout_error || [row.category, row.subtype].filter(Boolean).join(" / ") || "Payment session failed",
      occurredAt: row.updated_at || row.created_at,
      href: buildAdminIntakeHref(row.id),
      severity: "critical" as const,
    })),
    ...input.incompleteRequests.map((row) => ({
      id: row.id,
      categoryId: "incomplete_requests" as const,
      title: "Request left incomplete",
      detail: [row.category, row.subtype].filter(Boolean).join(" / ") || "Awaiting checkout completion",
      occurredAt: row.updated_at || row.created_at,
      href: buildAdminIntakeHref(row.id),
      severity: "warning" as const,
    })),
    ...input.certificateFailures.map((row) => ({
      id: row.id,
      categoryId: "certificate_delivery" as const,
      title: "Certificate send failed",
      detail: row.email_failure_reason || "Certificate email needs retry",
      occurredAt: row.email_failed_at || row.updated_at || "",
      href: row.intake_id ? buildAdminIntakeHref(row.intake_id) : buildAdminIntakeLedgerHref({ status: "approved" }),
      severity: "critical" as const,
    })),
    ...input.prescriptionWebhookFailures.map((row) => ({
      id: row.id,
      categoryId: "prescription_delivery" as const,
      title: "Prescription webhook failed",
      detail: metadataString(row.metadata, "error") || row.action,
      occurredAt: row.created_at,
      href: ADMIN_PARCHMENT_OPS_HREF,
      severity: "critical" as const,
    })),
    ...input.staleScriptIntakes.map((row) => ({
      id: row.id,
      categoryId: "stale_scripts" as const,
      title: "Script still waiting",
      detail: [row.category, row.subtype].filter(Boolean).join(" / ") || "Awaiting script completion",
      occurredAt: row.updated_at || row.created_at,
      href: buildAdminIntakeHref(row.id),
      severity: "warning" as const,
    })),
    ...input.refundFailures.map((row) => ({
      id: row.id,
      categoryId: "refund_failures" as const,
      title: "Refund failed",
      detail: row.refund_reason || "Stripe refund needs review",
      occurredAt: row.updated_at || row.created_at,
      href: row.intake_id ? buildAdminIntakeHref(row.intake_id) : `${ADMIN_REFUNDS_HREF}?status=failed`,
      severity: "critical" as const,
    })),
  ]

  return {
    openCount: categories.reduce((total, category) => total + category.count, 0),
    categories,
    recent: sortByOccurredAtDesc(recent).filter((item) => item.occurredAt).slice(0, 12),
  }
}

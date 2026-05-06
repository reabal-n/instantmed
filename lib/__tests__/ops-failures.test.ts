import { describe, expect, it } from "vitest"

import { buildOperationalFailureOverview } from "@/lib/admin/ops-failures"

describe("operational failure overview", () => {
  it("groups money, delivery, certificate, and script failures into one inbox", () => {
    const overview = buildOperationalFailureOverview({
      stripeDlq: [
        { id: "dlq-1", created_at: "2026-05-06T01:00:00.000Z", event_type: "checkout.session.completed" },
      ],
      emailFailures: [
        {
          id: "email-1",
          created_at: "2026-05-06T02:00:00.000Z",
          email_type: "med_cert_patient",
          status: "failed",
          error_message: "Resend rejected recipient",
        },
      ],
      checkoutFailures: [
        {
          id: "intake-1",
          created_at: "2026-05-06T03:00:00.000Z",
          updated_at: "2026-05-06T03:01:00.000Z",
          category: "prescription",
          subtype: "repeat",
          checkout_error: "No such price",
        },
      ],
      incompleteRequests: [
        {
          id: "intake-incomplete",
          created_at: "2026-05-06T03:30:00.000Z",
          updated_at: "2026-05-06T03:35:00.000Z",
          category: "consult",
          subtype: "hair_loss",
        },
      ],
      certificateFailures: [
        {
          id: "cert-1",
          intake_id: "intake-2",
          updated_at: "2026-05-06T04:00:00.000Z",
          email_failed_at: "2026-05-06T04:00:00.000Z",
          email_failure_reason: "Email send failed",
        },
      ],
      prescriptionWebhookFailures: [
        {
          id: "audit-1",
          created_at: "2026-05-06T05:00:00.000Z",
          action: "webhook_failed",
          metadata: {
            eventType: "parchment:prescription.created",
            error: "prescription_sync_failed",
            intakeId: "intake-3",
          },
        },
      ],
      staleScriptIntakes: [
        {
          id: "intake-4",
          created_at: "2026-05-05T05:00:00.000Z",
          updated_at: "2026-05-05T07:00:00.000Z",
          category: "prescription",
          subtype: "repeat",
        },
      ],
    })

    expect(overview.openCount).toBe(7)
    expect(overview.categories.map((category) => category.id)).toEqual([
      "stripe_webhooks",
      "email_delivery",
      "checkout",
      "incomplete_requests",
      "certificate_delivery",
      "prescription_delivery",
      "stale_scripts",
    ])
    expect(overview.recent[0]).toMatchObject({
      id: "audit-1",
      title: "Prescription webhook failed",
      href: "/admin/ops/parchment",
      severity: "critical",
    })
    expect(overview.categories.find((category) => category.id === "stripe_webhooks")).toMatchObject({
      label: "Payment webhooks",
      href: "/admin/webhook-dlq",
    })
    expect(overview.categories.find((category) => category.id === "stale_scripts")).toMatchObject({
      href: "/admin/ops/intakes-stuck",
    })
    expect(overview.recent.every((item) => !item.href.startsWith("/doctor"))).toBe(true)
  })

  it("reports a clean state without inventing failures", () => {
    const overview = buildOperationalFailureOverview({
      stripeDlq: [],
      emailFailures: [],
      checkoutFailures: [],
      incompleteRequests: [],
      certificateFailures: [],
      prescriptionWebhookFailures: [],
      staleScriptIntakes: [],
    })

    expect(overview.openCount).toBe(0)
    expect(overview.categories.every((category) => category.count === 0)).toBe(true)
    expect(overview.recent).toEqual([])
  })
})

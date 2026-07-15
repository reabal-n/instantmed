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
      refundFailures: [
        {
          id: "payment-1",
          intake_id: "intake-5",
          created_at: "2026-05-06T06:00:00.000Z",
          updated_at: "2026-05-06T06:01:00.000Z",
          refund_reason: "Stripe refund failed",
        },
      ],
    })

    expect(overview.openCount).toBe(8)
    expect(overview.categories.map((category) => category.id)).toEqual([
      "stripe_webhooks",
      "email_delivery",
      "checkout",
      "incomplete_requests",
      "certificate_delivery",
      "prescription_delivery",
      "stale_scripts",
      "refund_failures",
    ])
    expect(overview.recent[0]).toMatchObject({
      id: "payment-1",
      title: "Refund failed",
      href: "/admin/intakes/intake-5",
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
      refundFailures: [],
    })

    expect(overview.openCount).toBe(0)
    expect(overview.categories.every((category) => category.count === 0)).toBe(true)
    expect(overview.recent).toEqual([])
  })

  it.each([
    ["safety_blocked_high_stakes", "High-stakes request blocked before payment"],
    ["safety_missing_required_information", "More medical information required before payment"],
  ])("humanises checkout safety marker %s", (marker, expectedDetail) => {
    const overview = buildOperationalFailureOverview({
      stripeDlq: [],
      emailFailures: [],
      checkoutFailures: [{
        id: `intake-${marker}`,
        created_at: "2026-07-15T00:00:00.000Z",
        checkout_error: marker,
      }],
      incompleteRequests: [],
      certificateFailures: [],
      prescriptionWebhookFailures: [],
      staleScriptIntakes: [],
      refundFailures: [],
    })

    expect(overview.recent[0]?.detail).toBe(expectedDetail)
    expect(overview.recent[0]?.detail).not.toContain(marker)
  })

  it("surfaces approved prescribing rows that are missing script evidence", () => {
    const overview = buildOperationalFailureOverview({
      stripeDlq: [],
      emailFailures: [],
      checkoutFailures: [],
      incompleteRequests: [],
      certificateFailures: [],
      prescriptionWebhookFailures: [],
      staleScriptIntakes: [
        {
          id: "intake-approved-script-missing",
          approved_at: "2026-06-15T08:54:47.656Z",
          created_at: "2026-06-15T08:30:00.000Z",
          updated_at: "2026-06-15T08:54:47.656Z",
          category: "consult",
          status: "approved",
          subtype: "womens_health",
        },
      ],
      refundFailures: [],
    })

    expect(overview.openCount).toBe(1)
    expect(overview.categories.find((category) => category.id === "stale_scripts")?.count).toBe(1)
    expect(overview.recent[0]).toMatchObject({
      id: "intake-approved-script-missing",
      title: "Approved script missing",
      detail: "consult / womens_health / approved without script evidence",
      href: "/admin/intakes/intake-approved-script-missing",
    })
  })

  it("treats omitted incompleteRequests the same as an empty array", () => {
    const overview = buildOperationalFailureOverview({
      stripeDlq: [],
      emailFailures: [],
      checkoutFailures: [],
      // incompleteRequests omitted on purpose; the cockpit reshape lets callers skip it
      certificateFailures: [],
      prescriptionWebhookFailures: [],
      staleScriptIntakes: [],
      refundFailures: [],
    })

    const incompleteCategory = overview.categories.find(
      (category) => category.id === "incomplete_requests",
    )
    expect(incompleteCategory?.count).toBe(0)
    expect(overview.openCount).toBe(0)
    expect(overview.recent.some((item) => item.categoryId === "incomplete_requests")).toBe(false)
  })
})

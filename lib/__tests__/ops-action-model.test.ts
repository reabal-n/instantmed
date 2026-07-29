import { describe, expect, it } from "vitest"

import { buildOpsActionModel } from "@/lib/admin/ops-action-model"
import { buildOperationalFailureOverview } from "@/lib/admin/ops-failures"

const NOW = new Date("2026-07-29T00:00:00.000Z")

function failureOverview(overrides: Partial<Parameters<typeof buildOperationalFailureOverview>[0]> = {}) {
  return buildOperationalFailureOverview({
    certificateFailures: [],
    checkoutFailures: [],
    emailFailures: [],
    prescriptionWebhookFailures: [],
    refundFailures: [],
    staleScriptIntakes: [],
    stripeDlq: [],
    ...overrides,
  })
}

function input(overrides: Partial<Parameters<typeof buildOpsActionModel>[0]> = {}) {
  return {
    certificateDelivery: {
      actionCount: 0,
      cases: [],
      queryFailed: false,
      warningCount: 0,
    },
    failureOverview: failureOverview(),
    googleAdsConversionHealth: { notReaching: 0, queryFailed: false },
    identity: {
      blockedCount: 0,
      blockerCounts: {},
      items: [],
      queryFailed: false,
      readyCount: 0,
      totalActive: 0,
    },
    invariants: {
      approvedCertificateMissingRecord: 0,
      certificateSentMissingTimestamp: 0,
      certRefundOrphans: 0,
      paidButCancelled: 0,
      queryFailures: [],
      refundRecordAnomalies: 0,
      slaBreachBacklog: 0,
    },
    isAdmin: true,
    now: NOW,
    sourceQueryFailures: [],
    ...overrides,
  }
}

describe("operations action model", () => {
  it("collapses a healthy system to one all-clear state with no zero groups", () => {
    const model = buildOpsActionModel(input())

    expect(model.allClear).toBe(true)
    expect(model.openCount).toBe(0)
    expect(model.groups).toEqual([])
  })

  it("groups only unresolved work by operator domain", () => {
    const model = buildOpsActionModel(input({
      failureOverview: failureOverview({
        checkoutFailures: [{
          id: "checkout-1",
          created_at: "2026-07-28T20:00:00.000Z",
          checkout_error: "Payment failed",
        }],
        staleScriptIntakes: [{
          id: "rx-1",
          created_at: "2026-07-26T00:00:00.000Z",
          status: "awaiting_script",
        }],
      }),
      identity: {
        blockedCount: 2,
        blockerCounts: { Medicare: 2 },
        items: [{ createdAt: "2026-07-27T00:00:00.000Z", paidAt: null }] as never,
        queryFailed: false,
        readyCount: 0,
        totalActive: 2,
      },
    }))

    expect(model.groups.map(({ key }) => key)).toEqual([
      "payments",
      "fulfilment",
      "identity_access",
    ])
    expect(model.groups.flatMap(({ issues }) => issues).map(({ title }) => title)).toEqual(
      expect.arrayContaining(["Checkout", "Scripts waiting", "Prescribing identity blocked"]),
    )
    expect(model.groups.every(({ issues }) => issues.every(({ count }) => count > 0))).toBe(true)
  })

  it("does not show successful certificate history and keeps only real rescue actions", () => {
    const model = buildOpsActionModel(input({
      certificateDelivery: {
        actionCount: 1,
        queryFailed: false,
        warningCount: 0,
        cases: [
          {
            intakeId: "healthy",
            shortIntakeId: "healthy",
            referenceNumber: "IM-HEALTHY",
            recommendation: { action: "none", label: "Do nothing", reason: "Downloaded", severity: "neutral" },
            updatedAt: "2026-07-28T00:00:00.000Z",
          },
          {
            intakeId: "rescue",
            shortIntakeId: "rescue",
            referenceNumber: "IM-RESCUE",
            recommendation: { action: "resend_secure_link", label: "Resend secure link", reason: "Email bounced", severity: "critical" },
            updatedAt: "2026-07-28T01:00:00.000Z",
          },
        ] as never,
      },
    }))

    const issues = model.groups.flatMap(({ issues }) => issues)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      action: "resend_certificate",
      certificateIntakeId: "rescue",
      title: "IM-RESCUE · certificate delivery",
    })
    expect(JSON.stringify(model)).not.toContain("IM-HEALTHY")
  })

  it("never reports all clear when a source or invariant check failed", () => {
    const model = buildOpsActionModel(input({
      invariants: {
        approvedCertificateMissingRecord: 0,
        certificateSentMissingTimestamp: 0,
        certRefundOrphans: 0,
        paidButCancelled: 0,
        queryFailures: ["sla_breach_backlog"],
        refundRecordAnomalies: 0,
        slaBreachBacklog: 0,
      },
      sourceQueryFailures: ["checkout failures"],
    }))

    expect(model.allClear).toBe(false)
    expect(model.groups.map(({ key }) => key)).toEqual(["measurement"])
    expect(model.groups[0].issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: "Operational checks unavailable" }),
      expect.objectContaining({ title: "Operations data incomplete" }),
    ]))
  })

  it("uses support-safe links instead of admin-only request, email, and refund routes", () => {
    const model = buildOpsActionModel(input({
      isAdmin: false,
      failureOverview: failureOverview({
        emailFailures: [{ id: "email", created_at: "2026-07-28T00:00:00.000Z" }],
        refundFailures: [{ id: "refund", intake_id: "intake", created_at: "2026-07-28T00:00:00.000Z" }],
      }),
      certificateDelivery: {
        actionCount: 1,
        queryFailed: false,
        warningCount: 0,
        cases: [{
          intakeId: "intake-1",
          shortIntakeId: "intake-1",
          referenceNumber: "IM-ONE",
          recommendation: { action: "escalate", label: "Escalate", reason: "Missing certificate", severity: "critical" },
          updatedAt: "2026-07-28T00:00:00.000Z",
        }] as never,
      },
    }))

    const hrefs = model.groups.flatMap(({ issues }) => issues.map(({ href }) => href))
    expect(hrefs).not.toContain("/admin/intakes/intake-1")
    expect(hrefs).not.toContain("/admin/emails/hub?tab=queue")
    expect(hrefs).not.toContain("/admin/refunds?status=failed")
    expect(hrefs).toContain("/admin/intakes?q=IM-ONE")
  })
})

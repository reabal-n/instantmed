import { describe, expect, it } from "vitest"

import {
  buildPrescriptionFulfilmentDashboard,
  buildPrescriptionFulfilmentSlaAlerts,
  classifyPrescriptionFulfilment,
} from "@/lib/parchment/fulfilment-dashboard"

const now = new Date("2026-05-19T12:00:00.000Z").getTime()

function intake(overrides: Partial<Parameters<typeof buildPrescriptionFulfilmentDashboard>[0]["intakes"][number]>) {
  return {
    approved_at: "2026-05-19T08:00:00.000Z",
    category: "prescription",
    created_at: "2026-05-19T07:00:00.000Z",
    id: "intake-id",
    paid_at: "2026-05-19T07:30:00.000Z",
    parchment_reference: null,
    reference_number: "IM-TEST",
    script_sent: false,
    script_sent_at: null,
    status: "awaiting_script",
    subtype: "repeat",
    updated_at: "2026-05-19T08:00:00.000Z",
    ...overrides,
  }
}

describe("prescription fulfilment dashboard", () => {
  it("classifies a request by the furthest fulfilment evidence reached", () => {
    expect(
      classifyPrescriptionFulfilment(
        { parchment_reference: null, script_sent: false, script_sent_at: null },
        { parchmentOpenedAt: null, patientNotifiedAt: null, webhookReceivedAt: null },
      ),
    ).toBe("approved_not_prescribed")

    expect(
      classifyPrescriptionFulfilment(
        { parchment_reference: null, script_sent: false, script_sent_at: null },
        {
          parchmentOpenedAt: "2026-05-19T08:30:00.000Z",
          patientNotifiedAt: null,
          webhookReceivedAt: null,
        },
      ),
    ).toBe("parchment_opened")

    expect(
      classifyPrescriptionFulfilment(
        { parchment_reference: null, script_sent: false, script_sent_at: null },
        {
          parchmentOpenedAt: "2026-05-19T08:30:00.000Z",
          patientNotifiedAt: null,
          webhookReceivedAt: "2026-05-19T08:45:00.000Z",
        },
      ),
    ).toBe("webhook_received")

    expect(
      classifyPrescriptionFulfilment(
        { parchment_reference: null, script_sent: true, script_sent_at: "2026-05-19T08:45:00.000Z" },
        {
          parchmentOpenedAt: "2026-05-19T08:30:00.000Z",
          patientNotifiedAt: "2026-05-19T08:47:00.000Z",
          webhookReceivedAt: "2026-05-19T08:45:00.000Z",
        },
      ),
    ).toBe("patient_notified")
  })

  it("builds separate dashboard buckets for prescribing handoff states", () => {
    const dashboard = buildPrescriptionFulfilmentDashboard({
      auditEvents: [
        {
          created_at: "2026-05-19T08:45:00.000Z",
          intake_id: "webhook",
          metadata: { action_type: "parchment_webhook_script_sent" },
        },
        {
          created_at: "2026-05-19T08:46:00.000Z",
          intake_id: "notified",
          metadata: { action_type: "parchment_webhook_script_sent" },
        },
      ],
      complianceEvents: [
        {
          created_at: "2026-05-19T08:30:00.000Z",
          event_type: "no_prescribing_in_platform",
          intake_id: "opened",
        },
        {
          created_at: "2026-05-19T08:40:00.000Z",
          event_type: "no_prescribing_in_platform",
          intake_id: "webhook",
        },
      ],
      emails: [
        {
          created_at: "2026-05-19T08:47:00.000Z",
          delivery_status: null,
          intake_id: "notified",
          sent_at: "2026-05-19T08:47:00.000Z",
          status: "sent",
        },
        {
          created_at: "2026-05-19T08:50:00.000Z",
          delivery_status: "bounced",
          intake_id: "webhook",
          sent_at: null,
          status: "failed",
        },
        {
          created_at: "2026-05-19T08:55:00.000Z",
          delivery_status: null,
          intake_id: "manual",
          sent_at: null,
          status: "pending",
        },
      ],
      intakes: [
        intake({ id: "approved", reference_number: "IM-A" }),
        intake({ id: "opened", reference_number: "IM-B" }),
        intake({ id: "webhook", reference_number: "IM-C", script_sent: true }),
        intake({ id: "notified", reference_number: "IM-D", script_sent: true }),
        intake({
          id: "manual",
          parchment_reference: "external-ref",
          reference_number: "IM-E",
          script_sent: true,
          script_sent_at: "2026-05-19T08:52:00.000Z",
        }),
      ],
      now,
    })

    expect(dashboard.total).toBe(5)
    expect(dashboard.stages.map((stage) => [stage.key, stage.count])).toEqual([
      ["approved_not_prescribed", 1],
      ["parchment_opened", 1],
      ["webhook_received", 2],
      ["patient_notified", 1],
    ])
    expect(dashboard.notificationFailedCount).toBe(1)
    expect(dashboard.notificationPendingCount).toBe(1)
    expect(dashboard.webhookConfirmationCount).toBe(2)
    expect(dashboard.manualConfirmationCount).toBe(1)
    expect(dashboard.firstNotificationIssueIntakeId).toBe("webhook")
    expect(dashboard.firstNotificationIssueStatus).toBe("failed")

    const webhookStage = dashboard.stages.find((stage) => stage.key === "webhook_received")
    expect(webhookStage?.slaMinutes).toBe(10)
    expect(webhookStage?.slaBreachedCount).toBe(2)
    expect(webhookStage?.emailFailedCount).toBe(1)
    expect(webhookStage?.emailPendingCount).toBe(1)
    expect(webhookStage?.manualConfirmedCount).toBe(1)
  })

  it("uses human service labels for prescription consult subtypes", () => {
    const dashboard = buildPrescriptionFulfilmentDashboard({
      auditEvents: [],
      complianceEvents: [],
      emails: [],
      intakes: [
        intake({
          category: "consult",
          id: "ed-consult",
          reference_number: "IM-ED",
          subtype: "ed",
        }),
      ],
      now,
    })

    expect(dashboard.stages[0]?.items[0]?.serviceLabel).toBe("ED consult")
  })

  it("includes approved prescribing consults that are missing script evidence", () => {
    const dashboard = buildPrescriptionFulfilmentDashboard({
      auditEvents: [],
      complianceEvents: [],
      emails: [],
      intakes: [
        intake({
          category: "consult",
          id: "womens-health-approved",
          reference_number: "IM-WH",
          status: "approved",
          subtype: "womens_health",
        }),
        intake({
          category: "consult",
          id: "general-consult-approved",
          reference_number: "IM-GC",
          status: "approved",
          subtype: null,
        }),
      ],
      now,
    })

    expect(dashboard.total).toBe(1)
    expect(dashboard.stages[0]?.items[0]).toMatchObject({
      id: "womens-health-approved",
      serviceLabel: "Women's health consult",
      stage: "approved_not_prescribed",
    })
  })

  it("keeps every paid prescribing service visible until script and notification evidence exist", () => {
    const prescribingCases = [
      intake({
        category: "prescription",
        id: "repeat-rx-approved",
        status: "approved",
        subtype: "repeat",
      }),
      intake({
        category: "consult",
        id: "ed-approved",
        status: "approved",
        subtype: "ed",
      }),
      intake({
        category: "consult",
        id: "hair-loss-approved",
        status: "approved",
        subtype: "hair_loss",
      }),
      intake({
        category: "consult",
        id: "womens-health-approved",
        status: "approved",
        subtype: "womens_health",
      }),
    ]

    for (const prescribingCase of prescribingCases) {
      const dashboard = buildPrescriptionFulfilmentDashboard({
        auditEvents: [],
        complianceEvents: [],
        emails: [],
        intakes: [prescribingCase],
        now,
      })

      expect(dashboard.total).toBe(1)
      expect(
        dashboard.stages.find((stage) => stage.key === "approved_not_prescribed"),
      ).toMatchObject({
        count: 1,
        slaBreachedCount: 1,
      })
    }

    const scriptRecordedButUnnotified = buildPrescriptionFulfilmentDashboard({
      auditEvents: [],
      complianceEvents: [],
      emails: [],
      intakes: [
        intake({
          category: "consult",
          id: "script-recorded-but-unnotified",
          parchment_reference: "external-ref",
          script_sent: true,
          script_sent_at: "2026-05-19T08:45:00.000Z",
          status: "completed",
          subtype: "ed",
        }),
      ],
      now,
    })

    expect(
      scriptRecordedButUnnotified.stages.find((stage) => stage.key === "webhook_received"),
    ).toMatchObject({
      count: 1,
      slaBreachedCount: 1,
    })
  })

  it("turns every breached prescribing stage SLA into a critical aggregate alert", () => {
    const dashboard = buildPrescriptionFulfilmentDashboard({
      auditEvents: [
        {
          created_at: "2026-05-19T11:40:00.000Z",
          intake_id: "webhook",
          metadata: { action_type: "parchment_webhook_script_sent" },
        },
      ],
      complianceEvents: [
        {
          created_at: "2026-05-19T11:20:00.000Z",
          event_type: "no_prescribing_in_platform",
          intake_id: "opened",
        },
      ],
      emails: [],
      intakes: [
        intake({ id: "approved", reference_number: "IM-PRIVATE-A" }),
        intake({ id: "opened", reference_number: "IM-PRIVATE-B" }),
        intake({ id: "webhook", reference_number: "IM-PRIVATE-C", script_sent: true }),
      ],
      now,
    })

    const alerts = buildPrescriptionFulfilmentSlaAlerts(dashboard)

    expect(alerts.map((alert) => ({
      count: alert.count,
      metric: alert.metric,
      severity: alert.severity,
      stage: alert.metadata.stage,
    }))).toEqual([
      {
        count: 1,
        metric: "prescription_fulfilment_approved_not_prescribed_sla_breach",
        severity: "critical",
        stage: "approved_not_prescribed",
      },
      {
        count: 1,
        metric: "prescription_fulfilment_parchment_opened_sla_breach",
        severity: "critical",
        stage: "parchment_opened",
      },
      {
        count: 1,
        metric: "prescription_fulfilment_webhook_received_sla_breach",
        severity: "critical",
        stage: "webhook_received",
      },
    ])
    expect(alerts.map((alert) => alert.metadata.sla_minutes)).toEqual([120, 30, 10])
    expect(JSON.stringify(alerts)).not.toContain("IM-PRIVATE")
  })

  it("does not alert for prescribing stages that remain inside their SLA", () => {
    const dashboard = buildPrescriptionFulfilmentDashboard({
      auditEvents: [],
      complianceEvents: [],
      emails: [],
      intakes: [
        intake({
          approved_at: "2026-05-19T11:00:00.000Z",
          id: "inside-sla",
          updated_at: "2026-05-19T11:00:00.000Z",
        }),
      ],
      now,
    })

    expect(buildPrescriptionFulfilmentSlaAlerts(dashboard)).toEqual([])
  })
})

import { describe, expect, it } from "vitest"

import { buildEmailAnalytics } from "@/lib/email/analytics"

describe("email analytics", () => {
  it("uses Resend delivery events instead of treating send success as delivery", () => {
    const analytics = buildEmailAnalytics([
      {
        id: "1",
        email_type: "request_received",
        to_email: "patient@example.com",
        status: "sent",
        sent_at: "2026-04-30T00:00:00.000Z",
        error_message: null,
        delivery_status: "delivered",
        delivery_status_updated_at: "2026-04-30T00:01:00.000Z",
      },
      {
        id: "2",
        email_type: "request_received",
        to_email: "opened@example.com",
        status: "sent",
        sent_at: "2026-04-30T00:02:00.000Z",
        error_message: null,
        delivery_status: "opened",
        delivery_status_updated_at: "2026-04-30T00:03:00.000Z",
      },
      {
        id: "3",
        email_type: "request_received",
        to_email: "clicked@example.com",
        status: "sent",
        sent_at: "2026-04-30T00:04:00.000Z",
        error_message: null,
        delivery_status: "clicked",
        delivery_status_updated_at: "2026-04-30T00:05:00.000Z",
      },
      {
        id: "4",
        email_type: "payment_confirmed",
        to_email: "bounce@example.com",
        status: "sent",
        sent_at: "2026-04-30T00:06:00.000Z",
        error_message: null,
        delivery_status: "bounced",
        delivery_status_updated_at: "2026-04-30T00:07:00.000Z",
      },
      {
        id: "5",
        email_type: "payment_confirmed",
        to_email: "failed@example.com",
        status: "failed",
        sent_at: "2026-04-30T00:08:00.000Z",
        error_message: "SMTP rejected",
        delivery_status: null,
        delivery_status_updated_at: null,
      },
    ])

    expect(analytics.summary).toMatchObject({
      totalAccepted: 4,
      totalFailed: 1,
      delivered: 3,
      bounced: 1,
      complained: 0,
      sendSuccessRate: 80,
      deliveryRate: 75,
      openRate: 66.7,
      clickRate: 33.3,
    })
    expect(analytics.templateStats.find((t) => t.template === "request_received")).toMatchObject({
      accepted: 3,
      delivered: 3,
      opened: 2,
      clicked: 1,
      failed: 0,
    })
  })
})

import { describe, expect, it } from "vitest"

import {
  buildIntakeFunnelSummary,
  INTAKE_FUNNEL_EVENT_NAMES,
} from "@/lib/analytics/intake-funnel-summary"

describe("intake funnel summary", () => {
  it("summarizes start, checkout, and paid conversion from aggregate events", () => {
    const summary = buildIntakeFunnelSummary({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-15T00:00:00.000Z",
      days: 14,
      rows: [
        { event: "intake_started", count: 100 },
        { event: "checkout_viewed", count: 42 },
        { event: "intake_funnel_payment_initiated", count: 35 },
        { event: "purchase_completed_server", count: 30 },
      ],
    })

    expect(summary.events).toEqual(INTAKE_FUNNEL_EVENT_NAMES)
    expect(summary.totals).toEqual({
      // client denominator (checkout_viewed) understates: 30/42 = 71%
      checkoutToPaidRate: 71,
      checkoutViewed: 42,
      paid: 30,
      paymentInitiated: 35,
      // server denominator (payment_initiated) is the trustworthy one: 30/35 = 86%
      serverCheckoutToPaidRate: 86,
      startToCheckoutDropOff: 58,
      startToCheckoutRate: 42,
      started: 100,
    })
    // The trustworthy server rate is higher than the leaky client rate — the
    // whole point of the fix (Codex review 2026-06-27).
    expect(summary.totals.serverCheckoutToPaidRate).toBeGreaterThan(
      summary.totals.checkoutToPaidRate as number,
    )
    expect(summary.stages.map((stage) => stage.count)).toEqual([100, 42, 35, 30])
    expect(summary.stages.map((stage) => stage.rateFromPrevious)).toEqual([null, 42, 83, 86])
    expect(summary.stages.map((stage) => stage.key)).toEqual([
      "started",
      "checkoutViewed",
      "paymentInitiated",
      "paid",
    ])
  })

  it("uses purchase_completed_server as the only paid-stage purchase event", () => {
    const summary = buildIntakeFunnelSummary({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-15T00:00:00.000Z",
      days: 14,
      rows: [
        { event: "intake_started", count: 10 },
        { event: "checkout_viewed", count: 8 },
        { event: "purchase_completed", count: 7 },
        { event: "purchase_completed_server", count: 5 },
      ],
    })

    expect(INTAKE_FUNNEL_EVENT_NAMES).toContain("purchase_completed_server")
    expect(INTAKE_FUNNEL_EVENT_NAMES).not.toContain("purchase_completed")
    expect(summary.totals.paid).toBe(5)
    expect(summary.stages.find((stage) => stage.key === "paid")).toMatchObject({
      count: 5,
      event: "purchase_completed_server",
    })
  })

  it("builds sorted step friction rows without patient-entered values", () => {
    const summary = buildIntakeFunnelSummary({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-15T00:00:00.000Z",
      days: 14,
      rows: [
        { event: "intake_started", count: 100 },
        { event: "checkout_viewed", count: 42 },
        { event: "purchase_completed_server", count: 30 },
        {
          count: 80,
          event: "step_viewed",
          serviceType: "med-cert",
          stepId: "symptoms",
          stepIndex: 1,
        },
        {
          count: 52,
          event: "intake_continue_clicked",
          serviceType: "med-cert",
          stepId: "symptoms",
          stepIndex: 1,
        },
        {
          count: 20,
          event: "intake_validation_blocked",
          serviceType: "med-cert",
          stepId: "symptoms",
          stepIndex: 1,
        },
        {
          count: 45,
          event: "step_completed",
          serviceType: "med-cert",
          stepId: "symptoms",
          stepIndex: 1,
        },
        {
          count: 24,
          event: "step_viewed",
          serviceType: "consult",
          subtype: "ed",
          stepId: "ed-health",
          stepIndex: 3,
        },
        {
          count: 18,
          event: "intake_continue_clicked",
          serviceType: "consult",
          subtype: "ed",
          stepId: "ed-health",
          stepIndex: 3,
        },
        {
          count: 12,
          event: "intake_validation_blocked",
          serviceType: "consult",
          subtype: "ed",
          stepId: "ed-health",
          stepIndex: 3,
        },
        {
          count: 16,
          event: "step_completed",
          serviceType: "consult",
          subtype: "ed",
          stepId: "ed-health",
          stepIndex: 3,
        },
      ],
    })

    expect(summary.stepFriction).toEqual([
      {
        blocked: 20,
        blockedPerContinueRate: 38,
        completed: 45,
        completionRate: 56,
        continueClicked: 52,
        dropOffCount: 35,
        frictionScore: 55,
        retryOccurrences: 0,
        serviceLabel: "Medical certificate",
        serviceType: "med-cert",
        stepId: "symptoms",
        stepIndex: 1,
        subtype: null,
        viewed: 80,
      },
      {
        blocked: 12,
        blockedPerContinueRate: 67,
        completed: 16,
        completionRate: 67,
        continueClicked: 18,
        dropOffCount: 8,
        frictionScore: 20,
        retryOccurrences: 0,
        serviceLabel: "ED",
        serviceType: "consult",
        stepId: "ed-health",
        stepIndex: 3,
        subtype: "ed",
        viewed: 24,
      },
    ])
  })

  it("uses unique attempts for friction and reports repeated interactions separately", () => {
    const summary = buildIntakeFunnelSummary({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-15T00:00:00.000Z",
      days: 14,
      rows: [
        {
          count: 5,
          occurrences: 8,
          event: "step_viewed",
          serviceType: "consult",
          subtype: "ed",
          stepId: "ed-health",
          stepIndex: 3,
        },
        {
          count: 4,
          occurrences: 10,
          event: "intake_continue_clicked",
          serviceType: "consult",
          subtype: "ed",
          stepId: "ed-health",
          stepIndex: 3,
        },
        {
          count: 2,
          occurrences: 7,
          event: "intake_validation_blocked",
          serviceType: "consult",
          subtype: "ed",
          stepId: "ed-health",
          stepIndex: 3,
        },
        {
          count: 3,
          occurrences: 3,
          event: "step_completed",
          serviceType: "consult",
          subtype: "ed",
          stepId: "ed-health",
          stepIndex: 3,
        },
      ],
    })

    expect(summary.stepFriction[0]).toMatchObject({
      blocked: 2,
      completed: 3,
      continueClicked: 4,
      dropOffCount: 2,
      frictionScore: 4,
      retryOccurrences: 14,
      viewed: 5,
    })
  })

  it("keeps service slices separate when one parent service has multiple subtypes", () => {
    const summary = buildIntakeFunnelSummary({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-15T00:00:00.000Z",
      days: 14,
      rows: [
        { event: "intake_started", serviceType: "consult", subtype: "ed", count: 12 },
        { event: "checkout_viewed", serviceType: "consult", subtype: "ed", count: 6 },
        { event: "intake_funnel_payment_initiated", serviceType: "consult", subtype: "ed", count: 5 },
        { event: "purchase_completed_server", serviceType: "consult", subtype: "ed", count: 4 },
        { event: "intake_started", serviceType: "consult", subtype: "hair_loss", count: 10 },
        { event: "checkout_viewed", serviceType: "consult", subtype: "hair_loss", count: 8 },
        { event: "intake_funnel_payment_initiated", serviceType: "consult", subtype: "hair_loss", count: 6 },
        { event: "purchase_completed_server", serviceType: "consult", subtype: "hair_loss", count: 5 },
      ],
    })

    expect(summary.byService).toEqual([
      {
        checkoutToPaidRate: 67,
        checkoutViewed: 6,
        paid: 4,
        paymentInitiated: 5,
        serverCheckoutToPaidRate: 80,
        serviceLabel: "ED",
        serviceType: "consult",
        startToCheckoutRate: 50,
        started: 12,
        subtype: "ed",
      },
      {
        checkoutToPaidRate: 63,
        checkoutViewed: 8,
        paid: 5,
        paymentInitiated: 6,
        serverCheckoutToPaidRate: 83,
        serviceLabel: "Hair loss",
        serviceType: "consult",
        startToCheckoutRate: 80,
        started: 10,
        subtype: "hair_loss",
      },
    ])
  })

  it("counts per-service paid + checkoutToPaidRate when paid rows carry coalesced service metadata", () => {
    // The HogQL coalesce in lib/analytics/posthog-intake-funnel.ts normalizes the
    // webhook's service_category/service_subtype into the client token vocabulary
    // (medical_certificate -> med-cert; consult subtypes pass through; slug noise
    // -> null). After that, paid rows arrive at the summary keyed the same way as
    // the client step events, so the per-service "paid" column is non-zero rather
    // than structurally 0.
    const summary = buildIntakeFunnelSummary({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-15T00:00:00.000Z",
      days: 14,
      rows: [
        // Med cert: paid row keyed as the coalesce now emits it (med-cert, null subtype)
        { event: "intake_started", serviceType: "med-cert", count: 40 },
        { event: "checkout_viewed", serviceType: "med-cert", count: 24 },
        { event: "purchase_completed_server", serviceType: "med-cert", count: 18 },
        // ED consult: subtype carried through from service_subtype
        { event: "intake_started", serviceType: "consult", subtype: "ed", count: 12 },
        { event: "checkout_viewed", serviceType: "consult", subtype: "ed", count: 8 },
        { event: "purchase_completed_server", serviceType: "consult", subtype: "ed", count: 6 },
      ],
    })

    const medCert = summary.byService.find(
      (svc) => svc.serviceType === "med-cert" && svc.subtype === null,
    )
    const ed = summary.byService.find(
      (svc) => svc.serviceType === "consult" && svc.subtype === "ed",
    )

    expect(medCert).toMatchObject({ paid: 18, checkoutViewed: 24, checkoutToPaidRate: 75 })
    expect(ed).toMatchObject({ paid: 6, checkoutViewed: 8, checkoutToPaidRate: 75 })
    expect(medCert?.paid).toBeGreaterThan(0)
    expect(ed?.paid).toBeGreaterThan(0)
  })

  it("does not create a service row from paid events that lack service metadata", () => {
    const summary = buildIntakeFunnelSummary({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-15T00:00:00.000Z",
      days: 14,
      rows: [
        { event: "intake_started", serviceType: "med-cert", count: 10 },
        { event: "checkout_viewed", serviceType: "med-cert", count: 7 },
        { event: "purchase_completed_server", count: 5 },
      ],
    })

    expect(summary.totals.paid).toBe(5)
    expect(summary.byService).toEqual([
      {
        checkoutToPaidRate: null,
        checkoutViewed: 7,
        paid: 0,
        paymentInitiated: 0,
        serverCheckoutToPaidRate: null,
        serviceLabel: "Medical certificate",
        serviceType: "med-cert",
        startToCheckoutRate: 70,
        started: 10,
        subtype: null,
      },
    ])
  })

  it("buckets the server payment_initiated category (medical_certificate) into the med-cert client bucket", () => {
    // payment_initiated carries the Stripe category ("medical_certificate"); the
    // client step/checkout events carry "med-cert". normalizeServiceType must fold
    // them into one bucket so the server payment_initiated→paid rate is per-service.
    const summary = buildIntakeFunnelSummary({
      dateFrom: "2026-06-01T00:00:00.000Z",
      dateTo: "2026-06-15T00:00:00.000Z",
      days: 14,
      rows: [
        { event: "intake_started", serviceType: "med-cert", count: 40 },
        { event: "checkout_viewed", serviceType: "med-cert", count: 24 },
        { event: "intake_funnel_payment_initiated", serviceType: "medical_certificate", count: 20 },
        { event: "purchase_completed_server", serviceType: "med-cert", count: 18 },
      ],
    })

    const medCert = summary.byService.find((svc) => svc.serviceType === "med-cert")
    // All four events landed in ONE bucket (no stray "medical_certificate" row).
    expect(summary.byService).toHaveLength(1)
    expect(medCert).toMatchObject({
      checkoutViewed: 24,
      paid: 18,
      paymentInitiated: 20,
      serverCheckoutToPaidRate: 90, // 18/20 server-side (trustworthy)
      checkoutToPaidRate: 75, // 18/24 client-side (understated)
    })
  })
})

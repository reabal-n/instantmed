import type Stripe from "stripe"
import { describe, expect, it } from "vitest"

import {
  buildStripeRefundBackfillEvidence,
  buildStripeRefundEventEvidence,
} from "@/lib/stripe/refund-event-ledger"

function balanceTransaction(overrides: Partial<Stripe.BalanceTransaction> = {}): Stripe.BalanceTransaction {
  return {
    amount: -995,
    available_on: Math.floor(Date.parse("2026-05-20T07:01:00.000Z") / 1000),
    balance_type: "payments",
    created: Math.floor(Date.parse("2026-05-20T07:01:00.000Z") / 1000),
    currency: "aud",
    description: null,
    exchange_rate: null,
    fee: 0,
    fee_details: [],
    id: "txn_refund",
    net: -995,
    object: "balance_transaction",
    reporting_category: "refund",
    source: "re_refund",
    status: "available",
    type: "refund",
    ...overrides,
  }
}

function refund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    amount: 995,
    balance_transaction: balanceTransaction(),
    charge: "ch_refund",
    created: Math.floor(Date.parse("2026-05-20T06:58:52.000Z") / 1000),
    currency: "aud",
    id: "re_refund",
    metadata: {},
    object: "refund",
    payment_intent: "pi_refund",
    reason: "requested_by_customer",
    receipt_number: null,
    source_transfer_reversal: null,
    status: "succeeded",
    transfer_reversal: null,
    ...overrides,
  }
}

function event(type: Stripe.Event.Type, object: Stripe.Event.Data.Object): Stripe.Event {
  return {
    created: Math.floor(Date.parse("2026-05-20T07:00:00.000Z") / 1000),
    data: { object },
    id: `evt_${type.replaceAll(".", "_")}`,
    livemode: true,
    object: "event",
    pending_webhooks: 1,
    request: null,
    type,
  } as Stripe.Event
}

describe("Stripe refund event ledger", () => {
  it("accepts Stripe v22 local-payment refund debits", () => {
    const localPaymentRefund = refund({
      balance_transaction: balanceTransaction({
        id: "txn_payment_refund",
        type: "payment_refund",
      }),
    })

    expect(buildStripeRefundBackfillEvidence({
      intakeId: "intake-payment-method",
      livemode: true,
      refund: localPaymentRefund,
    })).toMatchObject({
      balance_transaction_id: "txn_payment_refund",
      refund_cash_at: "2026-05-20T07:01:00.000Z",
    })
  })

  it.each(["payment_refund", "adjustment"] as const)(
    "accepts Stripe v22 %s refund reversals with exact amount and linkage",
    (type) => {
      const failedRefund = refund({
        failure_balance_transaction: balanceTransaction({
          amount: 995,
          created: Math.floor(Date.parse("2026-05-22T03:04:05.000Z") / 1000),
          id: `txn_${type}_reversal`,
          net: 995,
          type,
        }),
        status: "failed",
      })

      expect(buildStripeRefundBackfillEvidence({
        intakeId: "intake-failed",
        livemode: true,
        refund: failedRefund,
      })).toMatchObject({
        failure_balance_transaction_id: `txn_${type}_reversal`,
        refund_reversed_at: "2026-05-22T03:04:05.000Z",
      })
    },
  )

  it("uses a new append-only backfill key when the same refund later reverses", () => {
    const succeeded = refund()
    const failed = refund({
      failure_balance_transaction: balanceTransaction({
        amount: 995,
        created: Math.floor(Date.parse("2026-05-22T03:04:05.000Z") / 1000),
        id: "txn_refund_failure",
        net: 995,
        type: "refund_failure",
      }),
      status: "failed",
    })
    const first = buildStripeRefundBackfillEvidence({
      intakeId: "intake-refund",
      livemode: true,
      refund: succeeded,
    })
    const later = buildStripeRefundBackfillEvidence({
      intakeId: "intake-refund",
      livemode: true,
      refund: failed,
    })

    expect(first?.evidence_key).not.toBe(later?.evidence_key)
    expect(later?.evidence_key).toContain("txn_refund_failure:failed")
  })

  it("splits a cumulative charge.refunded snapshot into exact per-refund observations", () => {
    const first = refund({
      id: "re_first",
      amount: 995,
      balance_transaction: balanceTransaction({ source: "re_first" }),
    })
    const second = refund({
      id: "re_topup",
      amount: 4000,
      balance_transaction: balanceTransaction({
        amount: -4000,
        net: -4000,
        source: "re_topup",
      }),
      created: Math.floor(Date.parse("2026-05-20T08:06:26.000Z") / 1000),
    })
    const charge = {
      amount: 4995,
      amount_refunded: 4995,
      id: "ch_refund",
      object: "charge",
      payment_intent: "pi_refund",
      refunds: { data: [first, second] },
    } as unknown as Stripe.Charge

    expect(buildStripeRefundEventEvidence({
      event: event("charge.refunded", charge),
      intakeId: "intake-1",
      refunds: [first, second],
    })).toEqual([
      expect.objectContaining({
        amount_cents: 995,
        evidence_key: "live:event:evt_charge_refunded:refund:re_first",
        intake_id: "intake-1",
        refund_cash_at: "2026-05-20T07:01:00.000Z",
        refund_created_at: "2026-05-20T06:58:52.000Z",
        stripe_event_id: "evt_charge_refunded",
        stripe_refund_id: "re_first",
      }),
      expect.objectContaining({
        amount_cents: 4000,
        evidence_key: "live:event:evt_charge_refunded:refund:re_topup",
        refund_created_at: "2026-05-20T08:06:26.000Z",
        stripe_refund_id: "re_topup",
      }),
    ])
  })

  it("records refund.updated as an observation without replacing prior evidence", () => {
    expect(buildStripeRefundEventEvidence({
      event: event("refund.updated", refund({ status: "succeeded" })),
      intakeId: null,
    })).toEqual([
      expect.objectContaining({
        evidence_key: "live:event:evt_refund_updated:refund:re_refund",
        evidence_source: "refund.updated",
        refund_status: "succeeded",
        stripe_event_id: "evt_refund_updated",
      }),
    ])
  })

  it("uses exact Refund-list identity and object time for a backfill row", () => {
    expect(buildStripeRefundBackfillEvidence({
      intakeId: "intake-1",
      livemode: true,
      refund: refund(),
    })).toEqual(expect.objectContaining({
      amount_cents: 995,
      evidence_key: "live:refund:re_refund:observation:txn_refund:none:succeeded",
      evidence_source: "refund.list.backfill",
      refund_cash_at: "2026-05-20T07:01:00.000Z",
      refund_created_at: "2026-05-20T06:58:52.000Z",
      stripe_event_id: null,
      stripe_refund_id: "re_refund",
    }))
  })

  it("waits for a durable balance movement when a pending refund later succeeds", () => {
    const pending = refund({ balance_transaction: null, status: "pending" })
    const succeeded = refund({
      balance_transaction: balanceTransaction({
        created: Math.floor(Date.parse("2026-05-22T03:04:05.000Z") / 1000),
      }),
      status: "succeeded",
    })

    expect(buildStripeRefundEventEvidence({
      event: event("refund.created", pending),
      intakeId: "intake-1",
    })[0]).toMatchObject({
      refund_cash_at: null,
      refund_created_at: "2026-05-20T06:58:52.000Z",
      refund_status: "pending",
    })
    expect(buildStripeRefundEventEvidence({
      event: {
        ...event("refund.updated", succeeded),
        created: Math.floor(Date.parse("2026-05-22T03:04:06.000Z") / 1000),
      } as Stripe.Event,
      intakeId: "intake-1",
    })[0]).toMatchObject({
      refund_cash_at: "2026-05-22T03:04:05.000Z",
      refund_created_at: "2026-05-20T06:58:52.000Z",
      refund_status: "succeeded",
      stripe_event_created_at: "2026-05-22T03:04:06.000Z",
    })
  })

  it("records the balance reversal time when Stripe returns a failed refund", () => {
    const failed = refund({
      failure_balance_transaction: balanceTransaction({
        amount: 995,
        created: Math.floor(Date.parse("2026-05-25T04:05:06.000Z") / 1000),
        id: "txn_refund_failure",
        net: 995,
        type: "refund_failure",
      }),
      status: "failed",
    })

    expect(buildStripeRefundEventEvidence({
      event: event("refund.failed", failed),
      intakeId: "intake-1",
    })[0]).toMatchObject({
      failure_balance_transaction_id: "txn_refund_failure",
      refund_cash_at: "2026-05-20T07:01:00.000Z",
      refund_reversed_at: "2026-05-25T04:05:06.000Z",
      refund_status: "failed",
    })
  })

  it("treats a cancelled refund.updated observation as an exact cash reversal", () => {
    const cancelled = refund({
      failure_balance_transaction: balanceTransaction({
        amount: 995,
        created: Math.floor(Date.parse("2026-05-26T05:06:07.000Z") / 1000),
        id: "txn_refund_cancelled",
        net: 995,
        type: "refund_failure",
      }),
      status: "canceled",
    })

    expect(buildStripeRefundEventEvidence({
      event: event("refund.updated", cancelled),
      intakeId: "intake-1",
    })[0]).toMatchObject({
      evidence_source: "refund.updated",
      refund_cash_at: "2026-05-20T07:01:00.000Z",
      refund_reversed_at: "2026-05-26T05:06:07.000Z",
      refund_status: "canceled",
    })
  })

  it("records a pre-movement cancellation without inventing a debit or reversal", () => {
    expect(buildStripeRefundEventEvidence({
      event: event("refund.updated", refund({
        balance_transaction: null,
        status: "canceled",
      })),
      intakeId: "intake-1",
    })[0]).toMatchObject({
      refund_cash_at: null,
      refund_reversed_at: null,
      refund_status: "canceled",
    })
  })
})

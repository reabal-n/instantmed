import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }))
vi.mock("next/dynamic", () => ({ default: () => () => null }))
vi.mock("@/components/panels/panel-provider", () => ({ usePanel: () => ({ openPanel: vi.fn() }) }))
vi.mock("@/app/admin/intakes/close-failed-checkout-action", () => ({ closeFailedCheckoutAction: vi.fn() }))
vi.mock("@/app/admin/intakes/payment-rescue-action", () => ({ buildPaymentRescueAction: vi.fn() }))
vi.mock("@/app/admin/intakes/search-actions", () => ({ searchAdminLedgerAction: vi.fn() }))
vi.mock("@/app/doctor/queue/actions", () => ({ issueRefundAction: vi.fn() }))

import { AdminIntakesLedgerClient } from "@/app/admin/intakes/intakes-ledger-client"
import type { IntakeWithPatient } from "@/types/db"

const record = { id: "synthetic-task2", reference_number: "IM-TASK2", status: "approved", payment_status: "paid", created_at: "2026-09-14T00:00:00Z", patient: { full_name: "Synthetic Example" }, service: { category: "med_certs" } } as IntakeWithPatient
const render = (props: Partial<React.ComponentProps<typeof AdminIntakesLedgerClient>> = {}) => renderToStaticMarkup(<AdminIntakesLedgerClient rows={[]} total={0} page={1} pageSize={50} viewerRole="admin" {...props} />)

describe("Requests presentation", () => {
  it("distinguishes empty results from failed reads", () => {
    expect(render({ initialFilters: { status: "approved" } })).toContain("No matching requests")
    const failed = render({ degraded: true, total: null })
    expect(failed).toContain("Some ledger evidence could not be read")
    expect(failed).toContain("total unavailable")
    expect(failed).toContain('role="status"')
  })

  it("preserves server pagination when a stale page has no rows", () => {
    const html = render({ total: 12, page: 3, pageSize: 10 })
    expect(html).toContain("12 requests")
    expect(html).toContain("Page 3")
    expect(html).toContain("Previous")
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Next /)
  })

  it("reflects a changed record rather than retaining its prior status", () => {
    expect(render({ rows: [record], total: 1 })).toContain('data-status="approved"')
    const changed = render({ rows: [{ ...record, status: "declined", payment_status: "refunded" }], total: 1 })
    expect(changed).toContain('data-status="declined"')
    expect(changed).not.toContain('aria-label="Actions for request IM-TASK2"')
  })
})

import { NextResponse } from "next/server"

import { getApiAuth } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(_request: Request) {
  try {
    const authResult = await getApiAuth()

    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    const mapStatus = (status: string | null | undefined): "paid" | "pending" | "failed" => {
      if (status === "paid" || status === "succeeded") return "paid"
      if (status === "failed" || status === "cancelled") return "failed"
      return "pending"
    }

    // Prefer the invoices table when present, but sandbox/staging databases may
    // not have it yet. The payments table is the canonical fallback.
    const invoiceResult = await supabase
      .from("invoices")
      .select("id, customer_id, number, status, amount_cents, description, currency, stripe_invoice_id, created_at, updated_at")
      .eq("customer_id", authResult.profile.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (!invoiceResult.error) {
      return NextResponse.json({
        invoices: (invoiceResult.data || []).map((invoice) => ({
          id: invoice.id,
          number: invoice.number || invoice.stripe_invoice_id || invoice.id,
          created_at: invoice.created_at,
          total: invoice.amount_cents || 0,
          status: mapStatus(invoice.status),
          description: invoice.description || undefined,
          payment_method: invoice.currency?.toUpperCase(),
        })),
      })
    }

    if (invoiceResult.error.code !== "PGRST205") {
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
    }

    const { data: intakes, error: intakeError } = await supabase
      .from("intakes")
      .select("id, reference_number, category, subtype, service:services!service_id(name, short_name)")
      .eq("patient_id", authResult.profile.id)

    if (intakeError) {
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
    }

    const intakeIds = (intakes || []).map((intake) => intake.id)
    if (intakeIds.length === 0) {
      return NextResponse.json({ invoices: [] })
    }

    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("id, amount, amount_paid, currency, status, stripe_payment_intent_id, stripe_session_id, intake_id, created_at, updated_at")
      .in("intake_id", intakeIds)
      .order("created_at", { ascending: false })
      .limit(100)

    if (paymentsError) {
      return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
    }

    const intakeById = new Map((intakes || []).map((intake) => [intake.id, intake]))

    return NextResponse.json({
      invoices: (payments || []).map((payment) => {
        const intake = intakeById.get(payment.intake_id)
        const service = Array.isArray(intake?.service) ? intake?.service[0] : intake?.service
        const serviceName = service?.short_name || service?.name || intake?.category || "InstantMed request"

        return {
          id: payment.id,
          number: intake?.reference_number || payment.stripe_payment_intent_id || payment.id,
          created_at: payment.created_at,
          total: payment.amount_paid || payment.amount || 0,
          status: mapStatus(payment.status),
          description: serviceName,
          payment_method: payment.currency?.toUpperCase(),
        }
      }),
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}

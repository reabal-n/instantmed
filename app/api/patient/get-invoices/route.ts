import { getApiAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

export async function GET(_request: Request) {
  try {
    const authResult = await getApiAuth()

    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()

    // Get invoices for this patient
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("id, customer_id, number, status, amount_cents, description, currency, stripe_invoice_id, created_at, updated_at")
      .eq("customer_id", authResult.profile.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      invoices: invoices || [],
    })
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}

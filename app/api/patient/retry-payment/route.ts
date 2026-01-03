import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

interface RetryPaymentRequest {
  invoiceId: string
}

export async function POST(request: Request) {
  try {
    // TODO: Implement CSRF protection with proper token endpoint
    // Currently disabled until client-side token support is added

    const authUser = await getAuthenticatedUserWithProfile()

    if (!authUser || authUser.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: RetryPaymentRequest = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("customer_id", authUser.profile.id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Only allow retry for failed invoices
    if (invoice.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed invoices can be retried" },
        { status: 400 }
      )
    }

    // Update invoice status back to pending
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "pending",
        retry_count: (invoice.retry_count || 0) + 1,
        last_retry_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update invoice" },
        { status: 500 }
      )
    }

    // Send email notification
    // TODO: Implement email notification for retry

    return NextResponse.json(
      {
        success: true,
        message: "Payment retry initiated. Please check your email for next steps.",
        paymentUrl: `/checkout?invoiceId=${invoiceId}`,
      },
      { status: 200 }
    )
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to retry payment" },
      { status: 500 }
    )
  }
}

import * as Sentry from "@sentry/nextjs"
import { getApiAuth } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextRequest, NextResponse } from "next/server"
import { sendViaResend } from "@/lib/email/resend"
import { renderPaymentRetryEmailToHtml } from "@/lib/email/templates/payment-retry"
import { env } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

const logger = createLogger("api-retry-payment")

interface RetryPaymentRequest {
  invoiceId: string
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: sensitive (20 req/hour) — prevents payment retry email spam
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    const authResult = await getApiAuth()

    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const body: RetryPaymentRequest = await request.json()
    const { invoiceId } = body

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, status, retry_count, last_retry_at, description, amount_cents")
      .eq("id", invoiceId)
      .eq("customer_id", authResult.profile.id)
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

    // Send email notification for payment retry
    const paymentUrl = `${env.appUrl}/checkout?invoiceId=${invoiceId}`
    const patientEmail = authResult.profile.email
    
    if (patientEmail) {
      const emailHtml = renderPaymentRetryEmailToHtml({
        patientName: authResult.profile.full_name || "there",
        requestType: invoice.description || "service",
        amount: `$${((invoice.amount_cents || 0) / 100).toFixed(2)}`,
        paymentUrl,
      })

      await sendViaResend({
        to: patientEmail,
        subject: "Complete your InstantMed payment",
        html: emailHtml,
        tags: [
          { name: "category", value: "payment_retry" },
          { name: "invoice_id", value: invoiceId },
        ],
      })
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment retry initiated. Please check your email for next steps.",
        paymentUrl,
      },
      { status: 200 }
    )
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "retry-payment" } })
    logger.error("Failed to retry payment", {}, error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: "Failed to retry payment" },
      { status: 500 }
    )
  }
}

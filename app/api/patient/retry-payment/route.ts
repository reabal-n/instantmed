import * as Sentry from "@sentry/nextjs"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getApiAuth } from "@/lib/auth/helpers"
import { env } from "@/lib/config/env"
import { toError } from "@/lib/errors"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("api-retry-payment")

const retryPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
})

async function getRetryablePaymentIntakeId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  paymentId: string,
  patientId: string,
) {
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("id, intake_id")
    .eq("id", paymentId)
    .maybeSingle()

  if (paymentError || !payment?.intake_id) {
    return null
  }

  const { data: intake, error: intakeError } = await supabase
    .from("intakes")
    .select("id")
    .eq("id", payment.intake_id)
    .eq("patient_id", patientId)
    .maybeSingle()

  if (intakeError || !intake) {
    return null
  }

  return intake.id
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: sensitive (20 req/hour) - prevents payment retry email spam
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    const authResult = await getApiAuth()

    if (!authResult || authResult.profile.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    let rawBody
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const parsed = retryPaymentSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      )
    }

    const { invoiceId } = parsed.data

    const supabase = createServiceRoleClient()

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("id", invoiceId)
      .eq("customer_id", authResult.profile.id)
      .single()

    if (invoiceError || !invoice) {
      const intakeId = await getRetryablePaymentIntakeId(supabase, invoiceId, authResult.profile.id)
      if (!intakeId) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          success: true,
          message: "Payment retry initiated. Redirecting you to checkout.",
          paymentUrl: `${env.appUrl}/patient/intakes/${intakeId}?retry=true`,
        },
        { status: 200 }
      )
    }

    // Only allow retry for failed invoices. Legacy invoice rows do not have a
    // standalone checkout route; they must resolve back to the owned intake.
    if (invoice.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed invoices can be retried" },
        { status: 400 }
      )
    }

    const intakeId = await getRetryablePaymentIntakeId(supabase, invoiceId, authResult.profile.id)
    if (!intakeId) {
      return NextResponse.json(
        { error: "This payment cannot be retried online. Please open the original request or contact support." },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment retry initiated. Redirecting you to checkout.",
        paymentUrl: `${env.appUrl}/patient/intakes/${intakeId}?retry=true`,
      },
      { status: 200 }
    )
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "retry-payment" } })
    logger.error("Failed to retry payment", {}, toError(error))
    return NextResponse.json(
      { error: "Failed to retry payment" },
      { status: 500 }
    )
  }
}

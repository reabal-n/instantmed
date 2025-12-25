import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * DEV-ONLY: Simulate Stripe checkout.session.completed webhook
 * 
 * This route allows testing the payment completion flow without
 * actually going through Stripe. It simulates what the webhook
 * handler does when a checkout session completes.
 * 
 * SECURITY: Guarded by DEV_ADMIN_SECRET header
 * 
 * Usage:
 * POST /api/dev/stripe/simulate-complete
 * Headers: { "x-dev-admin-secret": "<DEV_ADMIN_SECRET from env>" }
 * Body: { "request_id": "<uuid>" }
 */

// Ensure this only runs in development - NOT preview/production
const IS_DEV = process.env.NODE_ENV === "development"

interface SimulateRequest {
  request_id: string
}

function getServiceRoleClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase credentials for service role")
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID()

  console.log("[DEV Stripe Simulate] Request received:", { requestId })

  // ============================================
  // 1. Environment check
  // ============================================
  if (!IS_DEV) {
    console.error("[DEV Stripe Simulate] Blocked: Not in development mode")
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    )
  }

  // ============================================
  // 2. Secret header validation
  // ============================================
  const devSecret = process.env.DEV_ADMIN_SECRET
  const providedSecret = request.headers.get("x-dev-admin-secret")

  if (!devSecret) {
    console.error("[DEV Stripe Simulate] DEV_ADMIN_SECRET not configured")
    return NextResponse.json(
      { error: "DEV_ADMIN_SECRET not configured in environment" },
      { status: 500 }
    )
  }

  if (!providedSecret || providedSecret !== devSecret) {
    console.warn("[DEV Stripe Simulate] Invalid or missing secret header")
    return NextResponse.json(
      { error: "Invalid or missing x-dev-admin-secret header" },
      { status: 401 }
    )
  }

  // ============================================
  // 3. Parse and validate request body
  // ============================================
  let body: SimulateRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const { request_id } = body

  if (!request_id || !validateUUID(request_id)) {
    return NextResponse.json(
      { error: "Invalid or missing request_id (must be a valid UUID)" },
      { status: 400 }
    )
  }

  console.log("[DEV Stripe Simulate] Processing:", { request_id })

  // ============================================
  // 4. Fetch request and validate state
  // ============================================
  const supabase = getServiceRoleClient()

  const { data: requestData, error: fetchError } = await supabase
    .from("requests")
    .select("id, patient_id, type, status, payment_status, active_checkout_session_id")
    .eq("id", request_id)
    .single()

  if (fetchError || !requestData) {
    console.error("[DEV Stripe Simulate] Request not found:", { request_id, error: fetchError })
    return NextResponse.json(
      { error: `Request not found: ${request_id}` },
      { status: 404 }
    )
  }

  // Validate payment status
  if (requestData.payment_status !== "pending_payment") {
    console.warn("[DEV Stripe Simulate] Invalid payment status:", {
      request_id,
      current_status: requestData.payment_status,
    })
    return NextResponse.json(
      {
        error: `Request is not pending payment`,
        current_status: requestData.payment_status,
        hint: requestData.payment_status === "paid" 
          ? "Request is already paid" 
          : "Request is in an unexpected state",
      },
      { status: 400 }
    )
  }

  // ============================================
  // 5. Simulate webhook side effects
  // ============================================
  // This mirrors what the actual webhook does in app/api/stripe/webhook/route.ts

  const simulatedSessionId = `sim_${Date.now()}_${request_id.slice(0, 8)}`
  const simulatedAmount = 2900 // $29.00 AUD - typical med cert price

  console.log("[DEV Stripe Simulate] Simulating payment completion:", {
    request_id,
    simulated_session_id: simulatedSessionId,
    amount: simulatedAmount,
  })

  // 5a. Create payment record
  const { error: paymentError } = await supabase.from("payments").insert({
    request_id: request_id,
    stripe_session_id: simulatedSessionId,
    amount: simulatedAmount,
    currency: "aud",
    status: "completed",
  })

  if (paymentError) {
    // Check if it's a duplicate (idempotency)
    if (paymentError.code === "23505") {
      console.warn("[DEV Stripe Simulate] Payment already exists (idempotent):", {
        request_id,
        error: paymentError.message,
      })
    } else {
      console.error("[DEV Stripe Simulate] Failed to create payment:", {
        request_id,
        error: paymentError.message,
      })
      return NextResponse.json(
        { error: `Failed to create payment: ${paymentError.message}` },
        { status: 500 }
      )
    }
  }

  // 5b. Update request status
  const { error: updateError } = await supabase
    .from("requests")
    .update({
      payment_status: "paid",
      active_checkout_session_id: null, // Clear the active session
      updated_at: new Date().toISOString(),
    })
    .eq("id", request_id)
    .eq("payment_status", "pending_payment") // Conditional update

  if (updateError) {
    console.error("[DEV Stripe Simulate] Failed to update request:", {
      request_id,
      error: updateError.message,
    })
    return NextResponse.json(
      { error: `Failed to update request: ${updateError.message}` },
      { status: 500 }
    )
  }

  // 5c. Log simulated webhook event
  const { error: eventError } = await supabase.from("stripe_webhook_events").insert({
    event_id: `evt_sim_${Date.now()}`,
    event_type: "checkout.session.completed",
    processed_at: new Date().toISOString(),
    metadata: {
      simulated: true,
      request_id,
      session_id: simulatedSessionId,
      environment: process.env.NODE_ENV,
    },
    request_id: request_id,
    session_id: simulatedSessionId,
  })

  if (eventError) {
    console.warn("[DEV Stripe Simulate] Failed to log event (non-fatal):", {
      error: eventError.message,
    })
  }

  // ============================================
  // 6. Fetch updated request to confirm
  // ============================================
  const { data: updatedRequest } = await supabase
    .from("requests")
    .select("id, status, payment_status, updated_at")
    .eq("id", request_id)
    .single()

  const duration = Date.now() - startTime

  console.log("[DEV Stripe Simulate] Success:", {
    request_id,
    new_payment_status: updatedRequest?.payment_status,
    duration,
  })

  return NextResponse.json({
    success: true,
    message: "Payment completion simulated successfully",
    data: {
      request_id,
      simulated_session_id: simulatedSessionId,
      simulated_amount: simulatedAmount,
      new_payment_status: updatedRequest?.payment_status,
      duration_ms: duration,
    },
    warnings: eventError ? ["Failed to log webhook event"] : undefined,
  })
}

// Only allow POST
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  )
}

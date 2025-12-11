import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe/client"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

// Use service role for webhook (bypasses RLS)
function getServiceClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials for webhook")
  }

  return createClient(supabaseUrl, serviceKey)
}

async function hasEventBeenProcessed(supabase: ReturnType<typeof getServiceClient>, eventId: string): Promise<boolean> {
  const { data } = await supabase.from("stripe_webhook_events").select("id").eq("event_id", eventId).single()

  return !!data
}

async function markEventProcessed(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
  eventType: string,
): Promise<void> {
  await supabase.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    console.error("Missing stripe-signature header")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = getServiceClient()

  const alreadyProcessed = await hasEventBeenProcessed(supabase, event.id)
  if (alreadyProcessed) {
    console.log("Event already processed, skipping:", event.id)
    return NextResponse.json({ received: true, skipped: true })
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session

    console.log("Checkout session completed:", session.id)

    const requestId = session.metadata?.request_id
    const patientId = session.metadata?.patient_id

    if (!requestId) {
      console.error("No request_id in session metadata")
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 })
    }

    try {
      // Update payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid: session.amount_total,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id)

      if (paymentError) {
        console.error("Error updating payment:", paymentError)
      }

      // Update request to paid and submitted status
      const { error: requestError } = await supabase
        .from("requests")
        .update({
          paid: true,
          payment_status: "paid",
          status: "pending", // Now visible to doctors
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)

      if (requestError) {
        console.error("Error updating request:", requestError)
        return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
      }

      // Save Stripe customer ID to profile
      if (session.customer && patientId) {
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id

        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", patientId)
          .single()

        if (profile && !profile.stripe_customer_id) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", patientId)

          if (profileError) {
            console.error("Error saving stripe_customer_id:", profileError)
          }
        }
      }

      await markEventProcessed(supabase, event.id, event.type)

      console.log("Successfully processed payment for request:", requestId)
    } catch (error) {
      console.error("Error processing webhook:", error)
      return NextResponse.json({ error: "Internal error" }, { status: 500 })
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session
    const requestId = session.metadata?.request_id

    console.log("Checkout session expired:", session.id)

    if (requestId) {
      try {
        // Update payment record to expired
        await supabase
          .from("payments")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_session_id", session.id)

        // Request stays as pending_payment - user can retry
        console.log("Marked payment as expired for request:", requestId)

        await markEventProcessed(supabase, event.id, event.type)
      } catch (error) {
        console.error("Error handling expired session:", error)
      }
    }
  }

  return NextResponse.json({ received: true })
}

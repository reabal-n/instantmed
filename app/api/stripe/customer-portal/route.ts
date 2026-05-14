import { NextResponse } from "next/server"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getAppUrl } from "@/lib/config/env"
import { createLogger } from "@/lib/observability/logger"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const logger = createLogger("stripe-customer-portal")

/**
 * Creates a Stripe Customer Portal session for historical repeat-script
 * subscriptions only. Subscription acquisition is dormant; one-off patients
 * should not see or open billing management from this route.
 */
export async function POST() {
  const authUser = await getAuthenticatedUserWithProfile()
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stripeCustomerId = authUser.profile?.stripe_customer_id
  if (!stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 })
  }

  try {
    const { data: legacySubscription, error: subscriptionError } = await createServiceRoleClient()
      .from("subscriptions")
      .select("id")
      .eq("profile_id", authUser.profile.id)
      .eq("status", "active")
      .maybeSingle()

    if (subscriptionError) {
      logger.error(
        "Failed to verify legacy subscription before opening portal",
        { patientId: authUser.profile.id },
        subscriptionError,
      )
      return NextResponse.json({ error: "Unable to verify billing access" }, { status: 500 })
    }

    if (!legacySubscription) {
      return NextResponse.json({ error: "No active legacy subscription found" }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getAppUrl()}/patient`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error("Failed to create customer portal session", {},
      error instanceof Error ? error : undefined)
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}

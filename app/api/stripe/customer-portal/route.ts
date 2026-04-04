import { NextResponse } from "next/server"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { stripe } from "@/lib/stripe/client"
import { getAppUrl } from "@/lib/env"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("stripe-customer-portal")

/**
 * Creates a Stripe Customer Portal session for the authenticated user.
 * Allows patients to manage their subscription (cancel, update payment method).
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

import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("subscriptions")

export interface Subscription {
  id: string
  profile_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: "active" | "past_due" | "cancelled" | "paused"
  current_period_start: string | null
  current_period_end: string | null
  credits_remaining: number
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get the active subscription for a patient.
 * Returns null if none found or on error.
 */
export async function getActiveSubscription(
  profileId: string
): Promise<Subscription | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("profile_id", profileId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    log.error("Failed to fetch active subscription", { profileId }, error)
    return null
  }

  return data as Subscription | null
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new subscription record.
 * Returns the created subscription or null on error.
 */
export async function createSubscription(data: {
  profile_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  current_period_start: string
  current_period_end: string
}): Promise<Subscription | null> {
  const supabase = createServiceRoleClient()

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .insert({
      profile_id: data.profile_id,
      stripe_subscription_id: data.stripe_subscription_id,
      stripe_customer_id: data.stripe_customer_id,
      current_period_start: data.current_period_start,
      current_period_end: data.current_period_end,
      status: "active",
      credits_remaining: 1,
    })
    .select("*")
    .single()

  if (error) {
    log.error("Failed to create subscription", {
      profileId: data.profile_id,
      stripeSubscriptionId: data.stripe_subscription_id,
    }, error)
    return null
  }

  return subscription as Subscription
}

/**
 * Update subscription status and any extra fields.
 * Matches by stripe_subscription_id (the Stripe-side identifier).
 */
export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  }

  const { error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("stripe_subscription_id", stripeSubscriptionId)

  if (error) {
    log.error("Failed to update subscription status", {
      stripeSubscriptionId,
      status,
    }, error)
    return false
  }

  return true
}

/**
 * Decrement credits_remaining by 1 for a subscription.
 * Returns false if already at 0 or on error.
 */
export async function decrementCredit(
  subscriptionId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  // Atomically decrement only if credits > 0
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ credits_remaining: 0, updated_at: new Date().toISOString() })
    .eq("id", subscriptionId)
    .gt("credits_remaining", 0)
    .select("id")

  if (error) {
    log.error("Failed to decrement subscription credit", { subscriptionId }, error)
    return false
  }

  // If no rows matched, credits were already 0
  if (!data || data.length === 0) {
    log.info("No credit to decrement - already at 0", { subscriptionId })
    return false
  }

  return true
}

/**
 * Reset credits_remaining back to 1 for a subscription.
 * Called when invoice.payment_succeeded fires for a renewal.
 */
export async function resetCredits(
  stripeSubscriptionId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("subscriptions")
    .update({ credits_remaining: 1, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", stripeSubscriptionId)

  if (error) {
    log.error("Failed to reset subscription credits", { stripeSubscriptionId }, error)
    return false
  }

  return true
}

import "server-only"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("referral-coupon")

/**
 * Query the patient's unspent referral credit balance and create a one-time
 * Stripe coupon if they have credits. Returns the coupon ID to attach to the
 * checkout session, or null if no credits are available.
 *
 * The coupon is capped at the order's price so we never discount below $0.
 * Credits are marked as `applied_at` later in the webhook handler once
 * payment actually succeeds — this function only creates the coupon.
 */
export async function createReferralCouponIfEligible(
  patientId: string,
  priceCents: number
): Promise<{ couponId: string; discountCents: number } | null> {
  const supabase = createServiceRoleClient()

  // Fetch unspent credits
  const { data: credits, error } = await supabase
    .from("referral_credits")
    .select("id, credit_cents")
    .eq("profile_id", patientId)
    .is("applied_at", null)
    .order("created_at", { ascending: true })

  if (error || !credits || credits.length === 0) {
    return null
  }

  const totalCreditCents = credits.reduce((sum, c) => sum + c.credit_cents, 0)
  if (totalCreditCents <= 0) return null

  // Cap discount at order price — never discount below $0
  const discountCents = Math.min(totalCreditCents, priceCents)

  try {
    const coupon = await stripe.coupons.create({
      amount_off: discountCents,
      currency: "aud",
      duration: "once",
      max_redemptions: 1,
      name: `Referral credit – $${(discountCents / 100).toFixed(2)} off`,
      metadata: {
        patient_id: patientId,
        credit_ids: credits.map((c) => c.id).join(","),
        source: "referral_credit_redemption",
      },
    })

    log.info("Created referral coupon", {
      couponId: coupon.id,
      discountCents,
      totalCreditCents,
      patientId,
    })

    return { couponId: coupon.id, discountCents }
  } catch (err) {
    log.warn("Failed to create referral coupon — proceeding without discount", {
      patientId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

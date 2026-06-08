import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAppUrl } from "@/lib/config/env"
import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import { createLogger } from "@/lib/observability/logger"
import { getOptionalStripePriceEnv, getPriceIdForRequest, stripe } from "@/lib/stripe/client"
import { canRetryPaymentForIntake } from "@/lib/stripe/payment-integrity"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { ServiceCategory } from "@/types/services"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const logger = createLogger("checkout-resume")

const SERVICE_START_URLS: Record<string, string> = {
  medical_certificate: "/medical-certificate",
  prescription: "/prescriptions",
  consult: "/request",
}

type ResumeIntake = {
  id: string
  status: string | null
  payment_status: string | null
  payment_id: string | null
  category: string | null
  subtype: string | null
  stripe_price_id: string | null
  is_priority: boolean | null
  guest_email: string | null
}

async function rebuildGuestCheckoutSession(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intake: ResumeIntake,
  baseUrl: string,
): Promise<string | null> {
  if (intake.payment_id) {
    try {
      await stripe.checkout.sessions.expire(intake.payment_id)
    } catch {
      // Already expired or completed
    }
  }

  const priceId =
    intake.stripe_price_id ||
    getPriceIdForRequest({
      category: (intake.category || "medical_certificate") as ServiceCategory,
      subtype: intake.subtype || "",
      answers: {},
    })
  if (!priceId) return null

  const isPriority = intake.is_priority === true
  const priorityPriceId = isPriority ? getOptionalStripePriceEnv("STRIPE_PRICE_PRIORITY_FEE") : null
  const lineItems: Array<{ price: string; quantity: number }> = [{ price: priceId, quantity: 1 }]
  if (isPriority && priorityPriceId) lineItems.push({ price: priorityPriceId, quantity: 1 })

  try {
    const session = await stripe.checkout.sessions.create(
      {
        line_items: lineItems,
        mode: "payment",
        success_url: `${baseUrl}/auth/complete-account?intake_id=${intake.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/patient/intakes/cancelled?intake_id=${intake.id}`,
        customer_email: intake.guest_email ?? undefined,
        customer_creation: intake.guest_email ? "always" : undefined,
        metadata: {
          intake_id: intake.id,
          is_retry: "true",
          category: intake.category || "",
          subtype: intake.subtype || "",
          guest_checkout: "true",
        },
      },
      { idempotencyKey: `resume_${intake.id}_${intake.payment_id || "initial"}` },
    )

    if (!session.url) return null

    const { error: updateError } = await supabase
      .from("intakes")
      .update({
        payment_id: session.id,
        payment_status: "pending",
        status: "pending_payment",
        checkout_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", intake.id)
      .in("status", ["pending_payment", "checkout_failed"])
      .in("payment_status", ["pending", "unpaid", "failed"])

    if (updateError) {
      logger.error("Failed to update intake after resume session rebuild", { intakeId: intake.id }, updateError)
      return null
    }

    return session.url
  } catch (error) {
    logger.error("Failed to rebuild checkout session on resume", {
      intakeId: intake.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export default async function CheckoutResumePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const tokenResult = verifyCheckoutResumeToken(token)
  if (!tokenResult) {
    redirect("/request?error=expired_link")
  }

  const { intakeId } = tokenResult
  const supabase = createServiceRoleClient()
  const baseUrl = getAppUrl()

  const { data: intake } = await supabase
    .from("intakes")
    .select("id, status, payment_status, payment_id, category, subtype, stripe_price_id, is_priority, guest_email")
    .eq("id", intakeId)
    .maybeSingle()

  if (!intake) {
    redirect("/request?error=not_found")
  }

  // Already paid — send to account setup
  if (intake.payment_status === "paid") {
    redirect(`/auth/complete-account?intake_id=${encodeURIComponent(intake.id)}`)
  }

  // Retryable — try existing session first, then rebuild
  if (canRetryPaymentForIntake(intake.status, intake.payment_status)) {
    if (intake.payment_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(intake.payment_id)
        if (session.url) redirect(session.url)
      } catch {
        // Session expired or not found — fall through to rebuild
      }
    }

    const newUrl = await rebuildGuestCheckoutSession(supabase, intake, baseUrl)
    if (newUrl) redirect(newUrl)
  }

  // Fallback: send back to the service start page
  const serviceUrl = SERVICE_START_URLS[intake.category || ""] ?? "/request"
  redirect(serviceUrl)
}

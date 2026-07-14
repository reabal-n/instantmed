import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAppUrl } from "@/lib/config/env"
import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import { createLogger } from "@/lib/observability/logger"
import { recordSafetyEvaluationForOperators } from "@/lib/safety/audit-log"
import {
  cancelHighStakesUnpaidIntake,
  inspectCheckoutSession,
  invalidateCheckoutSessionForSafety,
} from "@/lib/stripe/checkout/checkout-session-safety"
import {
  getHighStakesCheckoutBlock,
  isMedicalCertificateIntake,
} from "@/lib/stripe/checkout/high-stakes-validation"
import { buildGuestCheckoutCancelUrl } from "@/lib/stripe/checkout-recovery-link"
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
  answers: Array<{ answers: Record<string, unknown> }> | null
  id: string
  status: string | null
  payment_status: string | null
  service: { slug?: string | null; type?: string | null } | null
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
        cancel_url: buildGuestCheckoutCancelUrl({ baseUrl, intakeId: intake.id }),
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

    if (!session.url) {
      await invalidateCheckoutSessionForSafety(session.id, intake.id)
      return null
    }

    let attachQuery = supabase
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

    attachQuery = intake.payment_id
      ? attachQuery.eq("payment_id", intake.payment_id)
      : attachQuery.is("payment_id", null)

    const { data: attachedRows, error: updateError } = await attachQuery.select("id")

    if (updateError) {
      logger.error("Failed to update intake after resume session rebuild", { intakeId: intake.id }, updateError)
      await invalidateCheckoutSessionForSafety(session.id, intake.id)
      return null
    }

    if (!attachedRows || attachedRows.length === 0) {
      const { data: currentIntake, error: refetchError } = await supabase
        .from("intakes")
        .select("id, status, payment_status, payment_id")
        .eq("id", intake.id)
        .maybeSingle()

      if (
        !refetchError &&
        currentIntake?.payment_id === session.id &&
        canRetryPaymentForIntake(currentIntake.status, currentIntake.payment_status)
      ) {
        logger.info("Parallel resume already attached the same idempotent session", {
          intakeId: intake.id,
          sessionId: session.id,
        })
        return session.url
      }

      logger.warn("Resume session attach matched no retryable intake; expiring orphan", {
        intakeId: intake.id,
        sessionId: session.id,
      })
      await invalidateCheckoutSessionForSafety(session.id, intake.id)
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
    .select("id, status, payment_status, payment_id, category, subtype, stripe_price_id, is_priority, guest_email, service:services!service_id(slug, type), answers:intake_answers(answers)")
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
    const resumeIntake = intake as ResumeIntake
    const answers = resumeIntake.answers?.[0]?.answers || {}
    const highStakesBlock = isMedicalCertificateIntake(
      resumeIntake.category,
      resumeIntake.service,
    )
      ? getHighStakesCheckoutBlock(answers)
      : null

    if (highStakesBlock) {
      const serviceSlug = resumeIntake.service?.slug || "med-cert-sick"
      await recordSafetyEvaluationForOperators({
        answers,
        context: "retry_payment",
        requestId: resumeIntake.id,
        result: highStakesBlock.safetyCheck,
        serviceSlug,
      })
      await cancelHighStakesUnpaidIntake({
        initialState: {
          payment_id: resumeIntake.payment_id,
          payment_status: resumeIntake.payment_status,
          status: resumeIntake.status,
        },
        intakeId: resumeIntake.id,
        source: "guest_resume",
        supabase,
      })
      const serviceUrl = SERVICE_START_URLS[resumeIntake.category || ""] ?? "/request"
      redirect(serviceUrl)
    }

    let canRebuild = !intake.payment_id
    if (intake.payment_id) {
      const inspection = await inspectCheckoutSession(intake.payment_id, intake.id)

      if (inspection.state === "open" && inspection.session?.url) {
        redirect(inspection.session.url)
      }
      if (inspection.state === "payment_in_flight") {
        redirect(
          `/auth/complete-account?intake_id=${encodeURIComponent(intake.id)}&session_id=${encodeURIComponent(intake.payment_id)}`,
        )
      }

      canRebuild = inspection.state === "expired"
    }

    if (canRebuild) {
      const newUrl = await rebuildGuestCheckoutSession(supabase, intake as ResumeIntake, baseUrl)
      if (newUrl) redirect(newUrl)
    }
  }

  // Fallback: send back to the service start page
  const serviceUrl = SERVICE_START_URLS[intake.category || ""] ?? "/request"
  redirect(serviceUrl)
}

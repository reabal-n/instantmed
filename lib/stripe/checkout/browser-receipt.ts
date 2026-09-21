import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { signCheckoutResumeToken, verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import type { ConvertedDraftCheckoutResult } from "@/lib/request/server-draft-conversion"

const COOKIE = "instantmed_checkout_receipt"

/** A server-issued capability, never a claimed email or client flow ID alone. */
export async function findBrowserCheckoutReceipt(db: SupabaseClient, input: {
  flowInstanceId?: string; email?: string; category: string; subtype: string
}): Promise<ConvertedDraftCheckoutResult> {
  const none = { kind: "none", reason: "not_found" } as const
  if (!input.flowInstanceId || !input.email) return none
  const token = (await cookies()).get(COOKIE)?.value
  const verified = token ? verifyCheckoutResumeToken(token) : null
  if (!verified) return none
  const { data: intake, error } = await db.from("intakes")
    .select("id, patient_id, flow_instance_id, guest_email, category, subtype, status, payment_status, payment_id, checkout_error, growth_experience_version")
    .eq("id", verified.intakeId)
    .eq("flow_instance_id", input.flowInstanceId)
    .maybeSingle()
  if (error) return { kind: "blocked", reason: "query_error" }
  // A different flow is a new request, not permission to reuse the last one.
  if (!intake) return none
  if (intake.flow_instance_id !== input.flowInstanceId ||
    !intake.guest_email || intake.guest_email.trim().toLowerCase() !== input.email.trim().toLowerCase()) {
    return { kind: "blocked", reason: "identity_mismatch" }
  }
  return {
    kind: intake.category === input.category && intake.subtype === input.subtype ? "reusable" : "service_changed",
    intake: {
      id: intake.id, patientId: intake.patient_id, guestEmail: intake.guest_email,
      category: intake.category, subtype: intake.subtype, status: intake.status,
      paymentStatus: intake.payment_status, paymentId: intake.payment_id,
      checkoutError: intake.checkout_error, growthExperienceVersion: intake.growth_experience_version,
    },
  }
}

export async function rememberBrowserCheckout(intakeId: string): Promise<void> {
  try {
    // One bounded cookie, with the same lifetime as the existing resume link.
    // A cookie failure must not turn a successful checkout into a failed one.
    ;(await cookies()).set(COOKIE, signCheckoutResumeToken(intakeId), {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60,
    })
  } catch {
    // Verified email recovery remains available if browser receipt storage fails.
  }
}

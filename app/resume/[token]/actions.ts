"use server"

import { redirect } from "next/navigation"

import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import { verifyRecoveryEmailEngagementToken } from "@/lib/crypto/recovery-email-engagement-token"
import { resolveGuestCheckoutResume } from "@/lib/stripe/checkout/guest-resume"

export async function continueGuestCheckoutResume(
  token: string,
  recoveryProof: string | null,
): Promise<never> {
  const tokenResult = verifyCheckoutResumeToken(token)

  if (!tokenResult) {
    redirect("/request?error=expired_link")
  }

  const recoveryResult = recoveryProof
    ? verifyRecoveryEmailEngagementToken(recoveryProof)
    : null
  const destination = await resolveGuestCheckoutResume(
    tokenResult.intakeId,
    recoveryResult?.intakeId === tokenResult.intakeId,
  )

  redirect(destination)
}

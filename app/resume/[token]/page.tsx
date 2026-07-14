import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { verifyCheckoutResumeToken } from "@/lib/crypto/checkout-resume-token"
import { resolveGuestCheckoutResume } from "@/lib/stripe/checkout/guest-resume"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
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

  redirect(await resolveGuestCheckoutResume(tokenResult.intakeId))
}

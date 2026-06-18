import type { Metadata } from "next"

import { PaymentCancelledContent } from "@/components/checkout/payment-cancelled-content"
import { CHECKOUT_RESUME_TOKEN_PARAM } from "@/lib/stripe/checkout-recovery-link"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function PublicPaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ intake_id?: string; resume_token?: string }>
}) {
  const params = await searchParams

  return (
    <PaymentCancelledContent
      intakeId={params.intake_id}
      resumeToken={params[CHECKOUT_RESUME_TOKEN_PARAM]}
    />
  )
}

import { PaymentCancelledContent } from "@/components/checkout/payment-cancelled-content"
import { CHECKOUT_RESUME_TOKEN_PARAM } from "@/lib/stripe/checkout-recovery-link"

export const dynamic = "force-dynamic"

export default async function PaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ intake_id?: string; reason?: string; resume_token?: string }>
}) {
  const params = await searchParams

  return (
    <PaymentCancelledContent
      intakeId={params.intake_id}
      reason={params.reason}
      resumeToken={params[CHECKOUT_RESUME_TOKEN_PARAM]}
    />
  )
}

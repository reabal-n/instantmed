import { SuccessCelebration } from "@/components/ui/success-celebration"

export const dynamic = "force-dynamic"

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ intake_id?: string; session_id?: string }>
}) {
  const params = await searchParams
  const intakeId = params.intake_id

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4">
        <SuccessCelebration type="request" requestId={intakeId} showConfetti />
      </div>
    </div>
  )
}

import { SuccessCelebration } from "@/components/ui/success-celebration"

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string; session_id?: string }>
}) {
  const params = await searchParams
  const requestId = params.request_id

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4">
        <SuccessCelebration type="request" requestId={requestId} showConfetti />
      </div>
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import { SuccessClient } from "./success-client"

export const dynamic = "force-dynamic"

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ intake_id?: string; session_id?: string }>
}) {
  const params = await searchParams
  const intakeId = params.intake_id

  // Fetch initial status server-side
  let initialStatus: string | undefined
  if (intakeId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("intakes")
      .select("status")
      .eq("id", intakeId)
      .single()
    initialStatus = data?.status
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-lg mx-auto px-4">
        <SuccessClient intakeId={intakeId} initialStatus={initialStatus} />
      </div>
    </div>
  )
}

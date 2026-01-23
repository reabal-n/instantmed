import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { SuccessClient } from "./success-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Request Submitted | InstantMed",
  description: "Your request has been submitted and is being reviewed by our medical team.",
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ intake_id?: string; session_id?: string }>
}) {
  const params = await searchParams
  const intakeId = params.intake_id

  // Fetch initial status and intake details server-side
  let initialStatus: string | undefined
  let serviceName: string | undefined
  let isPriority = false
  let patientEmail: string | undefined

  if (intakeId) {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from("intakes")
      .select(`
        status,
        priority,
        category
      `)
      .eq("id", intakeId)
      .single()
    
    initialStatus = data?.status
    isPriority = data?.priority || false
    serviceName = data?.category || undefined
  }

  // Get patient email if authenticated
  const authUser = await getAuthenticatedUserWithProfile()
  if (authUser?.profile?.email) {
    patientEmail = authUser.profile.email
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-lg mx-auto px-4">
        <SuccessClient 
          intakeId={intakeId} 
          initialStatus={initialStatus}
          serviceName={serviceName}
          isPriority={isPriority}
          patientEmail={patientEmail}
        />
      </div>
    </div>
  )
}

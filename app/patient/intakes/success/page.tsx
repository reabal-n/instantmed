import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
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

  // Get authenticated user for ownership verification
  const authUser = await getAuthenticatedUserWithProfile()

  if (intakeId) {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from("intakes")
      .select(`
        status,
        is_priority,
        patient_id,
        service:services(name, short_name)
      `)
      .eq("id", intakeId)
      .single()

    // Verify the authenticated user owns this intake
    if (data?.patient_id && authUser?.profile?.id) {
      if (data.patient_id !== authUser.profile.id) {
        notFound()
      }
    } else if (data?.patient_id && !authUser) {
      // Intake exists but user is not authenticated - redirect to sign in
      redirect(`/sign-in?redirect_url=/patient/intakes/success?intake_id=${intakeId}`)
    }

    initialStatus = data?.status
    isPriority = data?.is_priority || false
    const serviceData = data?.service as { name?: string; short_name?: string } | null
    serviceName = serviceData?.short_name || serviceData?.name || undefined
  }

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

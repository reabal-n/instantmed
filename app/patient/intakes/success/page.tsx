import { redirect } from "next/navigation"
import { notFound } from "next/navigation"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { SuccessClient } from "./success-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Request Submitted",
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
  let amountCents: number | undefined
  let isPriority = false
  let patientEmail: string | undefined
  let queuePosition: number | null = null
  let isNewCustomer: boolean | undefined

  // Get authenticated user for ownership verification
  const authUser = await getAuthenticatedUserWithProfile()

  if (intakeId) {
    const supabase = createServiceRoleClient()
    const [{ data: queueData }, { data }] = await Promise.all([
      supabase.rpc("get_queue_position", { p_intake_id: intakeId }),
      supabase
        .from("intakes")
        .select(`
          status,
          is_priority,
          patient_id,
          amount_cents,
          service:services(name, short_name)
        `)
        .eq("id", intakeId)
        .single(),
    ])

    if (queueData !== null && queueData !== undefined) {
      queuePosition = Number(queueData)
    }

    // Verify the authenticated user owns this intake
    if (data?.patient_id && authUser?.profile?.id) {
      if (data.patient_id !== authUser.profile.id) {
        notFound()
      }
    } else if (data?.patient_id && !authUser) {
      // Intake exists but user is not authenticated - redirect to sign in
      redirect(`/sign-in?redirect_url=${encodeURIComponent(`/patient/intakes/success?intake_id=${intakeId}`)}`)
    }

    initialStatus = data?.status
    isPriority = data?.is_priority || false
    amountCents = data?.amount_cents ?? undefined
    const serviceData = data?.service as { name?: string; short_name?: string } | null
    serviceName = serviceData?.short_name || serviceData?.name || undefined

    // Determine new_customer for Google Ads conversion optimization.
    // Count previous paid intakes for this patient (excluding current one).
    if (data?.patient_id) {
      const { count } = await supabase
        .from("intakes")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", data.patient_id)
        .not("status", "in", "(pending_payment,declined)")
        .neq("id", intakeId)
      isNewCustomer = (count ?? 0) === 0
    }
  }

  if (authUser?.profile?.email) {
    patientEmail = authUser.profile.email
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-lg mx-auto">
        <SuccessClient
          intakeId={intakeId}
          initialStatus={initialStatus}
          serviceName={serviceName}
          amountCents={amountCents}
          isPriority={isPriority}
          patientEmail={patientEmail}
          patientId={authUser?.profile?.id}
          queuePosition={queuePosition}
          isNewCustomer={isNewCustomer}
        />
      </div>
    </div>
  )
}

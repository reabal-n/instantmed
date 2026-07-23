import { redirect } from "next/navigation"
import { notFound } from "next/navigation"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { getWaitState } from "@/lib/brand/wait-counter"
import { signHeardAboutUsToken } from "@/lib/crypto/heard-about-us-token"
import { buildPatientIntakeSuccessHref } from "@/lib/dashboard/routes"
import { logAuditEvent } from "@/lib/security/audit-log"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { SuccessClient } from "./success-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Request Submitted",
  description: "Your request has been submitted and is being reviewed by our medical team.",
}

async function logPaymentRetryReturn({
  intakeId,
  patientId,
  amountCents,
  stripeSessionId,
}: {
  intakeId: string
  patientId: string
  amountCents?: number
  stripeSessionId?: string
}) {
  try {
    await logAuditEvent({
      action: "payment_completed",
      actorId: patientId,
      actorType: "patient",
      intakeId,
      metadata: {
        action_type: "payment_retry_return",
        source: "retry_landing",
        amount_cents: amountCents ?? null,
        stripe_session_id: stripeSessionId ?? null,
      },
    })
  } catch {
    // Audit logging owns its own critical alert path. Do not break the patient landing page.
  }
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ intake_id?: string; session_id?: string; payment_retry?: string }>
}) {
  const params = await searchParams
  const intakeId = params.intake_id
  const paymentRetry = params.payment_retry === "1"

  // Fetch initial status and intake details server-side
  let initialStatus: string | undefined
  let serviceName: string | undefined
  let serviceCategory: string | undefined
  let paidFlowInstanceId: string | undefined
  let initialPaymentStatus: string | undefined
  let amountCents: number | undefined
  let isPriority = false
  let patientEmail: string | undefined
  let queuePosition: number | null = null
  let isNewCustomer: boolean | undefined
  let intakeSubtype: string | undefined

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
          subtype,
          category,
          flow_instance_id,
          payment_status,
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
      const redirectUrl = buildPatientIntakeSuccessHref({ intakeId, paymentRetry })
      redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`)
    }

    initialStatus = data?.status
    isPriority = data?.is_priority || false
    amountCents = data?.amount_cents ?? undefined
    const serviceData = data?.service as { name?: string; short_name?: string } | null
    serviceName = serviceData?.short_name || serviceData?.name || undefined
    serviceCategory = data?.category ?? undefined
    paidFlowInstanceId = data?.flow_instance_id ?? undefined
    initialPaymentStatus = data?.payment_status ?? undefined
    intakeSubtype = data?.subtype ?? undefined

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

    if (paymentRetry && authUser?.profile?.id) {
      await logPaymentRetryReturn({
        intakeId,
        patientId: authUser.profile.id,
        amountCents,
        stripeSessionId: params.session_id,
      })
    }
  }

  if (authUser?.profile?.email) {
    patientEmail = authUser.profile.email
  }

  // Live wait-counter state for the post-submit specificity screen
  // (docs/BRAND.md §6.5). Powers the "Average wait today: ~X min" line.
  const waitState = await getWaitState()

  // Signed token for the optional "how did you hear about us?" survey. Lets the
  // post-payment card write self-reported attribution without an auth round-trip.
  let heardToken: string | undefined
  if (intakeId) {
    try {
      heardToken = signHeardAboutUsToken(intakeId)
    } catch {
      heardToken = undefined
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12">
      <div className="w-full max-w-lg mx-auto">
        <SuccessClient
          intakeId={intakeId}
          initialStatus={initialStatus}
          serviceName={serviceName}
          serviceCategory={serviceCategory}
          paidFlowInstanceId={paidFlowInstanceId}
          initialPaymentStatus={initialPaymentStatus}
          amountCents={amountCents}
          isPriority={isPriority}
          patientEmail={patientEmail}
          patientId={authUser?.profile?.id}
          queuePosition={queuePosition}
          isNewCustomer={isNewCustomer}
          waitState={waitState}
          paymentRetry={paymentRetry}
          heardToken={heardToken}
          intakeSubtype={intakeSubtype}
        />
      </div>
    </div>
  )
}

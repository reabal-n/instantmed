import { Suspense } from "react"

import { Footer } from "@/components/shared/footer"
import { Navbar } from "@/components/shared/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { signHeardAboutUsToken } from "@/lib/crypto/heard-about-us-token"
import { inspectCheckoutSession } from "@/lib/stripe/checkout/checkout-session-safety"
import {
  type CompleteAccountPaymentState,
  resolveCompleteAccountAmountCents,
  resolveCompleteAccountPaymentState,
} from "@/lib/stripe/payment-integrity"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { CompleteAccountForm } from "./complete-account-form"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Complete Your Account",
  description: "Create your account to access your medical certificate",
}

export default async function CompleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string; intake_id?: string; email?: string; session_id?: string; access?: string }>
}) {
  const params = await searchParams
  // Support both intake_id (guest checkout) and request_id (legacy)
  const intakeId = params.intake_id || params.request_id

  // Fetch email + amount + service so the form can fire trackPurchase on mount.
  // Guest checkouts land here (not /patient/intakes/success), so without firing
  // the gtag conversion here we lose browser-side attribution for ~all guests.
  //
  // The URL session_id must exactly match the intake's stored payment_id before
  // this public route can inspect or expose any order data. Payment is confirmed
  // only by the persisted paid state or an owned Stripe Session whose
  // payment_status is paid. A complete/unpaid Session remains processing, and
  // no conversion or draft-retirement data is exposed until confirmation.
  const sessionId = params.session_id
  let email = params.email
  let amountCents: number | undefined
  let serviceSlug: string | undefined
  let serviceName: string | undefined
  // Set ONLY when payment is server-confirmed below — the client uses it as
  // the signal to retire the local draft for that service.
  let paidServiceCategory: string | undefined
  let paymentState: CompleteAccountPaymentState = "unconfirmed"
  let isNewCustomer = true
  if (intakeId) {
    try {
      const supabase = createServiceRoleClient()
      const { data: intake } = await supabase
        .from("intakes")
        .select(
          "amount_cents, patient_id, payment_id, payment_status, status, category, patient:profiles!patient_id(email), service:services!service_id(slug, name)",
        )
        .eq("id", intakeId)
        .single()

      const sessionMatches =
        !!sessionId && !!intake?.payment_id && intake.payment_id === sessionId
      const inspection =
        sessionMatches && intake?.payment_status !== "paid" && sessionId && intake?.payment_id
          ? await inspectCheckoutSession(sessionId, intakeId, {
              intakeStatus: intake.status,
              paymentStatus: intake.payment_status,
              storedPaymentId: intake.payment_id,
            })
          : null
      paymentState = resolveCompleteAccountPaymentState({
        intakePaymentStatus: intake?.payment_status,
        sessionMatches,
        sessionState: inspection?.state ?? null,
      })

      if (intake && paymentState === "paid") {
        const patient = intake.patient as { email?: string } | null
        const service = intake.service as { slug?: string; name?: string } | null
        if (!email) email = patient?.email || undefined
        amountCents = resolveCompleteAccountAmountCents({
          intakeAmountCents: intake.amount_cents as number | null | undefined,
          sessionAmountTotal: inspection?.session?.amount_total,
          sessionState: inspection?.state ?? null,
        })
        serviceSlug = service?.slug
        serviceName = service?.name
        paidServiceCategory = (intake.category as string | undefined) ?? undefined

        if (intake.patient_id) {
          const { count } = await supabase
            .from("intakes")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", intake.patient_id)
            .not("paid_at", "is", null)
            .neq("id", intakeId)

          isNewCustomer = (count ?? 0) === 0
        }
      }
    } catch {
      // Silently fail - tracking is best-effort
    }
  }

  // Signed token for the optional "how did you hear about us?" survey. Guest
  // checkouts land here (not the success page) and are the Direct/Unknown cohort
  // we most need to attribute, so the survey must render on this surface too.
  let heardToken: string | undefined
  if (intakeId) {
    try {
      heardToken = signHeardAboutUsToken(intakeId)
    } catch {
      heardToken = undefined
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-b from-background to-muted/30 pt-32 pb-20">
        <div className="max-w-md mx-auto px-4">
          <Suspense fallback={
            <div className="space-y-6 animate-pulse" aria-busy="true" aria-live="polite">
              <span className="sr-only" role="status">Loading form</span>
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          }>
            <CompleteAccountForm
              intakeId={intakeId}
              email={email}
              amountCents={amountCents}
              serviceSlug={serviceSlug}
              serviceName={serviceName}
              paidServiceCategory={paidServiceCategory}
              paymentState={paymentState}
              isNewCustomer={isNewCustomer}
              heardToken={heardToken}
              certificateAccess={params.access === "certificate"}
            />
          </Suspense>
        </div>
      </main>
      <Footer variant="minimal" />
    </>
  )
}

import { redirect } from "next/navigation"
import { Suspense } from "react"

import { Footer } from "@/components/shared/footer"
import { Navbar } from "@/components/shared/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { signHeardAboutUsToken } from "@/lib/crypto/heard-about-us-token"
import { inspectCheckoutSession } from "@/lib/stripe/checkout/checkout-session-safety"
import {
  type CompleteAccountPaymentState,
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
  searchParams: Promise<{ request_id?: string; intake_id?: string; session_id?: string; access?: string }>
}) {
  const params = await searchParams
  // Support both intake_id (guest checkout) and request_id (legacy)
  const intakeId = params.intake_id || params.request_id

  // Raw-id certificate/request access was a legacy public capability. New
  // lifecycle emails exchange a signed token on /track before any patient
  // projection is rendered. Fail old or hand-crafted access modes closed
  // without querying the supplied intake id, and remove that id from the URL.
  if (params.access) {
    redirect("/track/invalid")
  }

  // The URL session_id must exactly match the intake's stored payment_id before
  // this public route can inspect or expose any order data. Payment is confirmed
  // only by the persisted paid state or an owned Stripe Session whose
  // payment_status is paid. A complete/unpaid Session remains processing, and
  // no conversion or draft-retirement data is exposed until confirmation.
  const sessionId = params.session_id
  let email: string | undefined
  // Set ONLY when payment is server-confirmed below — the client uses it as
  // the signal to retire the local draft for that service.
  let paidServiceCategory: string | undefined
  let paymentState: CompleteAccountPaymentState = "unconfirmed"
  if (intakeId) {
    try {
      const supabase = createServiceRoleClient()
      const { data: intake } = await supabase
        .from("intakes")
        .select(
          "payment_id, payment_status, status, category, patient:profiles!patient_id(email)",
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
        email = patient?.email || undefined
        paidServiceCategory = (intake.category as string | undefined) ?? undefined
      }
    } catch {
      // Fail closed: without verified ownership and payment state, the public
      // surface must render the unconfirmed recovery state.
    }
  }

  // Signed token for the optional "how did you hear about us?" survey. Guest
  // checkouts land here (not the success page) and are the Direct/Unknown cohort
  // we most need to attribute, so the survey must render on this surface too.
  let heardToken: string | undefined
  if (intakeId && paymentState === "paid") {
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
              paidServiceCategory={paidServiceCategory}
              paymentState={paymentState}
              heardToken={heardToken}
            />
          </Suspense>
        </div>
      </main>
      <Footer variant="minimal" />
    </>
  )
}

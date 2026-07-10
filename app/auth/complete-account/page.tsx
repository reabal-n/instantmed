import { Suspense } from "react"

import { Footer } from "@/components/shared/footer"
import { Navbar } from "@/components/shared/navbar"
import { Skeleton } from "@/components/ui/skeleton"
import { signHeardAboutUsToken } from "@/lib/crypto/heard-about-us-token"
import { stripe } from "@/lib/stripe/client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { CompleteAccountForm } from "./complete-account-form"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Complete Your Account",
  description: "Create your account to access your medical certificate",
}

// Confirm a Checkout Session is paid directly from Stripe, bypassing the webhook
// lag on intakes.payment_status. Fail-soft: any error (or missing id) → not
// confirmed, so a Stripe hiccup never breaks the account-completion page.
async function isStripeSessionPaid(sessionId: string | undefined): Promise<boolean> {
  if (!sessionId) return false
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session.payment_status === "paid" || session.status === "complete"
  } catch {
    return false
  }
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
  // We do NOT hard-filter on payment_status = "paid": the Stripe webhook that
  // flips that column lags the redirect to this page (a race that previously hid
  // amount/service and skipped the conversion fire — Codex review 2026-06-27).
  // Instead we (1) require the URL session_id to match the intake's stored
  // payment_id — a high-entropy proof the visitor is the paying customer, and
  // strictly stronger than the old paid-only filter for not exposing order data
  // to a bare intake_id — then (2) confirm payment from the column OR, when it
  // still lags, directly from Stripe.
  const sessionId = params.session_id
  let email = params.email
  let amountCents: number | undefined
  let serviceSlug: string | undefined
  let serviceName: string | undefined
  // Set ONLY when payment is server-confirmed below — the client uses it as
  // the signal to retire the local draft for that service.
  let paidServiceCategory: string | undefined
  let isNewCustomer = true
  if (intakeId) {
    try {
      const supabase = createServiceRoleClient()
      const { data: intake } = await supabase
        .from("intakes")
        .select(
          "amount_cents, patient_id, payment_id, payment_status, category, patient:profiles!patient_id(email), service:services!service_id(slug, name)",
        )
        .eq("id", intakeId)
        .single()

      const sessionMatches =
        !!sessionId && !!intake?.payment_id && intake.payment_id === sessionId
      const paid =
        sessionMatches &&
        (intake?.payment_status === "paid" || (await isStripeSessionPaid(sessionId)))

      if (intake && paid) {
        const patient = intake.patient as { email?: string } | null
        const service = intake.service as { slug?: string; name?: string } | null
        if (!email) email = patient?.email || undefined
        amountCents = (intake.amount_cents as number | undefined) ?? undefined
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
